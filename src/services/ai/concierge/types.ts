import type { AiChatAction, AiChatSource, AiChatSourceKind, AiProvider } from "@/services/ai/types";

export type ConciergeToolName =
  | "rag_search"
  | "search_places"
  | "search_local_commerce"
  | "search_stays"
  | "get_weather"
  | "get_nature_road"
  | "get_transit_arrivals"
  | "get_trip_context"
  | "get_crowd"
  | "get_care"
  | "get_datalab"
  | "open_reservation";

export interface RagChunk {
  id: string;
  source: "catalog" | "nature-road" | "restaurant" | "commerce" | "faq";
  title: string;
  text: string;
  placeId?: string;
  courseId?: number;
}

export interface ConciergeToolResult {
  tool: ConciergeToolName;
  ok: boolean;
  summary: string;
  lines: string[];
  placeIds?: string[];
  actions?: AiChatAction[];
  sources: Array<{ id: string; label: string; kind: AiChatSourceKind }>;
}

export interface ConciergeTurnResult {
  blocks: {
    headline: string;
    days: [];
    tips: string[];
    sources?: AiChatSource[];
    actions?: AiChatAction[];
  };
  suggestedPlaceIds: string[];
  toolCalls: ConciergeToolName[];
  provider: AiProvider;
}
