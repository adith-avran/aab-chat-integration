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

type Message = {
  id: string;
  timestamp: number;
  author: "user" | "agent";
  content: string;
  loading?: boolean;
  sentMessage?: boolean;
};

function SalesForceChat({
  prevMessages,
}: {
  prevMessages: LLMessage[];
}): JSX.Element {
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState("");
  const { displayName } = useContext(AppContext);
  const [jwtToken, setJwtToken] = useState<string>(null);
  const [conversationStatus, setConversationStatus] = useState<string>(
    CONVERSATION_CONSTANTS.ConversationStatus.NOT_STARTED_CONVERSATION
  );

  let [failedMessage, setFailedMessage] = useState(undefined);

  let [currentTypingParticipants, setCurrentTypingParticipants] = useState({});
  let [isAnotherParticipantTyping, setIsAnotherParticipantTyping] =
    useState(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const isTypingRef = useRef(false);
  const [convoId, setConvoId] = useState(uuid());

  const sendTypingEvent = async (
    type: "TypingStartedIndicator" | "TypingStoppedIndicator"
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
      sendTypingEvent("TypingStartedIndicator");
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        sendTypingEvent("TypingStoppedIndicator");
      }
    }, 800);
  };

  const generateJWT = () => {
    fetch(
      `${
        import.meta.env.VITE_SALESFORCE_URL
      }/iamessage/api/v2/authorization/unauthenticated/access-token`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orgId: import.meta.env.VITE_SALESFORCE_ORG_ID,
          esDeveloperName: import.meta.env.VITE_SALESFORCE_DEV_NAME,
          capabilitiesVersion: "1",
          platform: "Web",
        }),
      }
    )
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        setJwtToken(data.accessToken);
      })
      .catch((e) => {
        // error in e.message
      });
  };

  useEffect(() => {
    generateJWT();
  }, []);

  useEffect(() => {
    if (!jwtToken) return;
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
        conversationId: convoId,
      }),
    }).then((response) => {
      if (response.ok) {
        console.log(
          `Successfully created a new conversation with conversation-id: ${convoId}`
        );
        setConversationStatus(
          CONVERSATION_CONSTANTS.ConversationStatus.OPENED_CONVERSATION
        );
      }
    });
    subscribeToTunnel();
  }, [jwtToken]);

  const sendMessage = async () => {
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
      // const data = JSON.parse(event.data);
      es.addEventListener("CONVERSATION_MESSAGE", (e) => {
        const data = JSON.parse(e.data);
        console.log(data);

        if (data.conversationEntry.entryType == "Message") {
          const entryData = JSON.parse(data.conversationEntry.entryPayload);
          console.log(entryData);

          if (
            entryData?.abstractMessage?.staticContent?.formatType === "Text"
          ) {
            const msgContent = entryData.abstractMessage.staticContent.text;
            console.log("MESSAGE");
            setMessages((prev) => [
              ...prev,
              {
                id: entryData.abstractMessage.id,
                timestamp: data.conversationEntry.clientTimestamp,
                author: "user",
                content: msgContent,
                sentMessage: true,
              },
            ]);
          }
        }
      });
      console.log(event);
    };
  };

  return (
    <>
      <div style={{ height: "100vh" }}>
        <Container
          header={<Header variant="h3">Chat</Header>}
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
            />
          }
        >
          <Box padding="m">
            <SpaceBetween size="s">
              {prevMessages.map((message) => (
                <SpaceBetween
                  key={message.id}
                  size="xs"
                  className="chat-message"
                  alignItems={message.author === "assistant" ? "start" : "end"}
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
              {messages.map((message) => (
                <SpaceBetween
                  key={message.id}
                  size="xs"
                  className="chat-message"
                  alignItems={message.author === "agent" ? "start" : "end"}
                >
                  <ChatBubble
                    avatar={
                      <ChatBubbleAvatar
                        loading={message.loading}
                        author={
                          message.author === "agent"
                            ? "agent"
                            : displayName || ""
                        }
                      />
                    }
                    ariaLabel={`message-${message.author}`}
                    type={message.author === "agent" ? "incoming" : "outgoing"}
                  >
                    {message.loading ? <LoadingMessage /> : message.content}
                  </ChatBubble>
                </SpaceBetween>
              ))}
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
  if (author === "assistant") {
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
      Generating a response
      <DotLoader />
    </div>
  </Box>
);
