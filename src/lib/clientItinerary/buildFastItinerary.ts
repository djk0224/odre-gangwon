/**
 * Browser-only fast itinerary builder.
 * No serverEnv, durationMatrixCache, Kakao REST, or itineraryService (avoids server graph in client chunks).
 */
import { enrichPreferencesFromRegionalContext } from "@/lib/regionalPreferences";
import { getDayCountForDuration } from "@/lib/travelDuration";
import { splitPlaceIdsByDayCaps } from "@/lib/itineraryDayPlanner";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import {
  formatMovementLeg,
  getTransportationLabel,
  haversineMinutes,
  optimizeVisitOrderWithMatrix,
} from "@/services/engines/routeEngine";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  ItineraryTimelineItem,
  Place,
  SelectionIntent,
  TripPreferences,
} from "@/types/travel";
import type { ExecutionProvider } from "@/lib/executionKernel/types";
import { pickPlaceIdsForPreferencesClient } from "@/lib/clientItinerary/selectPlacesClient";

function buildHaversineMatrix(
  coords: Place["coordinates"][],
  transportation: TripPreferences["transportation"],
): number[][] {
  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const minutes = haversineMinutes(coords[i], coords[j], transportation);
      matrix[i][j] = minutes;
      matrix[j][i] = minutes;
    }
  }
  return matrix;
}

function buildTimeline(stops: ItineraryStop[]): ItineraryTimelineItem[] {
  return stops.map((stop) => ({
    id: `timeline-${stop.id}`,
    kind: "place" as const,
    day: stop.day,
    order: stop.order,
    title: stop.placeName,
    description: stop.note,
    duration: stop.duration,
    travelLegToNext: stop.movementNote,
    reservationRequired: stop.reservationRequired,
    partner: stop.partner,
    crowdLevel: stop.crowdLevel,
    expectedWait: stop.expectedWait,
    crowdConfidence: stop.crowdConfidence,
  }));
}

export async function buildFastItineraryClient(input: {
  preferences: TripPreferences;
  orderedPlaceIds: string[];
  preserveOrder?: boolean;
  anchorPlaceId?: string | null;
}): Promise<{ itinerary: Itinerary; provider: ExecutionProvider }> {
  const resolved = enrichPreferencesFromRegionalContext(input.preferences);
  const places = [...new Set(input.orderedPlaceIds)]
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));

  if (places.length === 0) {
    throw new Error("선택한 장소를 찾을 수 없습니다.");
  }

  let ordered = places;
  if (!input.preserveOrder && places.length > 1) {
    const coords = places.map((place) => place.coordinates);
    const matrix = buildHaversineMatrix(coords, resolved.transportation);
    const optimized = optimizeVisitOrderWithMatrix(
      places.map((place) => place.id),
      matrix,
      coords,
      {
        anchorPlaceId: input.anchorPlaceId ?? null,
        transportation: resolved.transportation,
        pace: resolved.pace,
      },
    );
    const byId = new Map(places.map((place) => [place.id, place]));
    ordered = optimized.orderedPlaceIds
      .map((id) => byId.get(id))
      .filter((place): place is Place => Boolean(place));
  }

  const orderedIds = ordered.map((place) => place.id);
  const dayChunks =
    getDayCountForDuration(resolved.duration) > 1
      ? splitPlaceIdsByDayCaps(orderedIds, resolved)
      : [orderedIds];
  const stops: ItineraryStop[] = [];

  for (let dayIndex = 0; dayIndex < dayChunks.length; dayIndex += 1) {
    const day = (dayIndex + 1) as ItineraryDay;
    const chunkIds = dayChunks[dayIndex];
    for (let index = 0; index < chunkIds.length; index += 1) {
      const place = getCatalogPlaceById(chunkIds[index]);
      if (!place) continue;
      const next = getCatalogPlaceById(chunkIds[index + 1]);
      const travelMinutes = next
        ? haversineMinutes(place.coordinates, next.coordinates, resolved.transportation)
        : undefined;

      stops.push({
        id: `stop-${place.id}-${day}-${index}`,
        order: index + 1,
        day,
        placeId: place.id,
        placeName: place.name,
        category: place.category,
        duration: place.estimatedDuration,
        note: place.recommendationReason || place.description,
        coordinates: place.coordinates,
        reservationRequired: place.reservationRequired,
        partner: place.partner,
        travelMinutesToNext: travelMinutes,
        movementNote:
          travelMinutes !== undefined && next
            ? formatMovementLeg(travelMinutes, resolved.transportation, next.name)
            : undefined,
      });
    }
  }

  const reservationPlaceIds = ordered
    .filter((place) => place.reservationRequired)
    .map((place) => place.id);

  const totalTravelMinutes = stops.reduce(
    (sum, stop) => sum + (stop.travelMinutesToNext ?? 0),
    0,
  );

  const itinerary: Itinerary = {
    id: `itinerary-client-${Date.now()}`,
    region: resolved.zoneId,
    title: `${resolved.zoneId} 빠른 실행 일정`,
    summary: `${resolved.travelDate} · ${resolved.travelers}명 · ${getTransportationLabel(resolved.transportation)}`,
    totalDuration: resolved.pace === "packed" ? "8시간" : "7시간",
    movingTime: `${Math.max(1, Math.round(totalTravelMinutes / 60))}시간 이동`,
    aiExplanation:
      "네트워크 제한으로 Haversine 기준 빠른 일정을 구성했습니다. 지도·실도로 보정은 연결 후 자동 반영됩니다.",
    stops,
    timeline: buildTimeline(stops),
    alternatives: ["예약 슬롯·혼잡은 연결 후 갱신"],
    reservationPlaceIds,
    routingSource: "haversine",
    executionDataMode: "demo",
  };

  return { itinerary, provider: "rules" };
}

/** Preferences wizard fallback — no server /api/ai/itinerary required */
export async function buildFastItineraryFromPreferencesClient(input: {
  preferences: TripPreferences;
  anchorPlaceId?: string | null;
  selectedPlaceState?: Record<string, { intent: SelectionIntent; updatedAt?: string }>;
}): Promise<{ itinerary: Itinerary; provider: ExecutionProvider }> {
  const placeIds = pickPlaceIdsForPreferencesClient(
    input.preferences,
    input.anchorPlaceId,
    input.selectedPlaceState,
  );
  if (placeIds.length === 0) {
    throw new Error("선택한 권역에서 일정에 넣을 장소를 찾지 못했습니다.");
  }
  return buildFastItineraryClient({
    preferences: input.preferences,
    orderedPlaceIds: placeIds,
    preserveOrder: false,
    anchorPlaceId: input.anchorPlaceId ?? null,
  });
}
