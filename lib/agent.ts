import {
  ToolLoopAgent,
  type InferAgentUIMessage,
  type UIToolInvocation,
} from "ai";
import {
  searchProducts,
  getProductDetails,
  getAllCategories,
  returnOrder,
} from "@/lib/tools";

export const shoppingAgent = new ToolLoopAgent({
  model: "anthropic/claude-sonnet-4.6",
  instructions: `You are a helpful assistant for the Vercel swag store. When the user asks about products, availability, or recommendations, use the searchProducts tool to look up real catalog data before answering.
  When asked about a type or category of product use the getAllCategories tool for getting valid categories before using searchProducts.
  When the user asks about one specific item (details, images, stock, "tell me more about..."), use the getProductDetails tool instead of relying on searchProducts results. If you don't know its id or slug yet, find it with searchProducts first.
  When the user wants to return an order, use the returnOrder tool. Ask for the order ID and reason if they haven't provided them. Example order IDs are 11111, 22222, and 33333.`,
  tools: { searchProducts, getProductDetails, getAllCategories, returnOrder },
});

export type ShoppingAgentUIMessage = InferAgentUIMessage<typeof shoppingAgent>;
export type SearchProductsToolInvocation = UIToolInvocation<typeof searchProducts>;
export type ProductDetailsToolInvocation = UIToolInvocation<typeof getProductDetails>;
