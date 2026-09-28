import { DurableAgent } from "@workflow/ai/agent";
import { getWritable } from "workflow";
import {
  convertToModelMessages,
  type UIMessage,
  type UIMessageChunk,
} from "ai";
import {
  searchProducts,
  getAllCategories,
  returnOrder,
  getProductDetails,
  showProduct,
} from "@/lib/tools";

export async function chatFlow(messages: UIMessage[]) {
  "use workflow";
  const modelMessages = await convertToModelMessages(messages);

  const agent = new DurableAgent({
    model: "anthropic/claude-sonnet-4.6",
    instructions: `You are a helpful assistant for the Vercel swag store.
    When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
    When asked about a type or category of product use the getAllCategories tool for getting valid categories before using searchProducts
    When asked for details about a specific product use the getProductDetails tool to retrieve all information
    When the user explicitly asks to see, view, or be taken to one specific product (e.g. "show me the black hoodie", "take me to the desk mat"), use the showProduct tool with the real slug from a previous searchProducts or getProductDetails result to navigate there. Don't use showProduct for plain browsing or informational questions ("do you have hats?", "tell me about the mug") — use searchProducts or getProductDetails for those instead.
    When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
    tools: { searchProducts, getAllCategories, returnOrder, getProductDetails, showProduct },
  });

  await agent.stream({
    messages: modelMessages,
    writable: getWritable<UIMessageChunk>(),
  });
}
