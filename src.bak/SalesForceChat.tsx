import { useState, useContext, useEffect, useRef } from "react";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import PromptInput from "@cloudscape-design/components/prompt-input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { Avatar, ChatBubble } from "@cloudscape-design/chat-components";
import { DotLoader } from "./assets/DotLoader";
import { AppContext } from "./App";
import { v4 as uuid } from "uuid";
import { LLMessage } from "./ChatInterface";
import { EventSourcePolyfill } from "event-source-polyfill";

import { CONVERSATION_CONSTANTS } from "./constants";

type StreamMessage = {
  EVENT: string;
  DATA: {
    conversationId: string;
    messageId: string;
    content: object;
    entryType: string;
    sender: string;
    actorType: string;
    transcriptedTimestamp: string;
    messageReason: string;
  };
};

function timestampToDateString(timestamp) {
  const d = new Date(timestamp);

  const pad = (n) => String(n).padStart(2, "0");

  const offsetMinutes = -d.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const hours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const minutes = pad(Math.abs(offsetMinutes) % 60);

  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
    d.getSeconds()
  )} GMT${sign}${hours}:${minutes}`;
  return time;
}

function SalesForceChat({
  prevMessages,
}: {
  prevMessages: LLMessage[];
}): JSX.Element {
  const { displayName } = useContext(AppContext);
  const [convoId, setConvoId] = useState(
    localStorage.getItem("SALESFORCE_CONVO_ID")
  );
  const [prompt, setPrompt] = useState("");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const scrollDiv = useRef(null);
  const [sessionStatus, setSessionStatus] = useState(null);
  const [jwtToken, setJwtToken] = useState<string>(null);
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [conversationStatus, setConversationStatus] = useState<string>(
    CONVERSATION_CONSTANTS.ConversationStatus.NOT_STARTED_CONVERSATION
  );
  // typing timeout
  const typingTimeoutRef = useRef<number | null>(null);
  const isTypingRef = useRef(false);

  function parseEventData(data: string) {
    const jsonData = JSON.parse(data);
    const entryPayload = JSON.parse(jsonData.conversationEntry.entryPayload);
    console.log(jsonData, entryPayload);
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

  const sendTypingEvent = async (
    type:
      | CONVERSATION_CONSTANTS.EntryTypes.TYPING_STARTED_INDICATOR
      | CONVERSATION_CONSTANTS.EntryTypes.TYPING_STOPPED_INDICATOR
  ) => {
    await fetch(
      `${
        import.meta.env.VITE_SALESFORCE_URL
      }/iamessage/api/v2/conversation/${convoId}/entry`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer " + jwtToken,
        },
        body: JSON.stringify({
          entryType: type,
          id: uuid(),
        }),
      }
    );
  };

  const handleInputChange = (detail) => {
    const val = detail.value;
    setPrompt(val);

    if (val && !isTypingRef.current) {
      isTypingRef.current = true;
      sendTypingEvent(
        CONVERSATION_CONSTANTS.EntryTypes.TYPING_STARTED_INDICATOR
      );
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingEvent(
          CONVERSATION_CONSTANTS.EntryTypes.TYPING_STOPPED_INDICATOR
        );
      }
    }, 800);
  };

  const generateJWT = () => {
    const fromLocalStorage = localStorage.getItem("SALESFORCE_JWT_TOKEN");
    if (!fromLocalStorage) {
      fetch(
        `${
          import.meta.env.VITE_SALESFORCE_URL
        }/iamessage/api/v2/authorization/authenticated/access-token`,
        // }/iamessage/api/v2/authorization/unauthenticated/access-token`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            orgId: import.meta.env.VITE_SALESFORCE_ORG_ID,
            esDeveloperName: import.meta.env.VITE_SALESFORCE_DEV_NAME,
            capabilitiesVersion: "1",
            platform: "Web",
            authorizationType: "JWT",
            customerIdentityToken:
              "ew0KICAiYWxnIjogIlJTMjU2IiwNCiAgImtpZCI6ICJhbWF6b25LZXkiLA0KICAidHlwIjogIkpXVCINCn0.ew0KICAic3ViIjogImFtYXpvbi1ib3QtdXNlciIsDQogICJpc3MiOiAiQVdTIiwNCiAgImlhdCI6IDE3NzM4MDUyNjYsDQogICJleHAiOiAxNzc0MzIzNjY2DQp9.dHQlLkYK1jIUAaAIgQUy4dt5TdVqWJskB9xCBa6hKe8AlfU0ufeXM-bnykoJqeqIGB9AP0wXhnzQg8_qBbxjZ9zGYzjOE0ozJ1vFcFfj_hJBxfkhax7Pgi5CNxH2TmQPankfZuFvVaS2b5mGiYnSXbmMajNOhHJW0X8tOIvkB_r1vPCFMkneur0yS5l9Kknixpyr1oWFy9Ge5bYPxzPbQj64wYk7JNtVZU-hcDzN4SmtkZ9GX0TaFWN-gbEqTzvhkHLNjnZFFSjnbpYhayQTQZbKAH7J_aL4DdQNALVAece_YB2n5zRq9JY3VTQgnsQkogdulDTLAGhHrMD5WESUfg",
          }),
        }
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          setJwtToken(data.accessToken);
          localStorage.setItem("SALESFORCE_JWT_TOKEN", data.accessToken);
        })
        .catch((e) => {
          // error in e.message
        });
    } else {
      fetch(
        `${
          import.meta.env.VITE_SALESFORCE_URL
        }/iamessage/api/v2/authorization/continuation-access-token`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            authorization: "Bearer " + fromLocalStorage,
          },
        }
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          setJwtToken(data.accessToken);
          localStorage.setItem("SALESFORCE_JWT_TOKEN", data.accessToken);
        })
        .catch((e) => {
          // error in e.message
        });
    }
  };

  useEffect(() => {
    generateJWT();
  }, []);

  useEffect(() => {
    if (!scrollDiv.current) return;
    scrollDiv.current.scrollIntoView(false);
  }, [messages]);

  useEffect(() => {
    if (!jwtToken) return;
    if (!convoId) {
      const newConvoId = uuid();
      const apiPath = `${
        import.meta.env.VITE_SALESFORCE_URL
      }/iamessage/api/v2/conversation`;

      fetch(apiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer " + jwtToken,
        },
        body: JSON.stringify({
          esDeveloperName: import.meta.env.VITE_SALESFORCE_DEV_NAME,
          conversationId: newConvoId,
          routingAttributes: {
            OrganizationId: "CC_AM_EN",
            _firstName: "jacob",
            _lastName: "jacobs",
            _email: "jjacobs@acme.com",
            Leadid: "00Q9O00000YSMurUAH",
            Language: "en_US",
          },
        }),
      }).then((response) => {
        if (response.ok) {
          console.log(
            `Successfully created a new conversation with conversation-id: ${newConvoId}`
          );
          setConversationStatus(
            CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION
          );
          setConvoId(newConvoId);
          localStorage.setItem("SALESFORCE_CONVO_ID", newConvoId);
        }
      });
    } else {
      const apiPath = `${
        import.meta.env.VITE_SALESFORCE_URL
      }/iamessage/api/v2/conversation/${convoId}/entries?limit=200&direction=FromStart&entryTypeFilter=${[
        "CloseConversation",
        "ParticipantChanged",
        "Message",
        "RoutingResult",
        "RoutingWorkResult",
        "SessionStatusChanged",
      ].join(",")}`;

      fetch(apiPath, {
        headers: {
          "Content-Type": "application/json",
          authorization: "Bearer " + jwtToken,
        },
      })
        .then((response) => {
          if (response.ok) {
            setConversationStatus(
              CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION
            );
            return response.json();
          } else {
            localStorage.removeItem("SALESFORCE_CONVO_ID");
            // localStorage.removeItem("SALESFORCE_JWT_TOKEN")
            throw Error;
          }
        })

        .then((data) => {
          setMessages((prev) => [
            ...data.conversationEntries
              .map((i) => {
                const eventData = parseEventData(
                  JSON.stringify({
                    conversationEntry: {
                      ...i,
                      entryPayload: JSON.stringify(i.entryPayload),
                    },
                  })
                );
                if (
                  i.entryType ==
                  CONVERSATION_CONSTANTS.EntryTypes.CONVERSATION_MESSAGE
                ) {
                  if (
                    eventData.messageType ===
                      CONVERSATION_CONSTANTS.MessageTypes
                        .STATIC_CONTENT_MESSAGE &&
                    eventData.content.staticContent?.formatType ===
                      CONVERSATION_CONSTANTS.FormatTypes.TEXT
                  ) {
                    console.log("adding to list");

                    return {
                      EVENT:
                        CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
                      DATA: eventData,
                    };
                  }
                }
                if (
                  i.entryType ==
                  CONVERSATION_CONSTANTS.EntryTypes.PARTICIPANT_CHANGED
                ) {
                  return {
                    EVENT:
                      CONVERSATION_CONSTANTS.EventTypes
                        .CONVERSATION_PARTICIPANT_CHANGED,
                    DATA: eventData,
                  };
                }
                if (
                  i.entryType ==
                  CONVERSATION_CONSTANTS.EntryTypes.SESSION_STATE_CHANGED
                ) {
                  setSessionStatus(eventData.content.sessionStatus);
                  return {
                    EVENT:
                      CONVERSATION_CONSTANTS.EventTypes
                        .CONVERSATION_SESSION_STATUS_CHANGED,
                    DATA: eventData,
                  };
                }
              })
              .filter((v) => v !== undefined),
            ...prev,
          ]);
        })
        .catch((e) => {
          // error in e.message
        });
    }
    subscribeToTunnel();
  }, [jwtToken]);

  const sendMessage = async () => {
    //orgfarm-904aba744f-dev-ed.develop.my.salesforce-scrt.com/iamessage/api/v2/conversation/fce0fd6a-1413-44c3-aa84-aaf5d2619ad5/entries?limit=50&entryTypeFilter=Message,ParticipantChanged,RoutingResult

    const val = prompt.trim();
    if (!val) return;
    sendTypingEvent("TypingStoppedIndicator");
    try {
      fetch(
        `${
          import.meta.env.VITE_SALESFORCE_URL
        }/iamessage/api/v2/conversation/${convoId}/message`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            authorization: "Bearer " + jwtToken,
          },
          body: JSON.stringify({
            message: {
              // inReplyToMessageId: "a133c185-73a7-4adf-b6d9-b7fd62babb4e",
              id: uuid(),
              messageType: "StaticContentMessage",
              staticContent: {
                formatType: "Text",
                text: val,
              },
            },
            esDeveloperName: import.meta.env.VITE_SALESFORCE_DEV_NAME,
            // isNewMessagingSession: false,
            // routingAttributes:
            //   '/**\nDescription\nInformation about the conversation captured from the pre-chat form that the end user completes. The attribute values can come from both visible and hidden fields in the pre-chat form, and the information comes in as string values. \n\nOmni Flow can send pre-chat form data to the messaging session for a more informed rep experience. See Map Pre-Chat Values in Omni-Channel Flow at https://help.salesforce.com/s/articleView?id=sf.miaw_map_messaging_2.htm for more information.\n\nRouting attributes are only sent when the end user starts a new session (isNewMessagingSession is true) and the pre-chat form has been configured to appear with every session. See [Customize Pre-Chat for Enhanced Chat at https://help.salesforce.com/s/articleView?id=sf.miaw_custom_prechat_2.htm for more information. \n\nWhen the end user starts a new session and sends a text message and a file, the routing attributes are sent with whichever conversation entry (the message or file) goes out first. For example, if the end user starts a new session and sends the file before the text message, the routing attributes are sent with the file.\n**/\n\nExample:\n\n{  \n  "_firstName": "jacob",\n  "_lastName": "jacobs",\n  "_email": "jjacobs@acme.com"\n}\n',
            // language: "",
          }),
        }
      )
        .then((response) => {
          if (response.ok) {
            console.log(
              `Successfully sent message to conversation-id: ${convoId}`
            );
          }
        })
        .then((data) => console.log(data));
    } catch (e) {
      //
    } finally {
      setPrompt("");
    }
  };

  const subscribeToTunnel = () => {
    const apiPathWithTimestamp = `${
      import.meta.env.VITE_SALESFORCE_URL
    }/eventrouter/v1/sse?ts=${Date.now()}`;
    const es = new EventSourcePolyfill(apiPathWithTimestamp, {
      headers: {
        Authorization: "Bearer " + jwtToken,
        "X-Org-ID": import.meta.env.VITE_SALESFORCE_ORG_ID,
        // "Last-Event-ID": getLastEventId(),
      },
      heartbeatTimeout: 90000,
    });

    es.onopen = (event) => {
      es.addEventListener(
        CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STARTED_INDICATOR,
        (e) => {
          const eventData = parseEventData(e.data);

          if (
            eventData.actorType !==
            CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
          ) {
            setIsAgentTyping(true);
          }
        }
      );
      es.addEventListener(
        CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_TYPING_STOPPED_INDICATOR,
        (e) => {
          const eventData = parseEventData(e.data);

          if (
            eventData.actorType !==
            CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
          ) {
            setIsAgentTyping(false);
          }
        }
      );
      es.addEventListener(
        CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
        (e) => {
          const eventData = parseEventData(e.data);

          if (
            eventData.messageType ===
              CONVERSATION_CONSTANTS.MessageTypes.STATIC_CONTENT_MESSAGE &&
            eventData.content.staticContent?.formatType ===
              CONVERSATION_CONSTANTS.FormatTypes.TEXT
          ) {
            console.log("adding to list");

            setMessages((prev) => [
              ...prev,
              {
                EVENT: CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_MESSAGE,
                DATA: eventData,
              },
            ]);
          }
        }
      );
      es.addEventListener(
        CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_PARTICIPANT_CHANGED,
        (e) => {
          const eventData = parseEventData(e.data);
          setMessages((prev) => [
            ...prev,
            {
              EVENT:
                CONVERSATION_CONSTANTS.EventTypes
                  .CONVERSATION_PARTICIPANT_CHANGED,
              DATA: eventData,
            },
          ]);
        }
      );
      es.addEventListener(
        CONVERSATION_CONSTANTS.EventTypes.CONVERSATION_SESSION_STATUS_CHANGED,
        (e) => {
          const eventData = parseEventData(e.data);
          setSessionStatus(eventData.content.sessionStatus);
          if (eventData.content.sessionStatus == "Ended") {
            setMessages((prev) => [
              ...prev,
              {
                EVENT:
                  CONVERSATION_CONSTANTS.EventTypes
                    .CONVERSATION_SESSION_STATUS_CHANGED,
                DATA: eventData,
              },
            ]);
          }
        }
      );
      console.log(event);
    };
  };

  return (
    <>
      <div style={{ height: "100vh" }}>
        <Container
          // header={<Header variant="h3">Chat</Header>}
          style={{ root: { borderWidth: "0px" } }}
          fitHeight
          disableContentPaddings
          footer={
            <PromptInput
              value={prompt}
              onChange={({ detail }) => handleInputChange(detail)}
              onAction={sendMessage}
              placeholder="Type a message"
              actionButtonIconName="send"
              ariaLabel="Chat input"
              disabled={sessionStatus === "Ended"}
            />
          }
        >
          <Box padding="m">
            <SpaceBetween size="s">
              <div ref={scrollDiv}>
                {prevMessages.map((message) => (
                  <SpaceBetween
                    key={message.id}
                    size="xs"
                    className="chat-message"
                    alignItems={
                      message.author === "assistant" ? "start" : "end"
                    }
                  >
                    <ChatBubble
                      avatar={
                        <ChatBubbleAvatar
                          loading={message.loading}
                          author={
                            message.author === "assistant"
                              ? "assistant"
                              : displayName || ""
                          }
                        />
                      }
                      ariaLabel={`message-${message.author}`}
                      type={
                        message.author === "assistant" ? "incoming" : "outgoing"
                      }
                    >
                      {message.loading ? <LoadingMessage /> : message.content}
                    </ChatBubble>
                  </SpaceBetween>
                ))}
                {[
                  ...messages,
                  ...(isAgentTyping
                    ? [
                        {
                          EVENT: "CUSTOM-IS-TYPING",
                          id: "loading-indicator",
                        },
                      ]
                    : []),
                ].map((msg) =>
                  msg.EVENT ===
                  CONVERSATION_CONSTANTS.EventTypes
                    .CONVERSATION_PARTICIPANT_CHANGED ? (
                    <SpaceBetween
                      key={msg.DATA.messageId}
                      size="xs"
                      alignItems={"center"}
                    >
                      <Box color="text-body-secondary">
                        {msg.DATA.content.entries.map((i) => (
                          <p>
                            <small>
                              {i.displayName} [{i.participant.role}] has{" "}
                              {i.operation == "add" ? "joined" : "left"} the
                              chat •{" "}
                              {timestampToDateString(
                                msg.DATA.transcriptedTimestamp
                              )}
                            </small>
                          </p>
                        ))}
                      </Box>
                    </SpaceBetween>
                  ) : msg.EVENT ===
                    CONVERSATION_CONSTANTS.EventTypes
                      .CONVERSATION_SESSION_STATUS_CHANGED ? (
                    msg.DATA.content.sessionStatus === "Ended" ? (
                      <SpaceBetween
                        key={msg.DATA.messageId}
                        size="xs"
                        alignItems={"center"}
                      >
                        <Box color="text-body-secondary">
                          <p>
                            <small>
                              {msg.DATA.content.sessionEndedByRole} has ended
                              the chat •{" "}
                              {timestampToDateString(
                                msg.DATA.transcriptedTimestamp
                              )}
                            </small>
                          </p>
                        </Box>
                      </SpaceBetween>
                    ) : (
                      ""
                    )
                  ) : (
                    <SpaceBetween
                      key={
                        msg.EVENT === "CUSTOM-IS-TYPING"
                          ? msg.id
                          : msg.DATA.messageId
                      }
                      size="xs"
                      className="chat-message"
                      alignItems={
                        msg.EVENT === "CUSTOM-IS-TYPING" ||
                        msg.DATA.actorType !==
                          CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
                          ? "start"
                          : "end"
                      }
                    >
                      <ChatBubble
                        avatar={
                          <ChatBubbleAvatar
                            author={
                              msg.EVENT === "CUSTOM-IS-TYPING"
                                ? CONVERSATION_CONSTANTS.ParticipantRoles.AGENT
                                : msg.DATA.actorType
                              // message.author === CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
                              //   ? displayName || ""
                              //   : "agent"
                            }
                            loading={msg.EVENT === "CUSTOM-IS-TYPING"}
                          />
                        }
                        ariaLabel={`message-${
                          msg.EVENT === "CUSTOM-IS-TYPING" ||
                          msg.DATA.actorType !==
                            CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
                            ? "assistant"
                            : "user"
                        }`}
                        type={
                          msg.EVENT === "CUSTOM-IS-TYPING" ||
                          msg.DATA.actorType !==
                            CONVERSATION_CONSTANTS.ParticipantRoles.ENDUSER
                            ? "outgoing"
                            : "incoming"
                        }
                      >
                        {msg.EVENT === "CUSTOM-IS-TYPING" ? (
                          <LoadingMessage />
                        ) : (
                          // JSON.stringify(msg)
                          msg.DATA.content.staticContent.text
                          // ''
                        )}
                      </ChatBubble>
                    </SpaceBetween>
                  )
                )}
              </div>
            </SpaceBetween>
          </Box>
        </Container>
      </div>
    </>
  );
}

export default SalesForceChat;

function ChatBubbleAvatar({
  loading,
  author,
}: {
  loading?: boolean;
  author: string;
}) {
  if (author === "assistant" || loading) {
    return (
      <Avatar
        color="gen-ai"
        iconName="gen-ai"
        loading={loading}
        tooltipText="Gen-AI"
        ariaLabel="Gen-AI"
      />
    );
  }

  const initials = author
    .trim()
    .split(" ")
    .map((i) => i[0])
    .join("")
    .toUpperCase();

  return <Avatar initials={initials} tooltipText={author} ariaLabel={author} />;
}

const LoadingMessage = () => (
  <Box color="text-status-inactive">
    <div style={{ display: "flex", gap: 7 }}>
      <DotLoader />
    </div>
  </Box>
);
