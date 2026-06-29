import type { AiChatDisplayBlocks } from "@/services/ai/types";
import type { AiChatMessage } from "@/services/ai/types";

export function serializeBlocksForHistory(blocks: AiChatDisplayBlocks): string {
  const parts: string[] = [];
  if (blocks.headline) parts.push(blocks.headline);
  for (const day of blocks.days) {
    parts.push(`${day.label}: ${day.items.join(" / ")}`);
  }
  if (blocks.tips.length > 0) {
    parts.push(`팁: ${blocks.tips.join(" · ")}`);
  }
  return parts.join("\n");
}

type HistoryRow =
  | { role: "user"; content: string }
  | { role: "assistant"; blocks: AiChatDisplayBlocks };

/** UI 대화 로그 → LLM에 넘길 user/assistant 메시지 (환영 메시지 제외) */
export function buildChatHistoryFromRows(rows: HistoryRow[]): AiChatMessage[] {
  return rows
    .filter((row, index) => !(row.role === "assistant" && index === 0))
    .map((row) =>
      row.role === "user"
        ? { role: "user", content: row.content }
        : { role: "assistant", content: serializeBlocksForHistory(row.blocks) },
    );
}
