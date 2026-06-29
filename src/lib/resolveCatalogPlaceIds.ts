import type { AiChatDisplayBlocks } from "@/services/ai/types";

type CatalogEntry = { id: string; name: string };

function normalizeName(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

/** 일정 문장·LLM id 목록에서 카탈로그 place id 추출 */
export function resolveSuggestedPlaceIds(
  catalog: CatalogEntry[],
  blocks: AiChatDisplayBlocks,
  llmIds: string[],
  validIds: Set<string>,
): string[] {
  const resolved = new Set<string>();

  for (const id of llmIds) {
    if (validIds.has(id)) resolved.add(id);
  }

  const corpus = [
    blocks.headline,
    ...blocks.days.flatMap((day) => day.items),
    ...blocks.tips,
  ].join(" ");

  for (const place of catalog) {
    if (corpus.includes(place.name)) {
      resolved.add(place.id);
    }
    const compact = normalizeName(place.name);
    if (compact.length >= 3 && normalizeName(corpus).includes(compact)) {
      resolved.add(place.id);
    }
  }

  return [...resolved].slice(0, 6);
}
