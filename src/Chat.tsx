import {
  Box,
  Button,
  ButtonDropdown,
  Container,
  PromptInput,
  SpaceBetween,
} from "@cloudscape-design/components";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";
import Markdown from "react-markdown";
import { DotLoader } from "./assets/DotLoader";
import { ChatBubble, Avatar } from "@cloudscape-design/chat-components";
import "./Chat.css";
import { useRef } from "react";
import { EventSourcePolyfill } from "event-source-polyfill";
import { CONVERSATION_CONSTANTS } from "./constants";
import { InputProps } from "@cloudscape-design/components";
import { NonCancelableCustomEvent } from "@cloudscape-design/components/interfaces";
import langTextData from "./textLang.json";
// import ABBLogo from "./assets/ABB_Logo.svg"
import ABBLogo from "./assets/ABB_Logo.png"

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

function timestampToDateString(timestamp: number) {
  const d = new Date(timestamp);

  const pad = (n: any) => String(n).padStart(2, "0");

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const minutes = pad(Math.abs(offsetMinutes) % 60);

  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds(),
  )} GMT${sign}${hours}:${minutes}`;
  return time;
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
  const language_CODE = queryParams.get("lang") ?? "en_US";
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

  const langFormatText =
    langTextData[language_CODE as keyof typeof langTextData] ??
    langTextData["en_US"];

  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

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
        setChatState("AIChat");
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

  function parse_fetched_ai_chats(data: any) {
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
        content: i.AgentMessage,
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

  function parse_fetched_sf_chats(data: any) {
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
              name: eventData.actorName,
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
            content: eventData.content.entries.map(
              (j: any) =>
                `${j.displayName} has ${
                  j.operation == "add"
                    ? "joined"
                    : j.operation == "remove"
                    ? "left"
                    : ""
                }`,
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
          i.entryType == CONVERSATION_CONSTANTS.EntryTypes.SESSION_STATE_CHANGED
        ) {
          //
          if (eventData.content.sessionStatus == "Ended") {
            // closeSFSession();
            setChatState("Ended");
            return {
              id: uuid(),
              timestamp: eventData.transcriptedTimestamp,
              author: "System",
              content: [langFormatText.sfSessionEndedMessage],
              sentMessage: true,
            };
          }
        }
        if (i.entryType == CONVERSATION_CONSTANTS.EntryTypes.ROUTING_RESULT) {
          // console.log(eventData);

          if (eventData.content.failureReason) {
            if (
              eventData.content.failureReason ===
              "No Agents are available. Please submit a web inquiry using the web contact form."
            ) {
              // closeSFSession();
              // setChatState('Ended');
            }
            return {
              id: eventData.messageId,
              timestamp: eventData.transcriptedTimestamp,
              author: eventData.actorType,
              content: [eventData.content.failureReason],
              name: eventData.actorName,
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
                    name: eventData.actorName,
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
                sending: false,
              };
              return updated;
            });
            return;
          }

          // setMessages((prev) => [
          //   ...prev,
          //   {
          //     id: eventData.messageId,
          //     timestamp: eventData.transcriptedTimestamp,
          //     author: eventData.actorType == "EndUser" ? "user" : "agent",
          //     content: eventData.content.staticContent.text,
          //     name: eventData.actorName,
          //   },
          //   // {
          //   //   EVENT:
          //   //     CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
          //   //   DATA: eventData,
          //   // },
          // ]);
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
          if (
            eventData.content.failureReason ===
            "No Agents are available. Please submit a web inquiry using the web contact form."
          ) {
            // closeSFSession();
            // setChatState('Ended');
          }
          setMessages((prev) => [
            ...prev,
            {
              id: eventData.messageId,
              timestamp: eventData.transcriptedTimestamp,
              author: eventData.actorType,
              content: [eventData.content.failureReason],
              name: eventData.actorName,
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
            content: eventData.content.entries.map(
              (j: any) =>
                `${j.displayName} has ${
                  j.operation == "add"
                    ? "joined"
                    : j.operation == "remove"
                    ? "left"
                    : ""
                }`,
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
          // closeSFSession();
          setChatState("Ended");
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
      console.log("Disconnected for some reasson");

      es.close();
      esRef.current = null;
      await refreshSFToken();
    };
  };

  const refreshSFToken = async () => {
    if (chatState !== "SFChat") return;
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

  useEffect(() => {
    fetch(import.meta.env.VITE_LL_API, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intent: "SessionState",
      }),
    })
      .then((response) => response.json())
      .then((data) => {
        // if (data.expired) {
        //   return;
        // }
        if (data.state === "NOT_CONNECTED") {
          setChatState("AIChat"); // 👈 just start fresh
          return;
        }

        let messages_too_add: LLMessage[] = [];
        setChatState(data.state);
        if (data.previous_ai_chats) {
          messages_too_add = [
            ...messages_too_add,
            ...parse_fetched_ai_chats(data.previous_ai_chats),
          ];
          if (data.salesforce_messages) {
            subscribeToTunnel(data.salesforce_data);
            messages_too_add = [
              ...messages_too_add,
              ...parse_fetched_sf_chats(data.salesforce_messages),
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
    const refresh = async () => {
      if (
        chatStateRef.current === "AIChat" ||
        chatStateRef.current === "SFChat"
      ) {
        if (messagesRef.current.length === 0) return;
        await fetch(import.meta.env.VITE_LL_API, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ intent: "RefreshSession" }),
        });
      }
    };
    const interval = setInterval(refresh, 1000 * 60 * 5);
    return () => clearInterval(interval);
  }, []);

  return (
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
                <div>
                  <ButtonDropdown
                    variant="icon"
                    items={[
                      {
                        id: "end_chat",
                        text: langFormatText.uiEndChatBtnText,
                        iconName: "close",
                        disabled:
                          !["AIChat", "SFChat"].includes(chatState ?? "") ||
                          messages.length == 0,
                      },
                      {
                        id: "download_transcript",
                        text: langFormatText.uiDownloadTranscriptBtnText,
                        iconName: "download",
                        disabled: true,
                      },
                    ]}
                    onItemClick={({ detail }) => {
                      if (detail.id === "end_chat")
                        chatState === "AIChat"
                          ? closeAISession()
                          : closeSFSession();
                      if (detail.id === "download_transcript") {
                        // handleDownloadTranscript();
                      }
                    }}
                  />
                  <img src={ABBLogo} />
                  <h2>{langFormatText.uiChatTitle}</h2>
                  <h2 style={{ color: "#00000073", fontWeight: 500 }}>
                    ({import.meta.env.VITE_CHAT_APP_BRANCH})
                  </h2>
                </div>
              </div>
            }
            footer={
              <SpaceBetween size="s">
                {chatState === "Ended" ? (
                  <div style={{ textAlign: "center" }}>
                    <Button onClick={handleNewChat} loading={loadingNewChat}>
                      {langFormatText.uiStartNewChatBnText}
                    </Button>
                  </div>
                ) : (
                  <PromptInput
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

                      {messages.map((message) => (
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
                                        <small>
                                          {i}{" "}
                                          {message.name === "Automated Process"
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
                                    message.author === "user" ? "right" : "left"
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
                                author={langFormatText.translateUserTitle.agent}
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
    .trim()
    .split(" ")
    .map((i) => i[0])
    .join("")
    .toUpperCase();

  return (
    <Avatar
      initials={initials}
      tooltipText={capitalizeFirstLetter(author || translateUserTitleRef.user)}
      ariaLabel={capitalizeFirstLetter(author || translateUserTitleRef.user)}
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

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const minutes = pad(Math.abs(offsetMinutes) % 60);

  const time = `${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )} GMT${sign}${hours}:${minutes}`;

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
