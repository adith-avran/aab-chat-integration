import {
  Box,
  ButtonDropdown,
  Container,
  Modal,
  PromptInput,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { v4 as uuid, v5 as uuidv5 } from "uuid";
import Markdown from "react-markdown";
import { DotLoader } from "./assets/DotLoader";
import { ChatBubble, Avatar } from "@cloudscape-design/chat-components";
import "./Chat.css";
import { useRef } from "react";
import { EventSourcePolyfill } from "event-source-polyfill";
import { CONVERSATION_CONSTANTS } from "./constants";
import { InputProps } from "@cloudscape-design/components";
import { NonCancelableCustomEvent } from "@cloudscape-design/components/interfaces";
import langTextData from "./assets/textLang.json";
// import ABBLogo from "./assets/ABB_Logo.svg"
// import ABBLogo from "./assets/ABB_Logo.png";
import ABBLogo from "./assets/ABB_Logo.png";
import GradientButton from "./assets/GradientButton";

import ChatDisclaimer from "./ChatDisclaimer";
import FillButton from "./assets/FillButton";

export type LLMessage = {
  id: string;
  timestamp: number;
  author: "user" | "assistant" | "System" | "agent";
  content: string | string[];
  loading?: boolean;
  sentMessage?: boolean;
  name?: string;
  sending?: boolean;
};

const NAMESPACE_DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

function timestampToDateString(timestamp: number) {
  const d = new Date(timestamp);
  const pad = (n: any) => String(n).padStart(2, "0");
  return `${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())} ${
    d.getHours() >= 12 ? "PM" : "AM"
  }`;
}

function parseEventData(data: string) {
  const jsonData = JSON.parse(data);
  const entryPayload = JSON.parse(jsonData.conversationEntry.entryPayload);
  // console.log(jsonData, entryPayload);
  const firstEntry = entryPayload.entries?.[0] ?? {};

  return {
    conversationId: jsonData.conversationId,
    messageId: jsonData.conversationEntry.identifier,
    content: entryPayload.abstractMessage || entryPayload,

    messageType:
      entryPayload.abstractMessage?.messageType ||
      entryPayload.routingType ||
      firstEntry.operation,

    entryType: entryPayload.entryType,

    sender: jsonData.conversationEntry.sender,

    actorName:
      jsonData.conversationEntry.senderDisplayName ||
      firstEntry.displayName ||
      firstEntry.participant?.role ||
      jsonData.conversationEntry.sender.role,

    actorType: jsonData.conversationEntry.sender.role,

    transcriptedTimestamp: jsonData.conversationEntry.transcriptedTimestamp,

    messageReason: entryPayload.messageReason,
  };
}

function Chat() {
  const queryParams = new URLSearchParams(window.location.search);
  const language_CODE =
    queryParams.get("lang") ?? queryParams.get("language") ?? "en_US";
  const country_CODE = queryParams.get("country");
  const [promptVal, setPromptVal] = useState<string>("");
  const scrollDiv = useRef<null | HTMLDivElement>(null);
  // const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<LLMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [chatState, setChatState] = useState<string | null>(null);
  const [disablePromptInput, setDisablePromptInput] = useState<boolean>(false);
  const [loadingNewChat, setLoadingNewChat] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const [resolvedLanguage, setResolvedLanguage] = useState(false);
  const [downloadingTranscript, setDownloadingTranscript] = useState(false);
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  const [initialMessage, setInitialMessage] = useState<LLMessage[]>([]);

  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const [closeModal, setCloseModal] = useState<boolean>(false);
  // const langFormatText =
  //   langTextData[
  //     language_CODE.split("_")[0]?.toLowerCase() as keyof typeof langTextData
  //   ] ?? langTextData["en"];

  const [langFormatText, setLangFormatText] = useState(langTextData["en"]);

  function formatContactMessage(
    msg: string,
    contact: {
      phonelocal?: string;
      phoneinternational?: string;
      email?: string;
    } | null,
  ) {
    if (!contact) return msg;
    const lines = [msg, ""];
    if (contact.phonelocal) lines.push(`📞 ${contact.phonelocal}`);
    if (contact.phoneinternational)
      lines.push(`🌐 ${contact.phoneinternational}`);
    if (contact.email) lines.push(`✉️ ${contact.email}`);
    return lines.join("\n");
  }

  function formatParticipantEvent(
    name: string,
    operation: string,
    participantText: {
      participantJoined: string;
      participantLeft: string;
    },
  ): string {
    if (operation === "add")
      return participantText.participantJoined.replace("{name}", name);
    if (operation === "remove")
      return participantText.participantLeft.replace("{name}", name);
    return name;
  }

  function setInitialMessageSetup(
    initialTimestamp: number,
    oneShot: boolean = false,
  ) {
    if (!resolvedLanguage) return;
    let messages_initial: LLMessage[] = langFormatText.startupChatMessages.map(
      (item, key) => ({
        id: `initial-message-${key}`,
        timestamp: initialTimestamp,
        author: "assistant",
        content: item,
        loading: false,
      }),
    );
    // ,
    //   {
    //     id: "initial-message-2",
    //     timestamp: initialTimestamp,
    //     author: "assistant",
    //     content:
    //       "Please state your issue so that we can direct you to the right department",
    //     loading: false,
    //   },

    if (oneShot) {
      setInitialMessage(messages_initial);
      return;
    }

    setInitialMessage([]);

    setTimeout(() => {
      setInitialMessage((prev) => [...prev, messages_initial[0]]);
    }, 700);
    setTimeout(() => {
      setInitialMessage((prev) => [...prev, messages_initial[1]]);
    }, 2400);
  }

  useEffect(() => {
    if (messages.length > 0) {
      setInitialMessageSetup(messages[0].timestamp, true);
    } else {
      setInitialMessage([]);
    }
  }, [messages]);

  // useEffect(() => {
  //   fetch(import.meta.env.VITE_LL_API, {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       intent: "GetLanguageRenderingText",
  //       langIsoCode: language_CODE,
  //     }),
  //   })
  //     .then((res) => res.json())
  //     .then((data) => {
  //       if (data.data) {
  //         setLangFormatText(data.data);
  //         setResolvedLanguage(true);
  //       }
  //     });
  // }, []);

  useEffect(() => {
    console.log(chatState, chatState === "OpenStart");

    if (chatState === "OpenStart") {
      setShowDisclaimer(true);
    }
  }, [chatState]);

  const sendTypingEvent = async (
    type:
      | typeof CONVERSATION_CONSTANTS.EntryTypes.TYPING_STARTED_INDICATOR
      | typeof CONVERSATION_CONSTANTS.EntryTypes.TYPING_STOPPED_INDICATOR,
  ) => {
    if (chatState !== "SFChat") return;
    await fetch(import.meta.env.VITE_SF_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "TypingStatus",
        typingType: type,
      }),
    });
  };

  const handleInputChange = ({
    detail,
  }: NonCancelableCustomEvent<InputProps.ChangeDetail>) => {
    const val = detail.value;
    setPromptVal(val);

    if (val && !isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingEvent(
        CONVERSATION_CONSTANTS.EntryTypes.TYPING_STARTED_INDICATOR,
      );
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingEvent(
          CONVERSATION_CONSTANTS.EntryTypes.TYPING_STOPPED_INDICATOR,
        );
      }
    }, 1000);
  };

  async function handleNewChat() {
    try {
      setLoadingNewChat(true);
      esRef.current?.close(); // ✅ Add this
      esRef.current = null;
      lastEventIdRef.current = undefined; // ✅ clear stale ID

      const response = await fetch(import.meta.env.VITE_LL_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "ClearSession",
        }),
      });
      const data = await response.json();
      if (data.success) {
        setDisablePromptInput(false);
        setMessages([]);
        // setChatState("AIChat");
        setChatState("OpenStart");
      }
    } catch (e) {
      console.error("Couldn't end chat session", e);
    }
    setLoadingNewChat(false);
  }

  async function onMessage(e: any) {
    if (loading || [null, "Ended"].includes(chatState)) return;
    e?.preventDefault();
    const trimmed = promptVal.trim();
    if (!trimmed || loading) return;
    setPromptVal("");
    sendTypingEvent(CONVERSATION_CONSTANTS.EntryTypes.TYPING_STOPPED_INDICATOR);
    if (chatState === "SFChat") {
      const tempId = uuid();

      setMessages((prev) => [
        ...prev,
        {
          id: tempId,
          timestamp: Date.now(),
          author: "user",
          content: trimmed,
          sentMessage: true,
          sending: true,
        },
      ]);

      const res = await fetch(import.meta.env.VITE_SF_API, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent: "SendMessage",
          message: trimmed,
          clientMessageId: tempId,
        }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } else {
      const userMessageId = uuid();
      const assistantMessageId = uuid();
      setLoading(true);
      setMessages((prev) => [
        ...prev,
        {
          id: userMessageId,
          timestamp: Date.now(),
          author: "user",
          content: trimmed,
          sentMessage: true,
        },
        {
          id: assistantMessageId,
          timestamp: Date.now(),
          author: "assistant",
          content: "",
          loading: true,
        },
      ]);

      try {
        const res = await fetch(import.meta.env.VITE_LL_API, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            intent: "SendMessage",
            messageContent: trimmed,
            countryCode: country_CODE,
            languageCode: language_CODE,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        let responseText = data.response;
        if (data.fallbackTransfer) {
          responseText = langFormatText.llmTransferToAgentFallbackMessage;
        }

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  loading: false,
                  content:
                    responseText ??
                    langFormatText.llmResponsePharsingErrorMessage,
                }
              : msg,
          ),
        );
        if (data.intent === "TransferToAgent") {
          subscribeToTunnel(data);
        } else if (data.intent === "conversation_end") {
          closeAISession();
        } else {
          if ([null, "OpenStart"].includes(chatState)) {
            setChatState("AIChat");
          }
        }

        // if (
        //   ["Business", "Non-business"].includes(
        //     JSON.parse(data.body.response)["label"]
        //   )
        // ) {
        //   const req2ID = uuid();
        //   // setMessages((prev) => [
        //   //   ...prev,
        //   //   {
        //   //     id: req2ID,
        //   //     timestamp: Date.now(),
        //   //     author: "assistant",
        //   //     content: "",
        //   //     loading: true,
        //   //   },
        //   // ]);
        //   const res = await fetch(
        //     "https://s64v5a6hs0.execute-api.eu-west-1.amazonaws.com/Dev/agent",
        //     {
        //       method: "POST",
        //       headers: { "Content-Type": "application/json" },
        //       body: JSON.stringify({
        //         usecase: "query",
        //         prompt: trimmed,
        //         message_id: message_id,
        //         ...(session_id != null && { session_id: session_id }),
        //       }),
        //     }
        //   );
        //   if (!res.ok) throw new Error(`HTTP ${res.status}`);
        //   const data = await res.json();
        //   if (data?.statusCode !== 200) throw new Error("API returned failure");
        //   setMessages((prev) =>
        //     prev.map((msg) =>
        //       msg.id === assistantMessageId
        //         ? {
        //             ...msg,
        //             loading: false,
        //             content:
        //               data.body.response ??
        //               "Something went wrong. Please try again.",
        //           }
        //         : msg
        //     )
        //   );
        //   // setMessages((prev) =>
        //   //   prev.map((msg) =>
        //   //     msg.id === req2ID
        //   //       ? {
        //   //           ...msg,
        //   //           loading: false,
        //   //           content:
        //   //             data.body.response ??
        //   //             "Something went wrong. Please try again.",
        //   //         }
        //   //       : msg,
        //   //   ),
        //   // );
        // }
      } catch (err) {
        console.error("Message send failed:", err);

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.id === assistantMessageId) {
              return {
                ...msg,
                loading: false,
                content: langFormatText.llmSendMessageError,
              };
            }
            if (msg.id === userMessageId) {
              return { ...msg, sentMessage: false };
            }
            return msg;
          }),
        );
      } finally {
        setLoading(false);
      }
    }
  }

  // const handleNewChat = () => {
  //   setValue("");
  //   setSessionId(null);
  //   setMessages([]);
  // };

  useEffect(() => {
    requestAnimationFrame(() => {
      if (!scrollDiv.current) return;

      let el: HTMLElement | null = scrollDiv.current.parentElement;
      while (el) {
        if (el.scrollHeight > el.clientHeight) {
          el.scrollTop = el.scrollHeight;
          break;
        }
        el = el.parentElement;
      }
    });
  }, [messages, isAgentTyping]);

  function downloadTranscript(
    messages: LLMessage[],
    initialMessage: LLMessage[],
    lang: (typeof langTextData)["en"],
  ) {
    setDownloadingTranscript(true);
    const allMessages = [...initialMessage, ...messages];

    const lines = allMessages
      .filter((msg) => !msg.loading)
      .map((msg) => {
        const time = new Date(msg.timestamp).toLocaleString();
        // const author =
        //   msg.author === "assistant"
        //     ? lang.translateUserTitle.genai
        //     : msg.author === "agent"
        //     ? lang.translateUserTitle.agent
        //     : msg.author === "user"
        //     ? lang.translateUserTitle.user
        //     : "System";
        const author =
          msg.author === "assistant"
            ? lang.translateUserTitle.genai
            : msg.author === "agent"
            ? msg.name
              ? `[${lang.translateUserTitle.agent}] ${msg.name.split(" ")[0]}`
              : lang.translateUserTitle.agent
            : msg.author === "user"
            ? msg.name?.split(" ")[0] ?? lang.translateUserTitle.user
            : "System";

        const content = Array.isArray(msg.content)
          ? msg.content.join("\n")
          : msg.content ?? "";

        return `[${time}] ${author}:\n${content}`;
      })
      .join("\n\n");

    const blob = new Blob([lines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-transcript-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setDownloadingTranscript(false);
  }

  function parse_fetched_ai_chats(
    data: any,
    lang: (typeof langTextData)["en"],
  ) {
    let msgs__: LLMessage[] = [];
    data.map((i: any) => {
      msgs__.push({
        id: uuid(),
        timestamp: i.Timestamp,
        author: "user",
        content: i.UserMessage,
        sentMessage: true,
      });
      msgs__.push({
        id: uuid(),
        timestamp: i.Timestamp + 10,
        author: "assistant",
        content: i.fallbackTransfer
          ? lang.llmTransferToAgentFallbackMessage // ← lang instead of langFormatText
          : i.AgentMessage,
        sentMessage: true,
      });
    });
    return msgs__;
  }

  function closeSFSession() {
    if (chatState === "Ended") return;
    setDisablePromptInput(true);
    fetch(import.meta.env.VITE_SF_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "ChatWrapup",
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setChatState("Ended");
        }
        setDisablePromptInput(false);
      });
  }
  function closeAISession() {
    if (chatState === "Ended") return;
    setDisablePromptInput(true);
    fetch(import.meta.env.VITE_LL_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "EndChat",
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          setChatState("Ended");
        }
        setDisablePromptInput(false);
      });
  }

  function parse_fetched_sf_chats(
    data: any,
    lang: (typeof langTextData)["en"],
    contact: any | null, // ← add
  ) {
    return data.conversationEntries
      .map((i: any) => {
        const eventData = parseEventData(
          JSON.stringify({
            conversationEntry: {
              ...i,
              entryPayload: JSON.stringify(i.entryPayload),
            },
          }),
        );
        if (
          i.entryType == CONVERSATION_CONSTANTS.EntryTypes.CONVERSATION_MESSAGE
        ) {
          if (
            eventData.messageType ===
              CONVERSATION_CONSTANTS.MessageTypes.STATIC_CONTENT_MESSAGE &&
            eventData.content.staticContent?.formatType ===
              CONVERSATION_CONSTANTS.FormatTypes.TEXT
          ) {
            // console.log("adding to list");

            return {
              id: uuid(),
              timestamp: eventData.transcriptedTimestamp,
              author: eventData.actorType == "EndUser" ? "user" : "agent",
              content: eventData.content.staticContent.text,
              sentMessage: true,
              name:
                eventData.actorType == "EndUser"
                  ? "Customer"
                  : eventData.actorName,
              // EVENT: CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
              // DATA: eventData,
            };
          }
        }
        if (
          i.entryType == CONVERSATION_CONSTANTS.EntryTypes.PARTICIPANT_CHANGED
        ) {
          return {
            id: uuid(),
            timestamp: eventData.transcriptedTimestamp,
            author: "System",
            content: eventData.content.entries.map((j: any) =>
              formatParticipantEvent(
                String(j.displayName).split(" ")[0],
                j.operation,
                lang.participantAction,
              ),
            ),
            sentMessage: true,
          };
          // return {
          //   EVENT:
          //     CONVERSATION_CONSTANTS.EventTypes
          //       .CONVERSATION_PARTICIPANT_CHANGED,
          //   DATA: eventData,
          // };
        }
        if (
          i.entryType == CONVERSATION_CONSTANTS.EntryTypes.CLOSE_CONVERSATION
        ) {
          //
          if (chatState === "SFChat") {
            closeSFSession();
            setChatState("Ended");
          }

          return {
            id: uuid(),
            timestamp: eventData.transcriptedTimestamp,
            author: "System",
            content: [lang.sfSessionEndedMessage],
            sentMessage: true,
          };
        }
        if (
          i.entryType == CONVERSATION_CONSTANTS.EntryTypes.SESSION_STATE_CHANGED
        ) {
          //
          if (eventData.content.sessionStatus == "Ended") {
            if (chatState === "SFChat") {
              closeSFSession();
              setChatState("Ended");
            }

            return {
              id: uuid(),
              timestamp: eventData.transcriptedTimestamp,
              author: "System",
              content: [lang.sfSessionEndedMessage],
              sentMessage: true,
            };
          }
        }
        if (i.entryType == CONVERSATION_CONSTANTS.EntryTypes.ROUTING_RESULT) {
          // console.log(eventData);

          if (eventData.content.failureReason) {
            if (eventData.content.failureReason === "No_Agent") {
              return {
                id: eventData.messageId,
                timestamp: eventData.transcriptedTimestamp,
                name: "System",
                author: "assistant",
                content: [
                  formatContactMessage(
                    langFormatText.noAgentsAvailableMessage,
                    contact,
                  ),
                ],
              };

              // closeSFSession();
              // setChatState('Ended');
            }
            return {
              id: eventData.messageId,
              timestamp: eventData.transcriptedTimestamp,
              author: eventData.actorType,
              content: [eventData.content.failureReason],
              name:
                eventData.actorType == "EndUser"
                  ? "Customer"
                  : eventData.actorName,
            };
          }
        }
      })
      .filter((v: LLMessage | undefined) => v !== undefined);
  }

  const subscribeToTunnel = (data: any) => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    if (!data) return;
    const apiPathWithTimestamp = data.salesforceData.sseUrl;
    const es = new EventSourcePolyfill(apiPathWithTimestamp, {
      ...data.salesforceData.reqAttr,
      headers: {
        ...data.salesforceData.reqAttr?.headers,
        // ✅ Resume from last known event — server replays missed events
        ...(lastEventIdRef.current
          ? { "Last-Event-Id": lastEventIdRef.current }
          : {}),
      },
      heartbeatTimeout: 60000,
    });
    esRef.current = es;

    // ✅ Capture Last-Event-ID from every event so reconnect can resume
    const trackLastId = (e: any) => {
      if (e.lastEventId) lastEventIdRef.current = e.lastEventId;
    };

    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STARTED_INDICATOR,
      (e) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);

        if (
          eventData.actorType !==
          CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
        ) {
          setIsAgentTyping(true);
        }
      },
    );
    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STOPPED_INDICATOR,
      (e) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);

        if (
          eventData.actorType !==
          CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
        ) {
          setIsAgentTyping(false);
        }
      },
    );
    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
      (e: any) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);

        if (
          eventData.messageType ===
            CONVERSATION_CONSTANTS.MessageTypes.STATIC_CONTENT_MESSAGE &&
          eventData.content.staticContent?.formatType ===
            CONVERSATION_CONSTANTS.FormatTypes.TEXT
        ) {
          // console.log("adding to list");

          if (
            uuidv5(
              `first-salesforce-message-${eventData.conversationId}`,
              NAMESPACE_DNS,
            ) == eventData.messageId
          ) {
            return;
          }

          if (eventData.actorType === "EndUser") {
            const clientMessageId = eventData.messageId; // whatever field your backend echoes it back as

            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === clientMessageId);
              if (idx === -1)
                return [
                  ...prev,
                  {
                    id: eventData.messageId,
                    timestamp: eventData.transcriptedTimestamp,
                    author: eventData.actorType == "EndUser" ? "user" : "agent",
                    content: eventData.content.staticContent.text,
                    name:
                      eventData.actorType == "EndUser"
                        ? "Customer"
                        : eventData.actorName,
                  },
                  // {
                  //   EVENT:
                  //     CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
                  //   DATA: eventData,
                  // },
                ];
              const updated = [...prev];
              updated[idx] = {
                id: eventData.messageId,
                timestamp: eventData.transcriptedTimestamp,
                author: "user",
                content: eventData.content.staticContent.text,
                sentMessage: true,
                name:
                  eventData.actorType == "EndUser"
                    ? "Customer"
                    : eventData.actorName,
                sending: false,
              };
              return updated;
            });
            return;
          }
          // return {
          //     id: uuid(),
          //     timestamp: eventData.transcriptedTimestamp,
          //     author: eventData.actorType == "EndUser" ? "user" : "agent",
          //     content: eventData.content.staticContent.text,
          //     sentMessage: true,
          //     name: eventData.actorType == "EndUser" ? "Customer" : eventData.actorName,
          //     // EVENT: CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
          //     // DATA: eventData,
          //   };

          setMessages((prev) => [
            ...prev,
            {
              id: eventData.messageId,
              timestamp: eventData.transcriptedTimestamp,
              author: eventData.actorType == "EndUser" ? "user" : "agent",
              content: eventData.content.staticContent.text,
              name:
                eventData.actorType == "EndUser"
                  ? "Customer"
                  : eventData.actorName,
            },
            // {
            //   EVENT:
            //     CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
            //   DATA: eventData,
            // },
          ]);
        }
      },
    );
    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_ROUTING_RESULT,
      (e: any) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);
        // console.log(eventData);

        if (eventData.content.failureReason) {
          if (eventData.content.failureReason === "No_Agent") {
            // closeSFSession();
            // setChatState('Ended');

            // fetch(import.meta.env.VITE_SF_API, {
            fetch(import.meta.env.VITE_SF_API, {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                intent: "ContactCenterDetails",
                countryCode: country_CODE,
              }),
            })
              .then((res) => res.json())
              .then((contact) => {
                setMessages((prev) => [
                  ...prev,
                  {
                    id: eventData.messageId,
                    timestamp: eventData.transcriptedTimestamp,

                    name: "System",
                    author: "assistant",
                    content: [
                      formatContactMessage(
                        langFormatText.noAgentsAvailableMessage,
                        contact,
                      ),
                    ],
                    sentMessage: true,
                  },
                ]);
              });
            return;
          }
          setMessages((prev) => [
            ...prev,
            {
              id: eventData.messageId,
              timestamp: eventData.transcriptedTimestamp,
              author: eventData.actorType,
              content: [eventData.content.failureReason],
              name:
                eventData.actorType == "EndUser"
                  ? "Customer"
                  : eventData.actorName,
            },
            // {
            //   EVENT:
            //     CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
            //   DATA: eventData,
            // },
          ]);
        }
      },
    );
    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_PARTICIPANT_CHANGED,
      (e: any) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);
        setMessages((prev) => [
          ...prev,
          {
            id: uuid(),
            timestamp: eventData.transcriptedTimestamp,
            author: "System",
            content: eventData.content.entries.map((j: any) =>
              formatParticipantEvent(
                String(j.displayName).split(" ")[0],
                j.operation,
                langFormatText.participantAction,
              ),
            ),
            sentMessage: true,
          },
        ]);
        // setMessages((prev) => [
        //   ...prev,
        //   {
        //     EVENT:
        //       CONVERSATION_CONSTANTS.EventTypes
        //         .CONVERSATION_PARTICIPANT_CHANGED,
        //     DATA: eventData,
        //   },
        // ]);
      },
    );
    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_CLOSE_CONVERSATION,
      (e: any) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);
        if (eventData) {
          // setSessionStatus(eventData.content.sessionStatus);
          if (chatState != "Ended") {
            setMessages((prev) => [
              ...prev,
              {
                id: uuid(),
                timestamp: eventData.transcriptedTimestamp,
                author: "System",
                content: [langFormatText.sfSessionEndedMessage],
                sentMessage: true,
              },
            ]);
            closeSFSession();
            setChatState("Ended");
          }
        }
      },
    );
    es.addEventListener(
      CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_SESSION_STATUS_CHANGED,
      (e: any) => {
        trackLastId(e);

        const eventData = parseEventData(e.data);
        // setSessionStatus(eventData.content.sessionStatus);
        if (eventData.content.sessionStatus == "Ended") {
          esRef.current?.close(); // ✅ Add this
          esRef.current = null;
          setChatState("Ended");
          closeSFSession();
          setMessages((prev) => [
            ...prev,
            {
              id: uuid(),
              timestamp: eventData.transcriptedTimestamp,
              author: "System",
              content: [langFormatText.sfSessionEndedMessage],
              sentMessage: true,
            },
          ]);
          // closeSFSession();
          // setChatState('Ended');
          // setMessages((prev
          // setMessages((prev) => [
          //   ...prev,
          //   {
          //     EVENT:
          //       CONVERSATION_CONSTANTS.EventTypes
          //         .CONVERSATION_SESSION_STATUS_CHANGED,
          //     DATA: eventData,
          //   },
          // ]);
        }
      },
    );

    es.onopen = () => {
      setChatState("SFChat");
      // es.addEventListener(
      //   CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STARTED_INDICATOR,
      //   (e) => {
      //     const eventData = parseEventData(e.data);

      //     if (
      //       eventData.actorType !==
      //       CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
      //     ) {
      //       setIsAgentTyping(true);
      //     }
      //   },
      // );
      // es.addEventListener(
      //   CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STOPPED_INDICATOR,
      //   (e) => {
      //     const eventData = parseEventData(e.data);

      //     if (
      //       eventData.actorType !==
      //       CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
      //     ) {
      //       setIsAgentTyping(false);
      //     }
      //   },
      // );

      console.log("Chat opened");
    };

    es.onerror = async () => {
      console.log("SSE disconnected");
      es.close();
      esRef.current = null;

      let attempt = 0;
      while (true) {
        const delay = Math.min(1000 * 2 ** attempt, 7500); // cap at 30s
        await new Promise((res) => setTimeout(res, delay));
        try {
          await refreshSFToken();
          break;
        } catch (err) {
          console.error(
            `Reconnect attempt ${attempt + 1} failed, retrying...`,
            err,
          );
          attempt++;
        }
      }
    };
  };

  const refreshSFToken = async () => {
    if (chatStateRef.current !== "SFChat") return; // <-- fix stale closure
    const res = await fetch(import.meta.env.VITE_SF_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ intent: "RefreshSFToken" }),
    });
    const data = await res.json();
    if (data.expired) {
      setChatState("Ended");
      return;
    }
    subscribeToTunnel(data);
  };

  // useEffect(() => {
  //   fetch(import.meta.env.VITE_LL_API, {
  //     method: "POST",
  //     credentials: "include",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({
  //       intent: "SessionState",
  //     }),
  //   })
  //     .then((response) => response.json())
  //     .then((data) => {
  //       // if (data.expired) {
  //       //   return;
  //       // }
  //       if (data.state === "NOT_CONNECTED") {
  //         setChatState("OpenStart"); // 👈 just start fresh
  //         return;
  //       }

  //       let messages_too_add: LLMessage[] = [];
  //       setChatState(data.state);
  //       if (data.previous_ai_chats) {
  //         messages_too_add = [
  //           ...messages_too_add,
  //           ...parse_fetched_ai_chats(data.previous_ai_chats),
  //         ];
  //         if (data.salesforce_messages) {
  //           subscribeToTunnel(data.salesforce_data);
  //           messages_too_add = [
  //             ...messages_too_add,
  //             ...parse_fetched_sf_chats(data.salesforce_messages),
  //           ];
  //         }
  //       }
  //       setMessages(messages_too_add);
  //     });
  // }, []);

  useEffect(() => {
    fetch(import.meta.env.VITE_LL_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "SessionState",
        langIsoCode: language_CODE,
      }),
    })
      .then((response) => response.json())
      .then(async (data) => {
        const lang = data.langData ?? langTextData["en"];
        setLangFormatText(lang);
        setResolvedLanguage(true);

        if (data.state === "NOT_CONNECTED") {
          setChatState("OpenStart");
          return;
        }

        // Fetch contact details once upfront
        let contact = null;
        try {
          const contactRes = await fetch(import.meta.env.VITE_SF_API, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              intent: "ContactCenterDetails",
              countryCode: country_CODE,
            }),
          });
          contact = await contactRes.json();
        } catch (e) {
          console.error("Failed to fetch contact details", e);
        }

        let messages_too_add: LLMessage[] = [];
        setChatState(data.state);
        if (data.previous_ai_chats) {
          messages_too_add = [
            ...messages_too_add,
            ...parse_fetched_ai_chats(data.previous_ai_chats, lang),
          ];
          if (data.salesforce_messages) {
            subscribeToTunnel(data.salesforce_data);
            messages_too_add = [
              ...messages_too_add,
              ...parse_fetched_sf_chats(
                data.salesforce_messages,
                lang,
                contact,
              ), // ← pass contact
            ];
          }
        }
        setMessages(messages_too_add);
      });
  }, []);
  const lastEventIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        const state = esRef.current?.readyState;
        // Only reconnect if the connection actually died
        if (state === undefined || state === EventSource.CLOSED) {
          refreshSFToken();
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      esRef.current?.close();
    };
  }, []);

  const chatStateRef = useRef(chatState);
  const messagesRef = useRef(messages);

  useEffect(() => {
    chatStateRef.current = chatState;
  }, [chatState]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    // const refresh = async () => {
    //   if (
    //     // chatStateRef.current === "AIChat" ||
    //     chatStateRef.current === "SFChat"
    //   ) {
    //     if (messagesRef.current.length === 0) return;
    //     await fetch(import.meta.env.VITE_LL_API, {
    //       method: "POST",
    //       credentials: "include",
    //       headers: { "Content-Type": "application/json" },
    //       body: JSON.stringify({ intent: "RefreshSession" }),
    //     });
    //   }
    // };
    // const interval = setInterval(refresh, 1000 * 60 * 5);
    // return () => clearInterval(interval);
    const aiInterval = setInterval(async () => {
      if (chatStateRef.current === "SFChat") {
        await fetch(import.meta.env.VITE_LL_API, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "RefreshSession" }),
        });
      }
    }, 1000 * 60 * 5);

    const sfInterval = setInterval(async () => {
      if (chatStateRef.current === "SFChat") {
        await refreshSFToken();
      }
    }, 1000 * 60 * 15);

    return () => {
      clearInterval(aiInterval);
      clearInterval(sfInterval);
    };
  }, []);

  const onChatCloseButton = () => {
    setCloseModal(true);
  };

  const onModalDismiss = () => {
    setCloseModal(false);
  };

  const closeChatWindowTrigger = () => {
    setCloseModal(false);
    if (chatState == "OpenStart") {
      setShowDisclaimer(true);
    }
    const messageData = {
      type: "GCC_CHATWINDOW",
      payload: { intent: "CloseWindow" },
    };
    window.parent.postMessage(messageData, "*");
  };

  return (
    <>
      {showDisclaimer ? (
        <ChatDisclaimer
          disclaimerTextFields={langFormatText.disclaimerTextFields}
          onAccept={() => {
            setShowDisclaimer(false);
            setInitialMessageSetup(Date.now());
          }}
          onDeny={closeChatWindowTrigger}
        />
      ) : (
        ""
      )}

      <div
        style={{
          height: "100vh",
        }}
      >
        <div style={{ height: "100%" }}>
          <div
            style={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <Container
              // header={<Header variant="h1">Chatbot Aggregator-Test Interface</Header>}
              style={{ root: { borderWidth: "0px" } }}
              fitHeight
              className="containerComponent"
              disableContentPaddings
              header={
                <div className="chat_header">
                  <div className="title">
                    <ButtonDropdown
                      className="dropdown-menu"
                      variant="icon"
                      items={[
                        {
                          id: "end_chat",
                          text: langFormatText.uiEndChatBtnText,
                          iconName: "close",
                          disabled: [null, "OpenStart", "Ended"].includes(
                            chatState,
                          ),
                          // || messages.length == 0,
                        },
                        {
                          id: "download_transcript",
                          text: langFormatText.uiDownloadTranscriptBtnText,
                          iconName: "download",
                          disabled:
                            [null, "OpenStart"].includes(chatState) ||
                            messages.length === 0,
                        },
                      ]}
                      onItemClick={({ detail }) => {
                        if (detail.id === "end_chat")
                          chatState === "SFChat"
                            ? closeSFSession()
                            : closeAISession();
                        if (detail.id === "download_transcript") {
                          downloadTranscript(
                            messages,
                            initialMessage,
                            langFormatText,
                          );
                        }
                      }}
                    />
                    <img src={ABBLogo} />
                    <h2>{langFormatText.uiChatTitle}</h2>
                    <h2 style={{ color: "#00000073", fontWeight: 500 }}>
                      ({import.meta.env.VITE_CHAT_APP_BRANCH})
                    </h2>
                  </div>
                  <Modal
                    onDismiss={onModalDismiss}
                    visible={closeModal}
                    className="change-modal-close-icon"
                    footer={
                      <Box float="right">
                        <SpaceBetween direction="horizontal" size="xs">
                          <GradientButton onClick={onModalDismiss}>
                            {langFormatText.closeChatTextFields.cancel}
                          </GradientButton>
                          <FillButton
                            variant="primary"
                            onClick={closeChatWindowTrigger}
                          >
                            {langFormatText.closeChatTextFields.ok}
                          </FillButton>
                        </SpaceBetween>
                      </Box>
                    }
                    header={langFormatText.closeChatTextFields.title}
                  >
                    {langFormatText.closeChatTextFields.body}
                  </Modal>
                  <div
                    role="button"
                    id="custom-chat-modal-close"
                    onClick={onChatCloseButton}
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M4.71969 18.2182C4.42679 18.511 4.42677 18.9859 4.71965 19.2788C5.01253 19.5717 5.4874 19.5717 5.78031 19.2789L11.9993 13.0604L18.2197 19.2803C18.5126 19.5732 18.9875 19.5732 19.2804 19.2803C19.5732 18.9874 19.5732 18.5125 19.2803 18.2196L13.0609 12.0007L19.2803 5.78169C19.5732 5.48881 19.5732 5.01394 19.2804 4.72103C18.9875 4.42813 18.5126 4.42811 18.2197 4.72099L12.0007 10.9395L5.78031 4.71953C5.4874 4.42665 5.01253 4.42666 4.71965 4.71957C4.42677 5.01247 4.42679 5.48735 4.71969 5.78023L10.9391 11.9992L4.71969 18.2182Z" />
                    </svg>
                  </div>
                </div>
              }
              footer={
                <SpaceBetween className="footer-div" size="s">
                  {chatState === "Ended" ? (
                    <div
                      style={{
                        textAlign: "center",
                        gap: 16,
                        display: "flex",
                        justifyContent: "center",
                      }}
                    >
                      <GradientButton
                        onClick={handleNewChat}
                        loading={loadingNewChat}
                      >
                        {langFormatText.uiStartNewChatBnText}
                      </GradientButton>
                      <GradientButton
                        iconName="download"
                        loading={downloadingTranscript}
                        onClick={() => {
                          downloadTranscript(
                            messages,
                            initialMessage,
                            langFormatText,
                          );
                        }}
                      >
                        {langFormatText.uiDownloadTranscriptBtnText}
                      </GradientButton>
                      {/* <Button className="endchat-btn" onClick={handleNewChat} loading={loadingNewChat}>
                      {langFormatText.uiStartNewChatBnText}
                    </Button> */}
                    </div>
                  ) : (
                    <PromptInput
                      style={{
                        root: {
                          color: {
                            disabled: "#9E9E9E",
                            default: "#696969",
                            focus: "#1F1F1F",
                          },
                          borderColor: {
                            disabled: "#DBDBDB",
                            default: "#000",
                            focus: "#615EEF",
                          },
                          backgroundColor: {
                            disabled: "#fff",
                          },
                        },
                        placeholder: {
                          fontStyle: "normal",
                        },
                      }}
                      value={promptVal}
                      onChange={handleInputChange}
                      onAction={onMessage}
                      placeholder={langFormatText.uiTypeMessageInputText}
                      actionButtonIconName="send"
                      ariaLabel={langFormatText.uiTypeMessageInputText}
                      disableActionButton={
                        loading || [null, "Ended"].includes(chatState)
                      }
                      disabled={!chatState || disablePromptInput}
                      maxRows={8}
                      minRows={3}
                    />
                  )}
                </SpaceBetween>
              }
            >
              <Box padding="m">
                <SpaceBetween size="s">
                  <div className="message-containers">
                    <SpaceBetween size="s">
                      <div
                        ref={scrollDiv}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 12,
                        }}
                      >
                        {/* <SpaceBetween
                        size="xs"
                        className="chat-message"
                        // alignItems={
                        //   message.author === "assistant" ||
                        //   message.author === "agent"
                        //     ? "start"
                        //     : message.author === "user"
                        //     ? "end"
                        //     : "center"
                        // }
                      >
                        <SpaceBetween size="xs" alignItems={"center"}>
                          <Box color="text-body-secondary">
                            
                                  <p>
                                    <small>
                                      This is a disclaimer
                                    </small>
                                  </p>
                          </Box>
                        </SpaceBetween>
                      </SpaceBetween> */}

                        {[...initialMessage, ...messages].map((message) => (
                          <SpaceBetween
                            key={message.id}
                            size="xs"
                            className="chat-message"
                            alignItems={
                              message.author === "assistant" ||
                              message.author === "agent"
                                ? "start"
                                : message.author === "user"
                                ? "end"
                                : "center"
                            }
                          >
                            {message.author === "System" ? (
                              <SpaceBetween size="xs" alignItems={"center"}>
                                <Box color="text-body-secondary">
                                  {Array.isArray(message.content)
                                    ? message.content.map((i: string) => (
                                        <p>
                                          <small
                                            style={{
                                              whiteSpace: "pre-wrap",
                                              textAlign: "center",
                                            }}
                                          >
                                            {i}{" "}
                                            {message.name ===
                                            "Automated Process"
                                              ? ""
                                              : timestampToDateString(
                                                  message.timestamp,
                                                )}
                                          </small>
                                        </p>
                                      ))
                                    : message.content}
                                </Box>
                              </SpaceBetween>
                            ) : (
                              <SpaceBetween size="xxs">
                                <ChatBubble
                                  avatar={
                                    <ChatBubbleAvatar
                                      loading={message.loading ? true : false}
                                      author={
                                        message.name ||
                                        langFormatText.translateUserTitle[
                                          message.author
                                        ]
                                      }
                                      role={message.author}
                                      translateUserTitleRef={
                                        langFormatText.translateUserTitle
                                      }
                                    />
                                  }
                                  ariaLabel={`message-${message.author}`}
                                  type={
                                    message.author === "assistant" ||
                                    message.author === "agent"
                                      ? "incoming"
                                      : "outgoing"
                                  }
                                >
                                  {message.loading ? (
                                    <LoadingMessage
                                      loadingMsg={langFormatText.loadingMsgText}
                                    />
                                  ) : (
                                    <div
                                      className="markdownContainerDiv"
                                      style={{
                                        display: "flex",
                                        gap: 10,
                                        flexDirection: "column",
                                        whiteSpace: "pre-wrap",
                                      }}
                                    >
                                      <Markdown
                                        components={{
                                          a: ({ href, children }) => (
                                            <a
                                              href={href}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                            >
                                              {children}
                                            </a>
                                          ),
                                        }}
                                      >
                                        {Array.isArray(message.content)
                                          ? message.content.join("\n")
                                          : message.content ?? ""}
                                      </Markdown>
                                    </div>
                                  )}
                                </ChatBubble>
                                {!message.loading && (
                                  <Box
                                    textAlign={
                                      message.author === "user"
                                        ? "right"
                                        : "left"
                                    }
                                  >
                                    <MessageTimestamp
                                      timestamp={message.timestamp}
                                      sending={message.sending}
                                    />
                                  </Box>
                                )}
                              </SpaceBetween>
                            )}
                          </SpaceBetween>
                        ))}

                        {isAgentTyping ? (
                          <SpaceBetween
                            size="xs"
                            className="chat-message"
                            alignItems={"start"}
                          >
                            <ChatBubble
                              avatar={
                                <ChatBubbleAvatar
                                  author={
                                    langFormatText.translateUserTitle.agent
                                  }
                                  role={"agent"}
                                  loading={true}
                                  translateUserTitleRef={
                                    langFormatText.translateUserTitle
                                  }
                                />
                              }
                              ariaLabel={`message-agent`}
                              type={"incoming"}
                            >
                              <DotLoader />
                            </ChatBubble>
                          </SpaceBetween>
                        ) : (
                          ""
                        )}
                      </div>
                    </SpaceBetween>
                  </div>
                </SpaceBetween>
              </Box>
            </Container>
          </div>
        </div>
      </div>
    </>
  );
}

function capitalizeFirstLetter(val: string) {
  return String(val).charAt(0).toUpperCase() + String(val).slice(1);
}

function ChatBubbleAvatar({
  loading,
  author,
  role,
  translateUserTitleRef,
}: {
  loading: boolean;
  author: string | null;
  role: string;
  translateUserTitleRef: {
    user: string;
    agent: string;
    assistant: string;
    genai: string;
  };
}) {
  if (role === "assistant") {
    return (
      <Avatar
        color="gen-ai"
        iconName="gen-ai"
        loading={loading}
        tooltipText={translateUserTitleRef.genai}
        ariaLabel={translateUserTitleRef.genai}
      />
    );
  }

  const initials = (author ? author : translateUserTitleRef.user)
    .trim()[0]
    ?.toUpperCase();

  return (
    <Avatar
      initials={initials}
      tooltipText={capitalizeFirstLetter(
        author === "Automated Process"
          ? "Automated Process"
          : author?.split(" ")[0] || translateUserTitleRef.user,
      )}
      ariaLabel={capitalizeFirstLetter(
        author === "Automated Process"
          ? "Automated Process"
          : author?.split(" ")[0] || translateUserTitleRef.user,
      )}
    />
  );
}

function MessageTimestamp({
  timestamp,
  sending,
}: {
  timestamp: number | string;
  sending: boolean | null | undefined;
}) {
  const date = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, "0");

  // const offsetMinutes = -date.getTimezoneOffset();
  // const sign = offsetMinutes >= 0 ? "+" : "-";
  // const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  // const minutes = pad(Math.abs(offsetMinutes) % 60);

  // const time = `${pad(date.getHours())}:${pad(
  //   date.getMinutes(),
  // )} GMT${sign}${hours}:${minutes}`;

  const time = `${pad(date.getHours() % 12 || 12)}:${pad(date.getMinutes())} ${
    date.getHours() >= 12 ? "PM" : "AM"
  }`;

  return (
    <Box color="text-body-secondary">
      <small style={{ marginInline: 40 }}>
        {sending ? "Sending..." : time}
      </small>
    </Box>
  );
}

const LoadingMessage = ({ loadingMsg }: { loadingMsg: string }) => (
  <Box color="text-status-inactive">
    <div style={{ display: "flex", gap: 7 }}>
      {loadingMsg}
      <DotLoader />
    </div>
  </Box>
);

export default Chat;
