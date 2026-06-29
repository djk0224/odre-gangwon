import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import { generateItineraryDeterministic } from "@/services/ai/itinerary";
import { getConfiguredAiProviders } from "@/services/ai/provider";
import { defaultPreferences } from "@/data/mockTravelData";
import type { TripLodgingPlan, TripPreferences } from "@/types/travel";
import { isLodgingPlanActive } from "@/lib/tripLodgingPlan";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "ai-itinerary", {
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      preferences?: TripPreferences;
      anchorPlaceId?: string | null;
      orderedPlaceIds?: string[] | null;
      preserveOrder?: boolean;
      lodgingPlan?: TripLodgingPlan;
    };
    const preferences = body.preferences ?? defaultPreferences;
    await loadFullGangwonCatalog();
    const engineContext = buildEngineContextFromTripStore({
      preferences,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: body.anchorPlaceId ?? null,
      lodgingPlan: body.lodgingPlan,
    });
    const result = await generateItineraryDeterministic(preferences, {
      anchorPlaceId: body.anchorPlaceId ?? null,
      orderedPlaceIds: body.orderedPlaceIds ?? null,
      preserveOrder: body.preserveOrder,
      engineContext,
      lodgingPlan: isLodgingPlanActive(body.lodgingPlan)
        ? body.lodgingPlan
        : engineContext.lodgingPlan,
    });
    return NextResponse.json({
      itinerary: result.itinerary,
      provider: result.provider,
      configuredProviders: getConfiguredAiProviders(),
      feasibilityIssues: result.itinerary.feasibilityIssues ?? [],
      executionDataMode: result.itinerary.executionDataMode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI itinerary failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
