import { validatePlaceSelection } from "@/lib/executionKernel/validateSelection";
import {
  attachFeasibilityToItinerary,
  resolveExecutionProvider,
  verifyItineraryFeasibility,
} from "@/lib/executionKernel/verifyItinerary";
import type {
  BuildItineraryKernelInput,
  BuildItineraryKernelResult,
  ExecutionSignals,
} from "@/lib/executionKernel/types";
import { buildWeatherSummaryForAi } from "@/services/ai/context";
import {
  buildExecutionStateSnapshot,
  enrichPlaceIdsWithDataLab,
  verifyDataLabFeasibility,
} from "@/services/executionStateService";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import {
  buildItineraryFromPlaceIds,
  generateExecutableItinerary,
} from "@/services/itineraryService";
import {
  getKakaoRestApiKey,
  getTourApiServiceKey,
  getWeatherApiServiceKey,
} from "@/lib/serverEnv";
import type { Itinerary, TripPreferences } from "@/types/travel";
import type { EngineContext } from "@/services/engines/engineContext";

async function resolveExecutionSignals(
  preferences: TripPreferences,
  weatherSummary: string | null,
  routingSource?: ExecutionSignals["routingSource"],
  dataLab?: Awaited<ReturnType<typeof buildExecutionStateSnapshot>>["dataLab"],
): Promise<ExecutionSignals> {
  const rainy = Boolean(
    weatherSummary && /비|눈|소나기|강수|뇌우|호우|우박/.test(weatherSummary),
  );
  const tour = Boolean(getTourApiServiceKey());
  const weather = Boolean(getWeatherApiServiceKey());
  const kakao = Boolean(getKakaoRestApiKey());
  const lab = dataLab ?? (await buildExecutionStateSnapshot(preferences)).dataLab;
  const live = (tour && weather && lab.active) || lab.source === "live";

  return {
    weatherSummary,
    weatherIndoorShift: rainy,
    routingSource: routingSource ?? "haversine",
    dataMode: live ? "live" : "demo",
    tourApiConfigured: tour,
    kakaoRestConfigured: kakao,
    dataLabActive: lab.active,
    dataLabSource: lab.source,
    dataLabZoneDemandScore: lab.zoneDemandScore,
  };
}

export async function runExecutionKernelOnItinerary(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options: {
    selectionSource: BuildItineraryKernelInput["selectionSource"];
    llmProvider?: BuildItineraryKernelInput["llmProvider"];
    weatherSummary?: string | null;
    selectionWarnings?: string[];
    engineContext?: EngineContext;
  },
): Promise<BuildItineraryKernelResult> {
  const weatherSummary =
    options.weatherSummary !== undefined
      ? options.weatherSummary
      : ((await buildWeatherSummaryForAi()) ?? null);
  const executionState = await buildExecutionStateSnapshot(
    preferences,
    itinerary.stops.map((stop) => stop.placeId),
  );
  const signals = await resolveExecutionSignals(
    preferences,
    weatherSummary,
    itinerary.routingSource,
    executionState.dataLab,
  );

  const selectionWarnings = [
    ...(options.selectionWarnings ?? []),
    ...executionState.selectionNotes,
  ];
  const feasibilityIssues = [
    ...verifyItineraryFeasibility(itinerary, preferences, {
      weatherSummary,
      routingSource: signals.routingSource,
      selectionWarnings,
    }),
    ...verifyDataLabFeasibility(itinerary, preferences, executionState.dataLab),
  ];

  const baseProvider =
    options.llmProvider ?? (options.selectionSource === "llm" ? "gemini" : "rules");
  const provider = resolveExecutionProvider(
    options.selectionSource === "rules" ? "rules" : baseProvider,
    feasibilityIssues,
  );

  const finalized = attachFeasibilityToItinerary(itinerary, feasibilityIssues, signals);
  return { itinerary: finalized, provider, feasibilityIssues, signals };
}

export async function buildItineraryWithExecutionKernel(
  input: BuildItineraryKernelInput,
): Promise<BuildItineraryKernelResult> {
  const preferences = input.preferences;
  const context =
    input.engineContext ??
    buildEngineContextFromTripStore({
      preferences,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: input.anchorPlaceId ?? null,
    });

  const weatherSummary =
    input.weatherSummary !== undefined
      ? input.weatherSummary
      : ((await buildWeatherSummaryForAi()) ?? null);

  let selectionWarnings: string[] = [];
  let itinerary: Itinerary;
  const seedIds = input.orderedPlaceIds ?? [];
  const executionState = await buildExecutionStateSnapshot(preferences, seedIds);

  if (input.orderedPlaceIds && input.orderedPlaceIds.length > 0) {
    const validated = validatePlaceSelection(input.orderedPlaceIds, preferences, {
      anchorPlaceId: input.anchorPlaceId,
      weatherSummary,
    });
    selectionWarnings = [
      ...validated.warnings,
      ...executionState.selectionNotes,
    ];
    if (validated.removedIds.length > 0) {
      selectionWarnings.push(
        `조건에 맞지 않아 ${validated.removedIds.length}곳을 제외했습니다.`,
      );
    }

    const enriched = enrichPlaceIdsWithDataLab(
      validated.placeIds,
      preferences,
      executionState.relatedCatalogIds,
      { maxAdds: input.preserveOrder ? 0 : 2 },
    );
    selectionWarnings.push(...enriched.notes);

    itinerary = await buildItineraryFromPlaceIds(
      enriched.placeIds,
      preferences,
      input.aiMeta,
      context,
      weatherSummary,
      {
        preserveOrder: input.preserveOrder ?? true,
        anchorPlaceId: input.anchorPlaceId,
        routeProfile: input.routeProfile ?? "fast",
      },
    );
  } else {
    itinerary = await generateExecutableItinerary(
      preferences,
      input.anchorPlaceId,
      context,
      { routeProfile: input.routeProfile ?? "fast" },
    );
  }

  return runExecutionKernelOnItinerary(itinerary, preferences, {
    selectionSource: input.selectionSource,
    llmProvider: input.llmProvider,
    weatherSummary,
    selectionWarnings,
    engineContext: context,
  });
}
