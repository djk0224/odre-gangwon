import { defaultPreferences } from "@/data/mockTravelData";
import type { EngineContext } from "@/services/engines/engineContext";
import {
  generateItineraryFromSavedPlaces,
  generateExecutableItinerary,
} from "@/services/itineraryService";
import { generateNatureRoadDriveItinerary } from "@/services/natureRoadItineraryService";
import type { AiChatStreamEvent } from "@/services/ai/chatStreamTypes";
import {
  requestAiCare,
  requestAiChat,
  requestAiChatStream,
  requestAiCrowdGuidance,
  requestAiItinerary,
  requestAiPlaceSearch,
  requestItineraryEnrich,
  requestItineraryRouteEnrich,
} from "@/services/aiClient";
import { buildItineraryClientFallback } from "@/lib/executionKernel/clientFallback";
import type { AiChatMessage, AiProvider } from "@/services/ai/types";
import type { HubReservationBooking } from "@/types/reservationHub";
import { isLodgingPlanActive } from "@/lib/tripLodgingPlan";
import type {
  Itinerary,
  Place,
  QRTicket,
  ReservationRecord,
  TravelZoneId,
  TripLodgingPlan,
  TripPreferences,
} from "@/types/travel";

export async function generateExecutableItineraryFromPreferences(
  preferences: TripPreferences = defaultPreferences,
  anchorPlaceId?: string | null,
  engineContext?: EngineContext,
  options?: {
    orderedPlaceIds?: string[] | null;
    preserveOrder?: boolean;
    lodgingPlan?: TripLodgingPlan;
    useLodgingBasedRoutes?: boolean;
  },
): Promise<{ itinerary: Itinerary; provider: AiProvider }> {
  const lodgingPlan =
    options?.useLodgingBasedRoutes === false
      ? undefined
      : isLodgingPlanActive(options?.lodgingPlan ?? engineContext?.lodgingPlan)
        ? (options?.lodgingPlan ?? engineContext?.lodgingPlan)
        : undefined;

  const requestOptions = {
    anchorPlaceId,
    orderedPlaceIds: options?.orderedPlaceIds,
    preserveOrder: options?.preserveOrder,
    lodgingPlan,
  };

  try {
    const { itinerary, provider } = await requestAiItinerary(preferences, requestOptions);
    if (itinerary?.stops?.length) {
      return { itinerary, provider };
    }
  } catch {
    /* fall through to browser-safe fallback */
  }

  return buildItineraryClientFallback({
    preferences,
    anchorPlaceId,
    orderedPlaceIds: options?.orderedPlaceIds,
    preserveOrder: options?.preserveOrder,
    engineContext,
  });
}

export async function enrichItineraryInBackground(
  itinerary: Itinerary,
  preferences: TripPreferences,
  anchorPlaceId?: string | null,
  tripSnapshot?: {
    reservations?: ReservationRecord[];
    qrTickets?: QRTicket[];
  },
): Promise<{
  itinerary: Itinerary;
  provider: AiProvider;
  routesEnriched: boolean;
  narrativeEnriched: boolean;
}> {
  const [routesResult, narrativeResult] = await Promise.allSettled([
    requestItineraryRouteEnrich(itinerary, preferences, tripSnapshot),
    requestItineraryEnrich(itinerary, preferences, { anchorPlaceId }),
  ]);

  let merged = itinerary;
  let provider: AiProvider = "rules";
  let routesEnriched = false;
  let narrativeEnriched = false;

  if (routesResult.status === "fulfilled") {
    merged = routesResult.value.itinerary;
    routesEnriched = routesResult.value.routesEnriched;
  }

  if (narrativeResult.status === "fulfilled") {
    merged = {
      ...merged,
      aiExplanation: narrativeResult.value.itinerary.aiExplanation,
      alternatives: narrativeResult.value.itinerary.alternatives,
    };
    provider = narrativeResult.value.provider;
    narrativeEnriched = narrativeResult.value.enriched;
  }

  return { itinerary: merged, provider, routesEnriched, narrativeEnriched };
}

export async function generateItineraryFromSavedPlacesWithPreferences(
  savedPlaces: Place[],
  preferences: TripPreferences = defaultPreferences,
): Promise<Itinerary> {
  return generateItineraryFromSavedPlaces(savedPlaces, preferences);
}

export async function generateNatureRoadDriveItineraryFromPreferences(
  preferences: TripPreferences = defaultPreferences,
  zoneId: TravelZoneId = "samcheok-donghae",
  engineContext?: EngineContext,
): Promise<Itinerary> {
  return generateNatureRoadDriveItinerary(preferences, zoneId, engineContext);
}

export async function searchPlacesWithAiRecommendation(
  query: string,
  preferences: TripPreferences,
) {
  return requestAiPlaceSearch(query, preferences);
}

export async function generateAiCareAlerts(options: {
  itinerary?: Itinerary;
  preferences: TripPreferences;
  reservations: ReservationRecord[];
  hubBookings: HubReservationBooking[];
  claimedLocalOfferIds: string[];
}) {
  return requestAiCare(options);
}

export async function askAiTravelAssistant(options: {
  message: string;
  preferences?: TripPreferences;
  history?: AiChatMessage[];
  session?: import("@/services/ai/types").AiChatSession;
  slotPatch?: import("@/services/ai/types").AiChatSession["slots"];
  action?: import("@/services/ai/types").AiQuickReply["action"];
  tripContext?: import("@/services/ai/types").AiChatTripContext;
}) {
  return requestAiChat(options);
}

export async function askAiTravelAssistantStream(
  options: {
    message: string;
    preferences?: TripPreferences;
    history?: AiChatMessage[];
    session?: import("@/services/ai/types").AiChatSession;
    slotPatch?: import("@/services/ai/types").AiChatSession["slots"];
    action?: import("@/services/ai/types").AiQuickReply["action"];
    tripContext?: import("@/services/ai/types").AiChatTripContext;
  },
  onEvent: (event: AiChatStreamEvent) => void,
) {
  return requestAiChatStream(options, onEvent);
}

export async function generateCrowdGuidanceForPlace(placeId: string) {
  return requestAiCrowdGuidance(placeId);
}

export type { AiProvider } from "@/services/ai/types";
export { fetchAiStatus } from "@/services/aiClient";
