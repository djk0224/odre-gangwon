/**
 * Browser-only fallback when /api/ai/itinerary is unavailable.
 * Must not import itineraryService or execution kernel (no serverEnv / Kakao REST graph).
 */
import {
  buildFastItineraryClient,
  buildFastItineraryFromPreferencesClient,
} from "@/lib/clientItinerary/buildFastItinerary";
import type { EngineContext } from "@/services/engines/engineContext";
import type { ExecutionProvider } from "@/lib/executionKernel/types";
import { attachLodgingToItinerary } from "@/lib/lodgingItineraryLegs";
import { isLodgingPlanActive } from "@/lib/tripLodgingPlan";
import type { Itinerary, TripPreferences } from "@/types/travel";

export async function buildItineraryClientFallback(input: {
  preferences: TripPreferences;
  anchorPlaceId?: string | null;
  orderedPlaceIds?: string[] | null;
  preserveOrder?: boolean;
  engineContext?: EngineContext;
}): Promise<{ itinerary: Itinerary; provider: ExecutionProvider }> {
  const lodgingPlan =
    input.engineContext?.lodgingPlan && isLodgingPlanActive(input.engineContext.lodgingPlan)
      ? input.engineContext.lodgingPlan
      : undefined;

  const wrap = (result: { itinerary: Itinerary; provider: ExecutionProvider }) => {
    if (!lodgingPlan) return result;
    return {
      ...result,
      itinerary: attachLodgingToItinerary(result.itinerary, input.preferences, lodgingPlan),
    };
  };

  if (!input.orderedPlaceIds?.length) {
    return wrap(
      await buildFastItineraryFromPreferencesClient({
        preferences: input.preferences,
        anchorPlaceId: input.anchorPlaceId ?? null,
        selectedPlaceState: input.engineContext?.selectedPlaceState,
      }),
    );
  }

  return wrap(
    await buildFastItineraryClient({
      preferences: input.preferences,
      orderedPlaceIds: input.orderedPlaceIds,
      preserveOrder: input.preserveOrder ?? true,
      anchorPlaceId: input.anchorPlaceId ?? null,
    }),
  );
}
