import {
  Box,
  Button,
  Container,
  Header,
  Icon,
  PromptInput,
  SpaceBetween,
  Textarea,
  TextContent,
} from "@cloudscape-design/components";
import React, { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

import { DotLoader } from "./assets/DotLoader";
import { ChatBubble, Avatar } from "@cloudscape-design/chat-components";
import "./Chat.css";
import { useRef } from "react";

export type LLMessage = {
  id: string;
  timestamp: number;
  author: "user" | "assistant";
  content: string;
  loading?: boolean;
  sentMessage?: boolean;
};

function Chat() {
  const [value, setValue] = useState("");
  const scrollDiv = useRef<null | HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState<LLMessage[]>([
    // {
    //   id: "123123123123123",
    //   timestamp: Date.now(),
    //   author: "user",
    //   content: "hello",
    //   sentMessage: true,
    // },
    // {
    //   id: "123123123123123123",
    //   timestamp: Date.now(),
    //   author: "assistant",
    //   content: "hello",
    //   sentMessage: true,
    // },
  ]);
  const [loading, setLoading] = useState(false);
  async function onMessage(e) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || loading) return;

    const userMessageId = uuid();
    const assistantMessageId = uuid();

    setValue("");
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
      const res = await fetch(
        "https://s64v5a6hs0.execute-api.eu-west-1.amazonaws.com/Dev/agent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            usecase: "classify",
            prompt: trimmed,
            ...(sessionId != null && { session_id: sessionId }),
          }),
        },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.statusCode !== 200) throw new Error("API returned failure");

      const message_id = data.body.message_id;
      const session_id = data.body.session_id;
      setSessionId(session_id);
      // setMessages((prev) =>
      //   prev.map((msg) =>
      //     msg.id === assistantMessageId
      //       ? {
      //           ...msg,
      //           loading: false,
      //           content:
      //             data.body.response ??
      //             "Something went wrong. Please try again.",
      //         }
      //       : msg,
      //   ),
      // );

      if (
        ["Business", "Non-business"].includes(
          JSON.parse(data.body.response)["label"],
        )
      ) {
        const req2ID = uuid();
        // setMessages((prev) => [
        //   ...prev,
        //   {
        //     id: req2ID,
        //     timestamp: Date.now(),
        //     author: "assistant",
        //     content: "",
        //     loading: true,
        //   },
        // ]);
        const res = await fetch(
          "https://s64v5a6hs0.execute-api.eu-west-1.amazonaws.com/Dev/agent",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              usecase: "query",
              prompt: trimmed,
              message_id: message_id,
              ...(session_id != null && { session_id: session_id }),
            }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data?.statusCode !== 200) throw new Error("API returned failure");
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  loading: false,
                  content:
                    data.body.response ??
                    "Something went wrong. Please try again.",
                }
              : msg,
          ),
        );
        // setMessages((prev) =>
        //   prev.map((msg) =>
        //     msg.id === req2ID
        //       ? {
        //           ...msg,
        //           loading: false,
        //           content:
        //             data.body.response ??
        //             "Something went wrong. Please try again.",
        //         }
        //       : msg,
        //   ),
        // );
      }
    } catch (err) {
      console.error("Message send failed:", err);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === assistantMessageId) {
            return {
              ...msg,
              loading: false,
              content: "Message failed to send. Please try again.",
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

  const handleNewChat = () => {
    setValue("");
    setSessionId(null);
    setMessages([]);
  };

  useEffect(() => {
    if (!scrollDiv.current) return;
    scrollDiv.current.scrollIntoView(false);
  }, [messages]);

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
            disableContentPaddings
            footer={
              <SpaceBetween size="s">
                <PromptInput
                  value={value}
                  onChange={({ detail }) => setValue(detail.value)}
                  onAction={onMessage}
                  placeholder="Type a message"
                  actionButtonIconName="send"
                  ariaLabel="Chat input"
                  disabled={loading}
                  maxRows={8}
                  minRows={3}
                />
                {/* <div style={{ textAlign: "right" }}>
                  <Button onClick={handleNewChat}>Start New Chat</Button>
                </div> */}
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
                        gap: 10,
                      }}
                    >
                      {messages.map((message) => (
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
                              <ChatBubbleAvatar author={message.author} />
                            }
                            ariaLabel={`message-${message.author}`}
                            
                            type={
                              message.author === "assistant"
                                ? "incoming"
                                : "outgoing"
                            }
                          >
                            {message.loading ? (
                              <LoadingMessage />
                            ) : (
                              message.content
                            )}{" "}
                          </ChatBubble>
                        </SpaceBetween>
                      ))}
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

function ChatBubbleAvatar({ loading, author }) {
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

export default Chat;
