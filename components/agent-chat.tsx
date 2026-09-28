"use client";

import { useChat } from "@ai-sdk/react";
import { WorkflowChatTransport } from "@workflow/ai";
import { lastAssistantMessageIsCompleteWithToolCalls } from "ai";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import type { ShoppingAgentUIMessage } from "@/lib/agent";
import { AgentProductCard } from "./agent-product-card";
import { AgentProductList } from "./agent-product-list";

// Guards against a model-supplied slug becoming an arbitrary URL.
const SLUG_RE = /^[a-z0-9-]+$/;

export function AgentChat() {
  const [input, setInput] = useState("");
  const router = useRouter();

  const activeRunId = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return localStorage.getItem("active-workflow-run-id") ?? undefined;
  }, []);

  const { messages, error, sendMessage, addToolOutput } = useChat<ShoppingAgentUIMessage>({
    resume: Boolean(activeRunId),
    transport: new WorkflowChatTransport({
      api: "/api/chat",
      onChatSendMessage: (response) => {
        const runId = response.headers.get("x-workflow-run-id");
        if (runId) localStorage.setItem("active-workflow-run-id", runId);
      },
      onChatEnd: () => localStorage.removeItem("active-workflow-run-id"),
      prepareReconnectToStreamRequest: ({ api, ...rest }) => {
        const runId = localStorage.getItem("active-workflow-run-id");
        if (!runId) throw new Error("No active workflow run ID found");
        return { ...rest, api: `/api/chat/${encodeURIComponent(runId)}/stream` };
      },
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    async onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      if (toolCall.toolName === "showProduct") {
        const { slug, name } = toolCall.input;
        if (!SLUG_RE.test(slug)) {
          addToolOutput({
            tool: "showProduct",
            toolCallId: toolCall.toolCallId,
            state: "output-error",
            errorText: `"${slug}" is not a valid product slug.`,
          });
          return;
        }
        router.push(`/products/${slug}`);
        // No await - avoids potential deadlocks.
        addToolOutput({
          tool: "showProduct",
          toolCallId: toolCall.toolCallId,
          output: { slug, name, navigated: true },
        });
      }
    },
  });

  const handleSubmit = (message: PromptInputMessage) => {
    sendMessage({ text: input });
    setInput("");
  };

  if (error) return <div>{error.message}</div>;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="flex-1">
        <ConversationContent>
          {messages.map((m) =>
            m.parts.map((p, i) => {
              switch (p.type) {
                case "text":
                  return (
                    <Message key={`${m.id}-${i}`} from={m.role}>
                      <MessageContent>
                        <MessageResponse>{p.text}</MessageResponse>
                      </MessageContent>
                    </Message>
                  );
                case "tool-searchProducts":
                  return (
                    <AgentProductList key={`${m.id}-${i}`} invocation={p} />
                  );
                case "tool-getProductDetails":
                  return (
                    <AgentProductCard key={`${m.id}-${i}`} invocation={p} />
                  );
                case "tool-showProduct": {
                  const name = p.input?.name ?? p.input?.slug;
                  switch (p.state) {
                    case "input-streaming":
                    case "input-available":
                      return (
                        <div
                          key={`${m.id}-${i}`}
                          className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
                        >
                          Opening{name ? ` ${name}` : ""}…
                        </div>
                      );
                    case "output-available":
                      return (
                        <div
                          key={`${m.id}-${i}`}
                          className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground"
                        >
                          Opened {p.output.name}
                        </div>
                      );
                    case "output-error":
                      return (
                        <div
                          key={`${m.id}-${i}`}
                          className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
                        >
                          {p.errorText}
                        </div>
                      );
                    default:
                      return null;
                  }
                }
                default:
                  return null;
              }
            }),
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t p-3">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
              placeholder="Ask the agent"
            />
          </PromptInputBody>
          <PromptInputFooter>
            <PromptInputTools />
            <PromptInputSubmit status="ready" disabled={!input.trim()} />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </div>
  );
}
