import {
  buildPlaceCatalogForAi,
  buildPreferencesPrompt,
  buildWeatherSummaryForAi,
} from "@/services/ai/context";
import { completeJsonWithLlm } from "@/services/ai/provider";
import type { AiProvider } from "@/services/ai/types";
import { runExecutionKernelOnItinerary } from "@/lib/executionKernel";
import type { RouteMatrixProfile } from "@/lib/routeMatrixPreference";
import {
  buildItineraryFromPlaceIds,
  generateExecutableItinerary,
} from "@/services/itineraryService";
import type { ExecutionProvider } from "@/lib/executionKernel/types";
import type { Itinerary, TripLodgingPlan, TripPreferences } from "@/types/travel";
import type { EngineContext } from "@/services/engines/engineContext";

const NARRATIVE_SYSTEM = `You are ODRÉ GANGWON travel copywriter for Gangwon regional zones.
Return ONLY JSON: { "explanation": string, "alternatives": string[] }.
Rules:
- Do NOT change place ids or invent new stops — narrative only.
- explanation and alternatives must be in Korean, concise and executable.
- Reflect weatherSummary and trip themes when provided.`;

const NARRATIVE_LLM_TIMEOUT_MS = 12_000;

interface ItineraryNarrative {
  explanation: string;
  alternatives: string[];
}

/** 규칙 엔진 + 실행 커널만 — LLM 대기 없음 (5~8초 UI용 빠른 경로) */
export async function generateItineraryDeterministic(
  preferences: TripPreferences,
  options?: {
    anchorPlaceId?: string | null;
    orderedPlaceIds?: string[] | null;
    preserveOrder?: boolean;
    engineContext?: EngineContext;
    lodgingPlan?: TripLodgingPlan;
  },
): Promise<{ itinerary: Itinerary; provider: ExecutionProvider }> {
  const anchorPlaceId = options?.anchorPlaceId ?? null;
  const routeProfile: RouteMatrixProfile = "fast";
  /** Fast path: weather is enriched async in narrative/care — avoids 12s+ API wait */
  const weatherSummary: string | null = null;

  if (options?.orderedPlaceIds && options.orderedPlaceIds.length > 0) {
    const itinerary = await buildItineraryFromPlaceIds(
      options.orderedPlaceIds,
      preferences,
      undefined,
      options.engineContext,
      weatherSummary,
      {
        preserveOrder: options.preserveOrder ?? true,
        anchorPlaceId,
        routeProfile,
      },
    );
    return runExecutionKernelOnItinerary(itinerary, preferences, {
      selectionSource: "llm",
      llmProvider: "rules",
      weatherSummary,
    });
  }

  const rulesItinerary = await generateExecutableItinerary(
    preferences,
    anchorPlaceId,
    options?.engineContext,
    {
      routeProfile,
      lodgingPlan: options?.lodgingPlan ?? options?.engineContext?.lodgingPlan,
    },
  );
  return runExecutionKernelOnItinerary(rulesItinerary, preferences, {
    selectionSource: "rules",
    llmProvider: "rules",
    weatherSummary,
  });
}

/** 비동기 LLM 서술 보강 — 정류장·동선은 변경하지 않음 */
export async function enrichItineraryNarrative(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options?: { anchorPlaceId?: string | null },
): Promise<{
  itinerary: Itinerary;
  provider: AiProvider;
  enriched: boolean;
}> {
  const orderedPlaceIds = itinerary.stops.map((stop) => stop.placeId);
  let explanation = itinerary.aiExplanation;
  let alternatives = itinerary.alternatives;
  let llmProvider: AiProvider = "rules";
  let enriched = false;

  if (orderedPlaceIds.length === 0) {
    return { itinerary, provider: llmProvider, enriched: false };
  }

  try {
    const catalog = buildPlaceCatalogForAi(preferences.zoneId);
    const weatherSummary = await buildWeatherSummaryForAi();
    const prompt = buildPreferencesPrompt({
      preferences,
      anchorPlaceId: options?.anchorPlaceId ?? null,
      weatherSummary,
    });

    const llm = await Promise.race([
      completeJsonWithLlm<ItineraryNarrative>({
        system: NARRATIVE_SYSTEM,
        user: JSON.stringify({
          ...prompt,
          selectedPlaces: orderedPlaceIds.map((id) => {
            const item = catalog.find((entry) => entry.id === id);
            return { id, name: item?.name ?? id };
          }),
        }),
      }),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), NARRATIVE_LLM_TIMEOUT_MS);
      }),
    ]);

    if (llm?.data.explanation) {
      explanation = llm.data.explanation;
      alternatives = llm.data.alternatives?.length ? llm.data.alternatives : alternatives;
      llmProvider = llm.provider;
      enriched = true;
    }
  } catch {
    /* keep rules narrative */
  }

  const provider: ExecutionProvider =
    llmProvider === "rules" ? "rules" : llmProvider === "openai" ? "ai+verified" : "ai+verified";

  return {
    itinerary: {
      ...itinerary,
      aiExplanation: explanation,
      alternatives,
    },
    provider,
    enriched,
  };
}

/** @deprecated Prefer generateItineraryDeterministic + enrichItineraryNarrative */
export async function generateItineraryWithAi(
  preferences: TripPreferences,
  options?: {
    anchorPlaceId?: string | null;
    orderedPlaceIds?: string[] | null;
    preserveOrder?: boolean;
  },
): Promise<{ itinerary: Itinerary; provider: ExecutionProvider }> {
  const { itinerary, provider } = await generateItineraryDeterministic(preferences, options);
  const enriched = await enrichItineraryNarrative(itinerary, preferences, {
    anchorPlaceId: options?.anchorPlaceId ?? null,
  });
  return { itinerary: enriched.itinerary, provider: enriched.provider };
}
