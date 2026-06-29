import { buildPlaceCatalogForAi } from "@/services/ai/context";
import { completeJsonWithLlm } from "@/services/ai/provider";
import type { EngineContext } from "@/services/engines/engineContext";
import { rerankPlaceIdsAsync } from "@/services/engines/personalizationRanker";
import type { AiPlaceSearchResult, AiProvider } from "@/services/ai/types";
import type { TripPreferences } from "@/types/travel";

const SEARCH_SYSTEM = `You are ODRÉ GANGWON place search. User writes natural Korean queries.
Return ONLY JSON: { "placeIds": string[], "summary": string }.
Pick up to 8 places from catalog only. summary in Korean explains why these match.`;

function keywordFallback(
  query: string,
  catalog: ReturnType<typeof buildPlaceCatalogForAi>,
): AiPlaceSearchResult {
  const keyword = query.trim().toLowerCase();
  const matched = catalog
    .filter(
      (place) =>
        place.name.toLowerCase().includes(keyword) ||
        place.description.toLowerCase().includes(keyword) ||
        place.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    )
    .slice(0, 12)
    .map((place) => place.id);

  return {
    placeIds: matched,
    summary: matched.length > 0 ? `「${query}」와 맞는 장소 ${matched.length}곳` : "검색 결과가 없습니다.",
    provider: "rules",
  };
}

export async function searchPlacesWithAi(
  query: string,
  preferences?: TripPreferences,
  engineContext?: EngineContext,
): Promise<AiPlaceSearchResult> {
  const catalog = buildPlaceCatalogForAi(preferences?.zoneId);
  const trimmed = query.trim();
  if (!trimmed) {
    return { placeIds: [], summary: "검색어를 입력해 주세요.", provider: "rules" };
  }

  try {
    const llm = await completeJsonWithLlm<{ placeIds: string[]; summary: string }>({
      system: SEARCH_SYSTEM,
      user: JSON.stringify({
        query: trimmed,
        preferences,
        catalog,
      }),
    });
    if (llm?.data.placeIds?.length) {
      const valid = new Set(catalog.map((p) => p.id));
      const filtered = llm.data.placeIds.filter((id) => valid.has(id)).slice(0, 12);
      const placeIds = engineContext
        ? await rerankPlaceIdsAsync(filtered, engineContext, { limit: 12 })
        : filtered;
      return {
        placeIds,
        summary: llm.data.summary || "AI가 조건에 맞는 장소를 골랐습니다.",
        provider: llm.provider,
      };
    }
  } catch {
    /* fallback */
  }

  const fallback = keywordFallback(trimmed, catalog);
  if (engineContext && fallback.placeIds.length > 0) {
    return {
      ...fallback,
      placeIds: await rerankPlaceIdsAsync(fallback.placeIds, engineContext, { limit: 12 }),
    };
  }
  return fallback;
}
