import { useState, useContext } from "react";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import PromptInput from "@cloudscape-design/components/prompt-input";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { Avatar, ChatBubble } from "@cloudscape-design/chat-components";
import { DotLoader } from "./assets/DotLoader";
import { AppContext } from "./App";
import { v4 as uuid } from "uuid";
import SalesForceChat from "./SalesForceChat";

export type LLMessage = {
  id: string;
  timestamp: number;
  author: "user" | "assistant";
  content: string;
  loading?: boolean;
  sentMessage?: boolean;
};

export default function ChatInterface(): JSX.Element {
  const [messages, setMessages] = useState<LLMessage[]>([]);
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { displayName } = useContext(AppContext);
  const [transferToSalesForce, setTransferToSalesForce] =
    useState<boolean>(false);

  const sendMessage = async (): Promise<void> => {
    const trimmed = prompt.trim();
    if (!trimmed || isProcessing) return;

    const userMessageId = uuid();
    const assistantMessageId = uuid();

    setPrompt("");
    setIsProcessing(true);

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.success) throw new Error("API returned failure");

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                loading: false,
                content:
                  data.data?.message ??
                  "Something went wrong. Please try again.",
              }
            : msg
        )
      );

      if (data.data?.intent === "RouteToAgent") {
        setTransferToSalesForce(true);
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
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  return transferToSalesForce ? (
    <SalesForceChat prevMessages={messages} />
  ) : (
    <div style={{ height: "100vh" }}>
      <Container
        header={<Header variant="h3">Chat</Header>}
        style={{ root: { borderWidth: "0px" } }}
        fitHeight
        disableContentPaddings
        footer={
          <PromptInput
            value={prompt}
            onChange={({ detail }) => setPrompt(detail.value)}
            onAction={sendMessage}
            placeholder="Type a message"
            actionButtonIconName="send"
            ariaLabel="Chat input"
            disabled={isProcessing}
          />
        }
      >
        <Box padding="m">
          <SpaceBetween size="s">
            {messages.map((message) => (
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
          </SpaceBetween>
        </Box>
      </Container>
    </div>
  );
}

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
