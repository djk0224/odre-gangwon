import {
  insertDiningPlaceAtIndex,
  resolveMealInsertIndex,
} from "@/lib/diningInsertTimeline";
import { parseEstimatedDurationMinutes } from "@/services/itineraryEditService";
import { resolveDayScheduleBudget } from "@/lib/itineraryDayPlanner";
import { parseOperatingHoursWindow } from "@/lib/itineraryFeasibilityChecks";
import { estimateLegMinutesBetweenCoords } from "@/lib/itineraryLegMinutes";
import { getDistanceKm } from "@/lib/geoUtils";
import { isLodgingPlace } from "@/lib/placeLodging";
import { getDayCountForDuration, getMaxAttractionStopsForDay, getDiningSlotRolesForDay, getDiningSlotsForDay, getMaxAttractionStopsForTrip } from "@/lib/travelDuration";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { getNightCountForDuration, resolveNightDepot } from "@/lib/tripLodgingPlan";
import { optimizeVisitOrderWithMatrix } from "@/services/engines/routeEngine";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import type {
  Coordinates,
  Place,
  SelectionIntent,
  TripLodgingPlan,
  TripPace,
  TripPreferences,
} from "@/types/travel";

export type DiningSlotRole = "start" | "middle" | "end";

export interface RouteDiningSlot {
  role: DiningSlotRole;
  label: string;
  /** 1-based day index when multi-day */
  day?: number;
  anchorLabel: string;
  estimatedArrival: string;
  estimatedTravelMinutes: number;
  suggestedPlace: Place | null;
  warnings: string[];
}

export interface RouteDiningPlan {
  tourPlaceIds: string[];
  slots: RouteDiningSlot[];
  /** 관광지 순서에 식당을 끼워 넣은 최종 place id 시퀀스 */
  orderedPlaceIds: string[];
  resolvedDiningPlaceIds: string[];
  hasOperatingHoursConflict: boolean;
}

const SLOT_TARGETS: Record<DiningSlotRole, { label: string; targetMin: number }> = {
  start: { label: "출발 · 아침/브런치", targetMin: 8 * 60 + 30 },
  middle: { label: "중간 · 점심", targetMin: 12 * 60 + 30 },
  end: { label: "마무리 · 저녁", targetMin: 18 * 60 + 30 },
};

const DINING_STAY_MINUTES = 60;
/** 실행 커널 검증과 동일한 정류장당 버퍼(분) */
const STOP_BUFFER_MINUTES = 10;
/** 식당 슬롯당 우회 이동 여유(분) */
const DINING_DETOUR_MINUTES = 10;

function dayStartMinutes(pace: TripPace): number {
  if (pace === "relaxed") return 9 * 60 + 30;
  if (pace === "packed") return 8 * 60 + 30;
  return 9 * 60;
}

function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * 관광지에 쓸 수 있는 활동 예산(분) — 페이스 상한 × 일수에서 식당 3슬롯 예약분 차감.
 * 실행 커널 day_overload 검증(체류+이동+버퍼 10분)과 같은 기준을 쓴다.
 */
function resolveTourTimeBudgetMinutes(
  preferences: Pick<TripPreferences, "duration" | "pace">,
): number {
  const dayCount = getDayCountForDuration(preferences.duration);
  const totalBudget =
    resolveDayScheduleBudget(preferences.pace).maxActiveMinutes * dayCount;
  let mealReserve = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    const slotCount = getDiningSlotsForDay(day, preferences.duration);
    mealReserve +=
      slotCount * (DINING_STAY_MINUTES + STOP_BUFFER_MINUTES + DINING_DETOUR_MINUTES);
  }
  return Math.max(120, totalBudget - mealReserve);
}

/** 관광지를 Day별 상한에 맞춰 분배 — 빈 Day도 유지(귀가일 식사 슬롯용) */
function splitTourPlaceIdsByDay(
  tourPlaceIds: string[],
  preferences: Pick<TripPreferences, "duration" | "pace">,
): string[][] {
  const dayCount = getDayCountForDuration(preferences.duration);
  if (dayCount <= 1) {
    return [tourPlaceIds];
  }

  const chunks: string[][] = Array.from({ length: dayCount }, () => []);
  let cursor = 0;
  for (let day = 1; day <= dayCount && cursor < tourPlaceIds.length; day += 1) {
    const cap = getMaxAttractionStopsForDay(day, preferences.pace, preferences.duration);
    while (cursor < tourPlaceIds.length && chunks[day - 1].length < cap) {
      chunks[day - 1].push(tourPlaceIds[cursor]);
      cursor += 1;
    }
  }

  return chunks;
}

function trimTourPlaceIdsToTimeBudget(
  tourIds: string[],
  mustGoIds: Set<string>,
  preferences: Pick<TripPreferences, "duration" | "pace" | "transportation">,
): string[] {
  const available = resolveTourTimeBudgetMinutes(preferences);
  const kept: string[] = [];
  let used = 0;
  let prevCoords: Coordinates | null = null;

  for (const placeId of tourIds) {
    const place = getCatalogPlaceById(placeId);
    if (!place) continue;
    const stay = parseEstimatedDurationMinutes(place.estimatedDuration);
    const travel = prevCoords
      ? estimateLegMinutesBetweenCoords(prevCoords, place.coordinates, preferences.transportation)
      : 0;
    const cost = stay + travel + STOP_BUFFER_MINUTES;
    // must_go는 예산 초과여도 유지(사용자 확정), interested는 최소 2곳 보장 후 예산 내에서만
    if (used + cost > available && !mustGoIds.has(placeId) && kept.length >= 2) {
      continue;
    }
    kept.push(placeId);
    used += cost;
    prevCoords = place.coordinates;
  }
  return kept;
}

export function orderTourPlaceIdsForItinerary(
  selectedPlaceState: Record<string, { intent: SelectionIntent; updatedAt?: string }>,
  preferences: Pick<TripPreferences, "duration" | "pace" | "transportation">,
): string[] {
  const entries = Object.entries(selectedPlaceState).filter(([, value]) => value.intent !== "exclude");
  const mustGo = entries
    .filter(([, value]) => value.intent === "must_go")
    .sort((a, b) => (a[1].updatedAt ?? "").localeCompare(b[1].updatedAt ?? ""));
  const rest = entries
    .filter(([, value]) => value.intent !== "must_go")
    .sort((a, b) => (a[1].updatedAt ?? "").localeCompare(b[1].updatedAt ?? ""));
  const tourIds = [...mustGo, ...rest]
    .map(([placeId]) => placeId)
    .filter((placeId) => {
      const place = getCatalogPlaceById(placeId);
      return place && !isDiningPlace(place) && !isLodgingPlace(place);
    });

  const countCapped = tourIds.slice(0, getMaxAttractionStopsForTrip(preferences));
  return trimTourPlaceIdsToTimeBudget(
    countCapped,
    new Set(mustGo.map(([placeId]) => placeId)),
    preferences,
  );
}

function buildLegMatrix(
  placeIds: string[],
  transportation: TripPreferences["transportation"],
): { matrix: number[][]; coords: Coordinates[] } {
  const coords = placeIds
    .map((id) => getCatalogPlaceById(id)?.coordinates)
    .filter((coord): coord is Coordinates => Boolean(coord));
  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const minutes = estimateLegMinutesBetweenCoords(coords[i], coords[j], transportation);
      matrix[i][j] = minutes;
      matrix[j][i] = minutes;
    }
  }
  return { matrix, coords };
}

function tourLegMinutesTotal(placeIds: string[], transportation: TripPreferences["transportation"]): number {
  let total = 0;
  for (let i = 0; i < placeIds.length - 1; i += 1) {
    const from = getCatalogPlaceById(placeIds[i]);
    const to = getCatalogPlaceById(placeIds[i + 1]);
    if (!from || !to) continue;
    total += estimateLegMinutesBetweenCoords(from.coordinates, to.coordinates, transportation);
  }
  return total;
}

/** 관광지 방문 순서를 이동 시간 기준으로 최적화 (식당 삽입 전) */
export function optimizeTourPlaceIdsByRoute(
  tourIds: string[],
  preferences: Pick<TripPreferences, "transportation" | "pace">,
  lodgingPlan?: TripLodgingPlan,
): string[] {
  const unique = [...new Set(tourIds)].filter((id) => Boolean(getCatalogPlaceById(id)));
  if (unique.length <= 1) return unique;

  const { matrix, coords } = buildLegMatrix(unique, preferences.transportation);
  if (coords.length !== unique.length) return unique;

  const depot = lodgingPlan ? resolveNightDepot(lodgingPlan, 1) : null;
  const anchorPlaceId =
    depot && depot.coordinates.lat !== 0 && depot.coordinates.lng !== 0
      ? unique.reduce((bestId, placeId) => {
          const place = getCatalogPlaceById(placeId);
          const best = getCatalogPlaceById(bestId);
          if (!place) return bestId;
          if (!best) return placeId;
          const placeMinutes = estimateLegMinutesBetweenCoords(
            depot.coordinates,
            place.coordinates,
            preferences.transportation,
          );
          const bestMinutes = estimateLegMinutesBetweenCoords(
            depot.coordinates,
            best.coordinates,
            preferences.transportation,
          );
          return placeMinutes < bestMinutes ? placeId : bestId;
        }, unique[0])
      : null;

  return optimizeVisitOrderWithMatrix(unique, matrix, coords, {
    anchorPlaceId,
    transportation: preferences.transportation,
    pace: preferences.pace,
  }).orderedPlaceIds;
}

function operatingHoursWarning(place: Place, arrivalMin: number): string | null {
  const window = parseOperatingHoursWindow(place.operatingHours);
  if (!window) return null;
  const endMin = arrivalMin + DINING_STAY_MINUTES;
  if (arrivalMin < window.openMin) {
    return `${place.name}은(는) ${formatClock(window.openMin)} 개점 전 도착 예상입니다.`;
  }
  if (endMin > window.closeMin) {
    return `${place.name} 영업 종료(${formatClock(window.closeMin)})와 체류 시간이 겹칩니다.`;
  }
  return null;
}

function scoreDiningCandidate(
  place: Place,
  anchor: Coordinates,
  targetArrivalMin: number,
): number {
  const distanceKm = getDistanceKm(anchor, place.coordinates);
  const distanceScore = Math.max(0, 1 - distanceKm / 12);
  const window = parseOperatingHoursWindow(place.operatingHours);
  let hoursScore = 0.35;
  if (window) {
    const endMin = targetArrivalMin + DINING_STAY_MINUTES;
    if (targetArrivalMin >= window.openMin && endMin <= window.closeMin) {
      hoursScore = 1;
    } else if (targetArrivalMin >= window.openMin - 30 && endMin <= window.closeMin + 15) {
      hoursScore = 0.55;
    } else {
      hoursScore = 0.1;
    }
  }
  return distanceScore * 0.55 + hoursScore * 0.45;
}

function pickDiningNearAnchor(
  preferences: TripPreferences,
  anchor: Coordinates,
  targetArrivalMin: number,
  excludeIds: Set<string>,
): Place | null {
  const candidates = getCatalogPlaces().filter(
    (place) =>
      place.region === preferences.zoneId &&
      isDiningPlace(place) &&
      !excludeIds.has(place.id),
  );
  if (candidates.length === 0) return null;

  return [...candidates]
    .sort(
      (a, b) =>
        scoreDiningCandidate(b, anchor, targetArrivalMin) -
        scoreDiningCandidate(a, anchor, targetArrivalMin),
    )[0];
}

function buildRouteTimeline(
  tourPlaceIds: string[],
  preferences: TripPreferences,
  lodgingPlan: TripLodgingPlan | undefined,
  nightIndex = 1,
): {
  milestones: Array<{ placeId: string; arrivalMin: number; coords: Coordinates }>;
  lodgingCoords: Coordinates | null;
  lodgingLabel: string;
} {
  const milestones: Array<{ placeId: string; arrivalMin: number; coords: Coordinates }> = [];
  const depot = lodgingPlan ? resolveNightDepot(lodgingPlan, nightIndex) : null;
  const lodgingCoords =
    depot && depot.coordinates.lat !== 0 && depot.coordinates.lng !== 0
      ? depot.coordinates
      : null;
  const lodgingLabel = depot?.name ?? "출발지";

  let cursor = dayStartMinutes(preferences.pace);
  let prevCoords = lodgingCoords;

  for (const placeId of tourPlaceIds) {
    const place = getCatalogPlaceById(placeId);
    if (!place) continue;
    if (prevCoords) {
      cursor += estimateLegMinutesBetweenCoords(prevCoords, place.coordinates, preferences.transportation);
    }
    milestones.push({ placeId, arrivalMin: cursor, coords: place.coordinates });
    cursor += parseEstimatedDurationMinutes(place.estimatedDuration);
    prevCoords = place.coordinates;
  }

  return { milestones, lodgingCoords, lodgingLabel };
}

function resolveSlotAnchor(
  role: DiningSlotRole,
  milestones: Array<{ placeId: string; arrivalMin: number; coords: Coordinates }>,
  lodgingCoords: Coordinates | null,
  lodgingLabel: string,
  pace: TripPace,
): {
  anchor: Coordinates;
  travelOrigin: Coordinates | null;
  anchorLabel: string;
  targetArrivalMin: number;
} {
  const target = SLOT_TARGETS[role].targetMin;
  const fallback = lodgingCoords ?? { lat: 37.75, lng: 128.9 };

  if (role === "start") {
    const first = milestones[0];
    if (lodgingCoords) {
      return {
        anchor: lodgingCoords,
        travelOrigin: lodgingCoords,
        anchorLabel: lodgingLabel,
        targetArrivalMin: Math.max(target, dayStartMinutes(pace)),
      };
    }
    if (first) {
      return {
        anchor: first.coords,
        travelOrigin: first.coords,
        anchorLabel: getCatalogPlaceById(first.placeId)?.name ?? "첫 관광지",
        targetArrivalMin: Math.min(target, first.arrivalMin - 30),
      };
    }
    return {
      anchor: fallback,
      travelOrigin: fallback,
      anchorLabel: lodgingLabel,
      targetArrivalMin: target,
    };
  }

  if (role === "middle") {
    if (milestones.length === 0) {
      return {
        anchor: fallback,
        travelOrigin: lodgingCoords,
        anchorLabel: lodgingLabel,
        targetArrivalMin: target,
      };
    }
    const midIndex = Math.floor((milestones.length - 1) / 2);
    const before = milestones[midIndex];
    const after = milestones[midIndex + 1] ?? before;
    return {
      anchor: {
        lat: (before.coords.lat + after.coords.lat) / 2,
        lng: (before.coords.lng + after.coords.lng) / 2,
      },
      travelOrigin: before.coords,
      anchorLabel: `${getCatalogPlaceById(before.placeId)?.name ?? "중간"} ↔ ${getCatalogPlaceById(after.placeId)?.name ?? "다음"}`,
      targetArrivalMin: target,
    };
  }

  const last = milestones[milestones.length - 1];
  if (last) {
    const lastPlace = getCatalogPlaceById(last.placeId);
    return {
      anchor: last.coords,
      travelOrigin: last.coords,
      anchorLabel: lastPlace?.name ?? "마지막 관광지",
      targetArrivalMin: Math.max(
        target,
        last.arrivalMin + parseEstimatedDurationMinutes(lastPlace?.estimatedDuration ?? "1시간"),
      ),
    };
  }
  return {
    anchor: fallback,
    travelOrigin: lodgingCoords,
    anchorLabel: lodgingLabel,
    targetArrivalMin: target,
  };
}

function insertDiningAlongOptimizedRoute(
  optimizedTourIds: string[],
  slots: RouteDiningSlot[],
  preferences: TripPreferences,
  lodgingCoords: Coordinates | null,
): string[] {
  let result = [...optimizedTourIds];
  const roleOrder: DiningSlotRole[] = ["end", "middle", "start"];

  for (const role of roleOrder) {
    const slot = slots.find((item) => item.role === role);
    if (!slot?.suggestedPlace) continue;
    const insertAt = resolveMealInsertIndex(
      role,
      result,
      slot.suggestedPlace,
      preferences,
      lodgingCoords,
    );
    result = insertDiningPlaceAtIndex(result, slot.suggestedPlace.id, insertAt);
  }

  const seen = new Set<string>();
  return result.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function formatDiningSlotLabel(
  role: DiningSlotRole,
  roles: readonly DiningSlotRole[],
  prefix: string,
): string {
  if (roles.length === 2 && roles.includes("middle") && roles.includes("end")) {
    if (role === "middle") return `${prefix}점심`;
    if (role === "end") return `${prefix}저녁`;
  }
  if (roles.length === 2 && roles.includes("start") && roles.includes("middle")) {
    if (role === "start") return `${prefix}아침`;
    if (role === "middle") return `${prefix}점심`;
  }
  return `${prefix}${SLOT_TARGETS[role].label}`;
}

function buildDiningSlotsForDayChunk(input: {
  preferences: TripPreferences;
  lodgingPlan?: TripLodgingPlan;
  tourPlaceIds: string[];
  day: number;
  dayCount: number;
  exclude: Set<string>;
}): { slots: RouteDiningSlot[]; hasOperatingHoursConflict: boolean } {
  const nightCount = getNightCountForDuration(input.preferences.duration);
  const nightIndex = nightCount > 0 ? Math.min(input.day, nightCount) : 1;
  const { milestones, lodgingCoords, lodgingLabel } = buildRouteTimeline(
    input.tourPlaceIds,
    input.preferences,
    input.lodgingPlan,
    nightIndex,
  );

  const slots: RouteDiningSlot[] = [];
  let hasOperatingHoursConflict = false;
  const prefix = input.dayCount > 1 ? `Day ${input.day} · ` : "";
  const roles = getDiningSlotRolesForDay(input.day, input.preferences.duration);

  for (const role of roles) {
    const anchorInfo = resolveSlotAnchor(
      role,
      milestones,
      lodgingCoords,
      lodgingLabel,
      input.preferences.pace,
    );
    const suggestedPlace = pickDiningNearAnchor(
      input.preferences,
      anchorInfo.anchor,
      anchorInfo.targetArrivalMin,
      input.exclude,
    );

    const travelMinutes =
      anchorInfo.travelOrigin && suggestedPlace
        ? estimateLegMinutesBetweenCoords(
            anchorInfo.travelOrigin,
            suggestedPlace.coordinates,
            input.preferences.transportation,
          )
        : 0;
    const arrivalMin =
      role === "start"
        ? dayStartMinutes(input.preferences.pace) + travelMinutes
        : anchorInfo.targetArrivalMin + travelMinutes;

    const warnings: string[] = [];
    if (suggestedPlace) {
      input.exclude.add(suggestedPlace.id);
      const hoursWarning = operatingHoursWarning(suggestedPlace, arrivalMin);
      if (hoursWarning) {
        warnings.push(hoursWarning);
        hasOperatingHoursConflict = true;
      }
      if (travelMinutes >= 45) {
        warnings.push(`이동 약 ${travelMinutes}분 — 식사 전후 일정 여유를 확인해 주세요.`);
      }
    } else {
      warnings.push(`${formatDiningSlotLabel(role, roles, prefix)} 구간에 맞는 식당 후보가 부족합니다.`);
    }

    slots.push({
      role,
      day: input.dayCount > 1 ? input.day : undefined,
      label: formatDiningSlotLabel(role, roles, prefix),
      anchorLabel: anchorInfo.anchorLabel,
      estimatedArrival: formatClock(arrivalMin),
      estimatedTravelMinutes: travelMinutes,
      suggestedPlace,
      warnings,
    });
  }

  return { slots, hasOperatingHoursConflict };
}

export function buildRouteDiningPlan(input: {
  preferences: TripPreferences;
  lodgingPlan?: TripLodgingPlan;
  selectedPlaceState: Record<string, { intent: SelectionIntent; updatedAt?: string }>;
}): RouteDiningPlan {
  const selectedTourIds = orderTourPlaceIdsForItinerary(
    input.selectedPlaceState,
    input.preferences,
  );
  const tourPlaceIds = optimizeTourPlaceIdsByRoute(
    selectedTourIds,
    input.preferences,
    input.lodgingPlan,
  );

  if (tourPlaceIds.length === 0) {
    return {
      tourPlaceIds: [],
      slots: [],
      orderedPlaceIds: [],
      resolvedDiningPlaceIds: [],
      hasOperatingHoursConflict: false,
    };
  }

  const dayCount = getDayCountForDuration(input.preferences.duration);
  const nightCount = getNightCountForDuration(input.preferences.duration);
  const dayChunks = splitTourPlaceIdsByDay(tourPlaceIds, input.preferences);
  const exclude = new Set<string>(tourPlaceIds);
  const slots: RouteDiningSlot[] = [];
  const orderedPlaceIds: string[] = [];
  let hasOperatingHoursConflict = false;

  for (let day = 1; day <= dayCount; day += 1) {
    const chunk = dayChunks[day - 1] ?? [];
    const nightIndex = nightCount > 0 ? Math.min(day, nightCount) : 1;
    const { lodgingCoords } = buildRouteTimeline(
      chunk,
      input.preferences,
      input.lodgingPlan,
      nightIndex,
    );
    const { slots: daySlots, hasOperatingHoursConflict: dayConflict } =
      buildDiningSlotsForDayChunk({
        preferences: input.preferences,
        lodgingPlan: input.lodgingPlan,
        tourPlaceIds: chunk,
        day,
        dayCount,
        exclude,
      });
    slots.push(...daySlots);
    if (chunk.length > 0) {
      orderedPlaceIds.push(
        ...insertDiningAlongOptimizedRoute(
          chunk,
          daySlots,
          input.preferences,
          lodgingCoords,
        ),
      );
    } else {
      for (const slot of daySlots) {
        if (slot.suggestedPlace?.id) {
          orderedPlaceIds.push(slot.suggestedPlace.id);
        }
      }
    }
    if (dayConflict) {
      hasOperatingHoursConflict = true;
    }
  }

  const resolvedDiningPlaceIds = slots
    .map((slot) => slot.suggestedPlace?.id)
    .filter((id): id is string => Boolean(id));

  return {
    tourPlaceIds,
    slots,
    orderedPlaceIds,
    resolvedDiningPlaceIds,
    hasOperatingHoursConflict,
  };
}

export function resolveOrderedPlaceIdsForGeneration(input: {
  preferences: TripPreferences;
  lodgingPlan?: TripLodgingPlan;
  selectedPlaceState: Record<string, { intent: SelectionIntent; updatedAt?: string }>;
  /** @deprecated 식당은 일정 생성 시 Day별 삽입 — 관광지 ID만 반환 */
  manualDiningPlaceIds?: string[];
}): string[] {
  const plan = buildRouteDiningPlan(input);
  return plan.tourPlaceIds;
}
