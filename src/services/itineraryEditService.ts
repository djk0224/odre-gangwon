import {
  enrichStopsTravelLegs,
  estimateMovingTimeLabel,
  sumTravelMinutes,
} from "@/services/engines/routeEngine";
import { collectItineraryDaysFromStops } from "@/lib/travelDuration";
import {
  estimatePlaceCrowd,
  estimatePlaceCrowdQuick,
} from "@/services/engines/crowdEngine";
import { resolveStopCrowdFields } from "@/services/crowdService";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import type { EngineContext } from "@/services/engines/engineContext";
import {
  buildItineraryTimeline,
  createItineraryStop,
  repairItinerary,
} from "@/services/itineraryService";
import type {
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  Place,
  TripPreferences,
} from "@/types/travel";

/** 혼잡 추정용 내부 프록시 시각 — UI·일정에는 표시하지 않음 */
/** 일정 카드 혼잡 추정용 — 피크 점심보다 완만한 기본 시각 */
const CROWD_ESTIMATE_PROXY_TIME = "10:30";

const DEFAULT_STAY_MINUTES = 60;

/** "1시간 30분", "50분" 등 한국어 체류 시간 파싱 */
export function parseEstimatedDurationMinutes(duration: string): number {
  const hourMatch = duration.match(/(\d+)\s*시간/);
  const minuteMatch = duration.match(/(\d+)\s*분/);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  const total = hours * 60 + minutes;
  return total > 0 ? total : DEFAULT_STAY_MINUTES;
}

export function cloneItinerary(itinerary: Itinerary): Itinerary {
  return structuredClone(itinerary);
}

function normalizeStopsOrder(stops: ItineraryStop[]): ItineraryStop[] {
  const dayGroups = collectItineraryDaysFromStops(stops);
  const result: ItineraryStop[] = [];

  for (const day of dayGroups) {
    const dayStops = stops
      .filter((stop) => stop.day === day)
      .sort((a, b) => a.order - b.order);

    dayStops.forEach((stop, index) => {
      result.push({ ...stop, order: index + 1 });
    });
  }

  return result;
}

export async function rebuildItineraryFromStops(
  stops: ItineraryStop[],
  base: Itinerary,
  preferences?: TripPreferences,
): Promise<Itinerary> {
  const normalized = normalizeStopsOrder(stops);
  const reservationPlaceIds = normalized
    .filter((stop) => stop.reservationRequired)
    .map((stop) => stop.placeId);

  const next: Itinerary = {
    ...base,
    stops: normalized,
    timeline: buildItineraryTimeline(normalized, preferences),
    reservationPlaceIds,
  };

  return recalculateItineraryMeta(repairItinerary(next), preferences);
}

const EDIT_RECALC_EXPLANATION =
  "편집한 방문 순서와 이동 수단을 반영해 실행 일정을 다시 연결했습니다. 예약·혼잡·QR 흐름은 저장 후 갱신됩니다.";

export async function recalculateItineraryMeta(
  itinerary: Itinerary,
  preferences?: TripPreferences,
  options?: { skipTravelEnrich?: boolean; preserveNarrative?: boolean },
): Promise<Itinerary> {
  const stopCount = itinerary.stops.length;
  const pace = preferences?.pace ?? "balanced";
  const transportation = preferences?.transportation ?? "car";

  const sortedStops = normalizeStopsOrder(itinerary.stops);
  const alreadyHasLegs =
    sortedStops.length > 1 &&
    sortedStops.every(
      (stop, index) =>
        index === sortedStops.length - 1 ||
        Boolean(stop.movementNote?.trim() || stop.travelMinutesToNext),
    );
  const legEnrich =
    options?.skipTravelEnrich || alreadyHasLegs
      ? { stops: sortedStops, routingSource: itinerary.routingSource ?? "haversine" as const }
      : await enrichStopsTravelLegs(
          sortedStops,
          transportation,
          preferences?.zoneId ?? "samcheok-donghae",
          { routeProfile: "fast" },
        );
  const enrichedStops = legEnrich.stops;
  const totalTravelMinutes = sumTravelMinutes(enrichedStops);

  const baseHours =
    pace === "relaxed" ? 5.5 + stopCount * 0.35 : pace === "packed" ? 7 + stopCount * 0.45 : 6 + stopCount * 0.4;
  const hours = Math.floor(baseHours);
  const minutes = Math.round((baseHours - hours) * 60);

  return {
    ...itinerary,
    stops: enrichedStops,
    routingSource: legEnrich.routingSource,
    timeline: buildItineraryTimeline(enrichedStops, preferences),
    totalDuration: minutes > 0 ? `${hours}시간 ${minutes}분` : `${hours}시간`,
    movingTime: estimateMovingTimeLabel(totalTravelMinutes * 60, stopCount, transportation),
    aiExplanation: options?.preserveNarrative
      ? itinerary.aiExplanation
      : EDIT_RECALC_EXPLANATION,
    alternatives: itinerary.alternatives,
  };
}

export function getStopsForDay(stops: ItineraryStop[], day: ItineraryDay): ItineraryStop[] {
  return stops
    .filter((stop) => stop.day === day)
    .sort((a, b) => a.order - b.order);
}

export function reorderStopsInDay(
  stops: ItineraryStop[],
  day: ItineraryDay,
  activeId: string,
  overId: string,
): ItineraryStop[] {
  const dayStops = getStopsForDay(stops, day);
  const oldIndex = dayStops.findIndex((stop) => stop.id === activeId);
  const newIndex = dayStops.findIndex((stop) => stop.id === overId);

  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return stops;
  }

  const reordered = [...dayStops];
  const [moved] = reordered.splice(oldIndex, 1);
  reordered.splice(newIndex, 0, moved);

  const other = stops.filter((stop) => stop.day !== day);
  const merged = [
    ...other,
    ...reordered.map((stop, index) => ({ ...stop, order: index + 1 })),
  ];

  return normalizeStopsOrder(merged);
}

/** Day 내 이동 구간·혼잡 추정을 순서 기준으로 갱신 (시각 배치 없음) */
export async function reflowDayStopsAsync(
  stops: ItineraryStop[],
  day: ItineraryDay,
  engineContext?: EngineContext,
): Promise<ItineraryStop[]> {
  const transportation = engineContext?.preferences.transportation ?? "car";
  const zoneId = engineContext?.zoneId ?? "samcheok-donghae";

  const { stops: enriched } = await enrichStopsTravelLegs(stops, transportation, zoneId, {
    routeProfile: "fast",
  });

  const dayStops = getStopsForDay(enriched, day);
  if (dayStops.length === 0) {
    return enriched;
  }

  const reflowedDay: ItineraryStop[] = [];

  for (const stop of dayStops) {
    let updated: ItineraryStop = { ...stop, timeLabel: undefined };
    const place = getCatalogPlaceById(stop.placeId);

    if (engineContext && place) {
      const crowd =
        engineContext.crowdMode === "quick"
          ? estimatePlaceCrowdQuick(place, engineContext, {
              timeLabel: CROWD_ESTIMATE_PROXY_TIME,
            })
          : await estimatePlaceCrowd(place, engineContext, {
              timeLabel: CROWD_ESTIMATE_PROXY_TIME,
            });
      const crowdFields = resolveStopCrowdFields(place, {
        level: crowd.level,
        expectedWait: crowd.expectedWait,
        confidence: crowd.confidence,
      });
      updated = {
        ...updated,
        ...crowdFields,
      };
    }

    reflowedDay.push(updated);
  }

  const byId = new Map(reflowedDay.map((stop) => [stop.id, stop]));
  return enriched.map((stop) =>
    stop.day === day && byId.has(stop.id) ? byId.get(stop.id)! : stop,
  );
}

/** @deprecated Use reflowDayStopsAsync */
export const reflowDayStopTimesAsync = reflowDayStopsAsync;

export async function reorderStopsInDayWithReflow(
  stops: ItineraryStop[],
  day: ItineraryDay,
  activeId: string,
  overId: string,
  engineContext?: EngineContext,
): Promise<ItineraryStop[]> {
  const reordered = reorderStopsInDay(stops, day, activeId, overId);
  return reflowDayStopsAsync(reordered, day, engineContext);
}

export function removeStop(stops: ItineraryStop[], stopId: string): ItineraryStop[] {
  return normalizeStopsOrder(stops.filter((stop) => stop.id !== stopId));
}

export async function addStopFromPlace(
  stops: ItineraryStop[],
  place: Place,
  day: ItineraryDay,
  engineContext?: EngineContext,
): Promise<ItineraryStop[]> {
  if (stops.some((stop) => stop.placeId === place.id)) {
    return stops;
  }

  const dayStops = getStopsForDay(stops, day);

  const newStop = await createItineraryStop(
    place,
    dayStops.length + 1,
    day,
    engineContext,
  );
  const merged = normalizeStopsOrder([...stops, newStop]);
  return reflowDayStopsAsync(merged, day, engineContext);
}

export function moveStopDay(
  stops: ItineraryStop[],
  stopId: string,
  targetDay: ItineraryDay,
): ItineraryStop[] {
  const target = stops.find((stop) => stop.id === stopId);
  if (!target || target.day === targetDay) {
    return stops;
  }

  const dayStops = getStopsForDay(stops, targetDay);

  const updated = stops.map((stop) =>
    stop.id === stopId
      ? { ...stop, day: targetDay, order: dayStops.length + 1, timeLabel: undefined }
      : stop,
  );

  return normalizeStopsOrder(updated);
}

export async function moveStopDayWithReflow(
  stops: ItineraryStop[],
  stopId: string,
  targetDay: ItineraryDay,
  engineContext?: EngineContext,
): Promise<ItineraryStop[]> {
  const source = stops.find((stop) => stop.id === stopId);
  const sourceDay = source?.day;
  let updated = moveStopDay(stops, stopId, targetDay);
  updated = await reflowDayStopsAsync(updated, targetDay, engineContext);
  if (sourceDay && sourceDay !== targetDay) {
    updated = await reflowDayStopsAsync(updated, sourceDay, engineContext);
  }
  return updated;
}

export function getAvailablePlacesToAdd(
  stops: ItineraryStop[],
  zoneId: TripPreferences["zoneId"],
): Place[] {
  const included = new Set(stops.map((stop) => stop.placeId));
  return getCatalogPlaces().filter(
    (place) => place.region === zoneId && !included.has(place.id),
  );
}

export function itinerariesEqual(a: Itinerary, b: Itinerary): boolean {
  return JSON.stringify(a.stops) === JSON.stringify(b.stops);
}
