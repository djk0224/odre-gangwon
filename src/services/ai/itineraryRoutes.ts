import { refreshClientItineraryFeasibility } from "@/lib/executionKernel/verifyItinerary";
import {
  enrichStopsTravelLegs,
  estimateMovingTimeLabel,
  sumTravelMinutes,
} from "@/services/engines/routeEngine";
import { buildItineraryTimeline } from "@/services/itineraryService";
import type { Itinerary, QRTicket, ReservationRecord, TripPreferences } from "@/types/travel";

/**
 * 백그라운드: Kakao REST 실도로 매트릭스로 구간 이동 시간·총 이동 시간을 보강합니다.
 * 방문 순서·정류장 구성은 유지합니다.
 */
export async function enrichItineraryRoutes(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options?: {
    reservations?: ReservationRecord[];
    qrTickets?: QRTicket[];
  },
): Promise<{ itinerary: Itinerary; routesEnriched: boolean }> {
  if (itinerary.stops.length < 2) {
    return { itinerary, routesEnriched: false };
  }

  const { stops, routingSource } = await enrichStopsTravelLegs(
    itinerary.stops,
    preferences.transportation,
    preferences.zoneId,
    { routeProfile: "accurate" },
  );

  const routesEnriched = routingSource === "kakao";
  const totalTravelMinutes = sumTravelMinutes(stops);
  const movingTime = estimateMovingTimeLabel(
    totalTravelMinutes * 60,
    stops.length,
    preferences.transportation,
  );

  const draft: Itinerary = {
    ...itinerary,
    stops,
    timeline: buildItineraryTimeline(stops, preferences),
    movingTime,
    routingSource,
    feasibilityIssues: itinerary.feasibilityIssues?.filter(
      (issue) => issue.code !== "routing_haversine",
    ),
  };

  const next = refreshClientItineraryFeasibility(draft, preferences, {
    reservations: options?.reservations,
    qrTickets: options?.qrTickets,
  });

  return { itinerary: next, routesEnriched };
}
