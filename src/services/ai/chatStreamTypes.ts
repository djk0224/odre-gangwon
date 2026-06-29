import type { AiChatResponse } from "@/services/ai/types";

export type AiChatStreamEvent =
  | { type: "status"; message: string }
  | { type: "tool"; tool: string; ok: boolean; summary: string }
  | {
      type: "partial";
      blocks: Partial<AiChatResponse["blocks"]>;
      placeIds?: string[];
    }
  | { type: "done"; result: AiChatResponse };
