import { chatFlow } from "@/lib/workflows/chat-flow";
import type { UIMessage } from "ai";
import { createUIMessageStreamResponse } from "ai";
import { start } from "workflow/api";

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const run = await start(chatFlow, [messages]);
  return createUIMessageStreamResponse({
    stream: run.readable,
    headers: {
      "x-workflow-run-id": run.runId,
    },
  });
}
