import {
  injectMealPlaceIdsForDaySlice,
  isDiningPlace,
} from "@/lib/itineraryMeals";
import { isLodgingPlace, isLodgingPlaceId } from "@/lib/placeLodging";
import { shouldSkipCavePlace } from "@/lib/caveVisitConditions";
import { resolveEffectiveThemes } from "@/lib/regionalPreferences";
import { getDistanceKm } from "@/lib/geoUtils";
import { parseEstimatedDurationMinutes } from "@/services/itineraryEditService";
import type { EngineContext } from "@/services/engines/engineContext";
import { getDurationMatrix } from "@/services/engines/durationMatrixCache";
import {
  averageLegMinutes,
  legMinutesForPlaceIdOrder,
} from "@/lib/itineraryLegMinutes";
import { resolveDayRouteAnchors } from "@/lib/lodgingDayAnchors";
import {
  extractLegMinutesFromMatrix,
  haversineMinutes,
  optimizeVisitOrderFromDepots,
  optimizeVisitOrderWithMatrix,
} from "@/services/engines/routeEngine";
import type { TripLodgingPlan } from "@/types/travel";
import type { ItineraryRoutingSource } from "@/types/travel";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import {
  getDayCountForDuration,
  getMaxAttractionStopsForDay,
} from "@/lib/travelDuration";
import {
  resolveRouteMatrixOptions,
  type RouteMatrixProfile,
} from "@/lib/routeMatrixPreference";
import type {
  Coordinates,
  ItineraryDay,
  Transportation,
  TripPace,
  TripPreferences,
} from "@/types/travel";

function isCultureOnlyTrip(preferences: TripPreferences): boolean {
  const themes = resolveEffectiveThemes(preferences);
  return themes.length === 1 && themes[0] === "culture";
}

function tourPlaceIdsPreservingOrder(placeIds: string[]): string[] {
  return placeIds.filter((placeId) => {
    const place = getCatalogPlaceById(placeId);
    return place && !isDiningPlace(place);
  });
}

const BETWEEN_STOP_BUFFER_MINUTES = 10;

export interface DayScheduleBudget {
  /** 체류 + 이동 + 버퍼 합산 상한 (분) */
  maxActiveMinutes: number;
}

export interface PlannedDaySlice {
  day: ItineraryDay;
  placeIds: string[];
}

export interface ScheduledItineraryPlan {
  slices: PlannedDaySlice[];
  orderedPlaceIds: string[];
  totalRouteSeconds: number;
  routingSource?: ItineraryRoutingSource;
  /** orderedPlaceIds[i] → orderedPlaceIds[i+1] 이동 분 */
  orderedLegMinutes?: number[];
  dayLodgingMeta?: Partial<
    Record<
      ItineraryDay,
      {
        departMinutes: number;
        returnMinutes: number;
        dayType?: import("@/types/travel").LodgingDayType;
      }
    >
  >;
}

/** 하루 활동 예산(분) — 식사·이동·정류장 버퍼 포함 기준 (relaxed 7h / balanced 9h / packed 11h) */
export function resolveDayScheduleBudget(pace: TripPace): DayScheduleBudget {
  switch (pace) {
    case "relaxed":
      return { maxActiveMinutes: 420 };
    case "packed":
      return { maxActiveMinutes: 660 };
    default:
      return { maxActiveMinutes: 540 };
  }
}

function getStayMinutesForPlaceId(placeId: string): number {
  const place = getCatalogPlaceById(placeId);
  return place ? parseEstimatedDurationMinutes(place.estimatedDuration) : 60;
}

/** 연속 구간 [from..to] 체류·이동·버퍼 합(분) */
export function computeSliceLoadMinutes(
  placeIds: string[],
  legMinutes: number[],
  fromIndex: number,
  toIndex: number,
  transportation: Transportation = "car",
): number {
  const fallbackLeg = averageLegMinutes(legMinutes, transportation);
  let total = 0;
  for (let i = fromIndex; i <= toIndex; i += 1) {
    total += getStayMinutesForPlaceId(placeIds[i]) + BETWEEN_STOP_BUFFER_MINUTES;
    if (i < toIndex) {
      total += legMinutes[i] ?? fallbackLeg;
    }
  }
  return total;
}

/**
 * 1박2일 Day 경계: 누적 소요시간 균형 + 구간 간 거리(지리 단절)이 큰 지점 우선.
 * @returns Day1의 마지막 정류장 인덱스(inclusive)
 */
export function findGeographicTimeDaySplit(
  placeIds: string[],
  legMinutes: number[],
  budget: DayScheduleBudget,
  transportation: Transportation = "car",
): number {
  const n = placeIds.length;
  if (n <= 1) {
    return n - 1;
  }

  const totalLoad = computeSliceLoadMinutes(placeIds, legMinutes, 0, n - 1, transportation);
  const targetHalf = totalLoad / 2;
  const avgLeg = averageLegMinutes(legMinutes, transportation);

  let bestSplit = Math.floor((n - 1) / 2);
  let bestScore = -Infinity;

  for (let split = 0; split < n - 1; split += 1) {
    const dayOneLoad = computeSliceLoadMinutes(
      placeIds,
      legMinutes,
      0,
      split,
      transportation,
    );
    const dayTwoLoad = computeSliceLoadMinutes(
      placeIds,
      legMinutes,
      split + 1,
      n - 1,
      transportation,
    );

    const overBudget =
      Math.max(0, dayOneLoad - budget.maxActiveMinutes) +
      Math.max(0, dayTwoLoad - budget.maxActiveMinutes);
    const timeBalance = -Math.abs(dayOneLoad - targetHalf);

    const from = getCatalogPlaceById(placeIds[split])?.coordinates;
    const to = getCatalogPlaceById(placeIds[split + 1])?.coordinates;
    const geoKm = from && to ? getDistanceKm(from, to) : 0;
    const geoBreak = geoKm / Math.max((avgLeg / 45) * 25, 8);

    const score = geoBreak * 4 + timeBalance * 0.08 - overBudget * 60;

    if (score > bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }

  return bestSplit;
}

function findConstrainedGeographicDaySplit(
  placeIds: string[],
  legMinutes: number[],
  budget: DayScheduleBudget,
  transportation: Transportation,
  minDayOneCount: number,
  maxDayOneCount: number,
): number {
  const n = placeIds.length;
  if (n <= 1) {
    return n - 1;
  }

  const minSplit = Math.max(0, minDayOneCount - 1);
  const maxSplit = Math.min(maxDayOneCount - 1, n - 2);
  if (minSplit > maxSplit) {
    return Math.min(maxDayOneCount - 1, n - 1);
  }

  const totalLoad = computeSliceLoadMinutes(placeIds, legMinutes, 0, n - 1, transportation);
  const targetHalf = totalLoad / 2;
  const avgLeg = averageLegMinutes(legMinutes, transportation);

  let bestSplit = Math.floor((minSplit + maxSplit) / 2);
  let bestScore = -Infinity;

  for (let split = minSplit; split <= maxSplit; split += 1) {
    const dayOneLoad = computeSliceLoadMinutes(
      placeIds,
      legMinutes,
      0,
      split,
      transportation,
    );
    const dayTwoLoad = computeSliceLoadMinutes(
      placeIds,
      legMinutes,
      split + 1,
      n - 1,
      transportation,
    );

    const overBudget =
      Math.max(0, dayOneLoad - budget.maxActiveMinutes) +
      Math.max(0, dayTwoLoad - budget.maxActiveMinutes);
    const timeBalance = -Math.abs(dayOneLoad - targetHalf);

    const from = getCatalogPlaceById(placeIds[split])?.coordinates;
    const to = getCatalogPlaceById(placeIds[split + 1])?.coordinates;
    const geoKm = from && to ? getDistanceKm(from, to) : 0;
    const geoBreak = geoKm / Math.max((avgLeg / 45) * 25, 8);

    const score = geoBreak * 4 + timeBalance * 0.08 - overBudget * 60;

    if (score > bestScore) {
      bestScore = score;
      bestSplit = split;
    }
  }

  return bestSplit;
}

function splitPoolByCapsAndGeography(
  pool: string[],
  caps: readonly number[],
  legMinutes: number[],
  budget: DayScheduleBudget,
  transportation: Transportation,
): string[][] {
  if (caps.length === 1) {
    return [pool.slice(0, caps[0])];
  }
  if (pool.length === 0) {
    return caps.map(() => []);
  }
  if (pool.length === 1) {
    return [pool, ...caps.slice(1).map(() => [])];
  }

  const dayCap = caps[0];
  const restCaps = caps.slice(1);
  const restCapSum = restCaps.reduce((sum, cap) => sum + cap, 0);
  const minDayOneCount = Math.max(1, pool.length - restCapSum);
  const maxDayOneCount = Math.min(dayCap, pool.length - 1);

  const splitInclusive = findConstrainedGeographicDaySplit(
    pool,
    legMinutes,
    budget,
    transportation,
    minDayOneCount,
    maxDayOneCount,
  );

  const firstDay = pool.slice(0, splitInclusive + 1);
  const rest = pool.slice(splitInclusive + 1);
  const restLegMinutes = legMinutes.slice(splitInclusive);
  const restChunks = splitPoolByCapsAndGeography(
    rest,
    restCaps,
    restLegMinutes,
    budget,
    transportation,
  );

  return [firstDay, ...restChunks];
}

/** 최적화된 관광 순서를 Day별 상한·지리 단절 기준으로 분배 */
export function splitPlaceIdsByCapsAndGeography(
  orderedPlaceIds: string[],
  preferences: Pick<TripPreferences, "duration" | "pace" | "transportation">,
  legMinutes: number[],
): string[][] {
  const dayCount = getDayCountForDuration(preferences.duration);
  if (dayCount <= 1) {
    return [orderedPlaceIds];
  }

  const caps = Array.from({ length: dayCount }, (_, index) =>
    getMaxAttractionStopsForDay(index + 1, preferences.pace, preferences.duration),
  );
  const totalCap = caps.reduce((sum, cap) => sum + cap, 0);
  const pool = orderedPlaceIds.slice(0, totalCap);
  if (pool.length === 0) {
    return caps.map(() => []);
  }

  const budget = resolveDayScheduleBudget(preferences.pace);
  return splitPoolByCapsAndGeography(
    pool,
    caps,
    legMinutes,
    budget,
    preferences.transportation,
  );
}

function splitPlaceIdsIntoDayChunks(
  placeIds: string[],
  dayCount: number,
  legMinutes: number[],
  budget: DayScheduleBudget,
  transportation: Transportation,
): string[][] {
  if (dayCount <= 1 || placeIds.length <= 1) {
    return [placeIds];
  }

  const splitInclusive = findGeographicTimeDaySplit(
    placeIds,
    legMinutes,
    budget,
    transportation,
  );
  const firstDay = placeIds.slice(0, splitInclusive + 1);
  const rest = placeIds.slice(splitInclusive + 1);

  if (rest.length === 0) {
    return [firstDay];
  }

  const restLegMinutes = legMinutes.slice(splitInclusive);
  const restChunks = splitPlaceIdsIntoDayChunks(
    rest,
    dayCount - 1,
    restLegMinutes,
    budget,
    transportation,
  );

  return [firstDay, ...restChunks];
}

/** 1박 숙소·펜션 등 — Day 경계에서 동일 placeId 중복 허용 */
export function isOvernightLodgingPlaceId(placeId: string): boolean {
  return isLodgingPlaceId(placeId);
}

/**
 * Day N 마지막과 Day N+1 첫 placeId가 같으면 Day N+1 선두에서 제거.
 * 숙박(펜션·호텔)은 전날 밤 묵는 장소로 Day2 시작점에 남길 수 있음.
 */
export function dedupeCrossDaySliceBoundaries(
  slices: PlannedDaySlice[],
): PlannedDaySlice[] {
  if (slices.length <= 1) {
    return slices.map((slice) => ({ ...slice, placeIds: [...slice.placeIds] }));
  }

  const result: PlannedDaySlice[] = [
    { day: slices[0].day, placeIds: [...slices[0].placeIds] },
  ];

  for (let i = 1; i < slices.length; i += 1) {
    const prev = result[i - 1];
    let ids = [...slices[i].placeIds];

    while (
      ids.length > 0 &&
      prev.placeIds.length > 0 &&
      ids[0] === prev.placeIds[prev.placeIds.length - 1] &&
      !isOvernightLodgingPlaceId(ids[0])
    ) {
      ids = ids.slice(1);
    }

    result.push({ day: slices[i].day, placeIds: ids });
  }

  return result;
}

function isAttractionPlaceId(placeId: string): boolean {
  const place = getCatalogPlaceById(placeId);
  if (!place) return true;
  return !isDiningPlace(place) && !isLodgingPlace(place);
}

function hasNonAttractionStops(placeIds: string[]): boolean {
  return placeIds.some((placeId) => {
    const place = getCatalogPlaceById(placeId);
    return Boolean(place && (isDiningPlace(place) || isLodgingPlace(place)));
  });
}

function splitMixedPlaceIdsByDayCaps(
  orderedPlaceIds: string[],
  caps: readonly number[],
  dayCount: number,
): string[][] {
  const chunks: string[][] = Array.from({ length: dayCount }, () => []);
  const attractionCounts = Array.from({ length: dayCount }, () => 0);
  let day = 0;

  for (const placeId of orderedPlaceIds) {
    const targetDay = Math.min(day, dayCount - 1);
    if (isAttractionPlaceId(placeId)) {
      while (day < dayCount - 1 && attractionCounts[day] >= caps[day]) {
        day += 1;
      }
      const assignDay = Math.min(day, dayCount - 1);
      chunks[assignDay].push(placeId);
      attractionCounts[assignDay] += 1;
    } else {
      chunks[targetDay].push(placeId);
    }
  }

  return chunks;
}

/** 최적화된 관광지 순서를 페이스·Day별 관광 상한에 맞게 분배 (지리적으로 가까운 묶음 우선) */
export function splitPlaceIdsByDayCaps(
  orderedPlaceIds: string[],
  preferences: Pick<TripPreferences, "duration" | "pace" | "transportation">,
): string[][] {
  const dayCount = getDayCountForDuration(preferences.duration);
  if (dayCount <= 1) {
    return [orderedPlaceIds];
  }

  const caps = Array.from({ length: dayCount }, (_, index) =>
    getMaxAttractionStopsForDay(index + 1, preferences.pace, preferences.duration),
  );

  if (hasNonAttractionStops(orderedPlaceIds)) {
    return splitMixedPlaceIdsByDayCaps(orderedPlaceIds, caps, dayCount);
  }

  const totalCap = caps.reduce((sum, cap) => sum + cap, 0);
  const pool = orderedPlaceIds.slice(0, totalCap);
  if (pool.length === 0) {
    return caps.map(() => []);
  }

  const hasCoordinates = pool.every((id) => Boolean(getCatalogPlaceById(id)));
  if (!hasCoordinates) {
    return splitPlaceIdsSequentiallyByCaps(pool, caps);
  }

  const chunks: string[][] = caps.map(() => []);
  const remaining = new Set(pool);

  for (let day = 0; day < dayCount; day += 1) {
    const cap = caps[day];
    if (remaining.size === 0 || cap === 0) continue;

    const seed =
      day === 0
        ? pool[0]
        : [...remaining].sort((a, b) => {
            const aPlace = getCatalogPlaceById(a);
            const bPlace = getCatalogPlaceById(b);
            const prevCentroid = centroidOfIds(chunks[day - 1]);
            if (!aPlace || !bPlace || !prevCentroid) return 0;
            return (
              getDistanceKm(prevCentroid, aPlace.coordinates) -
              getDistanceKm(prevCentroid, bPlace.coordinates)
            );
          })[remaining.size - 1];

    if (!seed || !remaining.has(seed)) continue;

    const dayIds: string[] = [seed];
    remaining.delete(seed);

    while (dayIds.length < cap && remaining.size > 0) {
      const last = getCatalogPlaceById(dayIds[dayIds.length - 1]);
      if (!last) break;
      const next = [...remaining].sort((a, b) => {
        const aPlace = getCatalogPlaceById(a);
        const bPlace = getCatalogPlaceById(b);
        if (!aPlace || !bPlace) return 0;
        return (
          getDistanceKm(last.coordinates, aPlace.coordinates) -
          getDistanceKm(last.coordinates, bPlace.coordinates)
        );
      })[0];
      if (!next) break;
      dayIds.push(next);
      remaining.delete(next);
    }

    chunks[day] = dayIds;
  }

  return chunks;
}

function splitPlaceIdsSequentiallyByCaps(pool: string[], caps: readonly number[]): string[][] {
  const chunks: string[][] = caps.map(() => []);
  let cursor = 0;
  for (let day = 0; day < caps.length && cursor < pool.length; day += 1) {
    while (cursor < pool.length && chunks[day].length < caps[day]) {
      chunks[day].push(pool[cursor]);
      cursor += 1;
    }
  }
  return chunks;
}

function centroidOfIds(placeIds: string[]): Coordinates | null {
  const places = placeIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is NonNullable<ReturnType<typeof getCatalogPlaceById>> => Boolean(place));
  if (places.length === 0) return null;
  return {
    lat: places.reduce((sum, place) => sum + place.coordinates.lat, 0) / places.length,
    lng: places.reduce((sum, place) => sum + place.coordinates.lng, 0) / places.length,
  };
}

export async function splitPlaceIdsByScheduleAndGeography(
  orderedPlaceIds: string[],
  preferences: TripPreferences,
  transportation: Transportation,
  precomputed?: {
    legMinutes?: number[];
    matrix?: number[][];
    matrixSourcePlaceIds?: string[];
  },
  _routeProfile: RouteMatrixProfile = "accurate",
): Promise<PlannedDaySlice[]> {
  const dayCount = getDayCountForDuration(preferences.duration);
  if (dayCount <= 1) {
    return [{ day: 1, placeIds: orderedPlaceIds }];
  }

  const legMinutes = precomputed?.legMinutes;
  const useGeographicCaps =
    legMinutes &&
    legMinutes.length >= Math.max(0, orderedPlaceIds.length - 1) &&
    !hasNonAttractionStops(orderedPlaceIds);

  const chunks = useGeographicCaps
    ? splitPlaceIdsByCapsAndGeography(orderedPlaceIds, preferences, legMinutes)
    : splitPlaceIdsByDayCaps(orderedPlaceIds, preferences);

  return Array.from({ length: dayCount }, (_, index) => ({
    day: (index + 1) as ItineraryDay,
    placeIds: chunks[index] ?? [],
  }));
}

/**
 * 최적 동선 → (1박2일) 소요·지리 Day 분할 → Day별 식사 삽입·재최적화 → 방문 시각 배정
 */
export async function scheduleItineraryFromPlaceIds(
  placeIds: string[],
  preferences: TripPreferences,
  context: EngineContext,
  options?: {
    anchorPlaceId?: string | null;
    skipMealInjection?: boolean;
    /** true면 placeIds를 이미 최적 순서로 간주하고 재최적화 생략 */
    preserveOrder?: boolean;
    routeProfile?: RouteMatrixProfile;
    lodgingPlan?: TripLodgingPlan;
  },
): Promise<ScheduledItineraryPlan> {
  const routeProfile = options?.routeProfile ?? "accurate";
  const transportation = preferences.transportation;
  const anchorPlaceId = options?.anchorPlaceId ?? context.anchorPlaceId ?? null;
  const lodgingPlan = options?.lodgingPlan ?? context.lodgingPlan;

  let orderedIds = [...new Set(placeIds)].filter((id) => Boolean(getCatalogPlaceById(id)));

  if (!options?.preserveOrder && !isCultureOnlyTrip(preferences)) {
    orderedIds = filterAttractionPlaceIds(orderedIds, preferences, {
      anchorPlaceId,
    });
  }
  let totalRouteSeconds = 0;
  let routingSource: ItineraryRoutingSource = "haversine";

  const visitOrderMatrixOpts = resolveRouteMatrixOptions(
    orderedIds.length,
    "visit-order",
    routeProfile,
  );
  const matrixBootstrap = await getDurationMatrix(
    orderedIds,
    transportation,
    preferences.zoneId,
    {
      preferHaversine: visitOrderMatrixOpts.preferHaversine,
      routeProfile,
    },
  );
  const scheduleMatrix: number[][] = matrixBootstrap.matrix;
  const scheduleMatrixSourceIds: string[] = matrixBootstrap.placeIds;
  routingSource = matrixBootstrap.routingSource;

  if (!options?.preserveOrder && orderedIds.length > 1) {
    const route = optimizeVisitOrderWithMatrix(
      orderedIds,
      matrixBootstrap.matrix,
      matrixBootstrap.coords,
      {
        anchorPlaceId,
        transportation,
        pace: preferences.pace,
      },
    );
    orderedIds = route.orderedPlaceIds;
    totalRouteSeconds += route.totalDurationSeconds;
  }

  const splitLegMinutes =
    scheduleMatrix && scheduleMatrixSourceIds
      ? legMinutesForPlaceIdOrder(
          orderedIds,
          scheduleMatrixSourceIds,
          scheduleMatrix,
          transportation,
        )
      : undefined;

  const daySlices = await splitPlaceIdsByScheduleAndGeography(
    orderedIds,
    preferences,
    transportation,
    splitLegMinutes ? { legMinutes: splitLegMinutes } : undefined,
    routeProfile,
  );

  const optimizedSlices: PlannedDaySlice[] = [];
  const usedMealPlaceIds = new Set<string>();
  const dayLodgingMeta: Partial<
    Record<
      ItineraryDay,
      {
        departMinutes: number;
        returnMinutes: number;
        dayType?: import("@/types/travel").LodgingDayType;
      }
    >
  > = {};
  for (const slice of daySlices) {
    const dayAnchors = resolveDayRouteAnchors(slice.day, preferences, lodgingPlan);
    let tourIds = tourPlaceIdsPreservingOrder(slice.placeIds);

    if (!options?.preserveOrder && dayAnchors) {
      const dayMatrixOpts = resolveRouteMatrixOptions(tourIds.length, "day-local", routeProfile);
      const dayMatrix = await getDurationMatrix(tourIds, transportation, preferences.zoneId, {
        preferHaversine: dayMatrixOpts.preferHaversine,
        routeProfile,
      });
      if (dayMatrix.routingSource === "kakao") {
        routingSource = "kakao";
      }

      if (tourIds.length > 1) {
        const dayRoute = optimizeVisitOrderFromDepots(
          dayAnchors.start.coordinates,
          dayAnchors.end.coordinates,
          tourIds,
          dayMatrix.matrix,
          dayMatrix.placeIds,
          {
            anchorPlaceId: slice.day === 1 ? anchorPlaceId : null,
            transportation,
          },
        );
        totalRouteSeconds += dayRoute.totalDurationSeconds;
        tourIds = dayRoute.orderedPlaceIds;
        dayLodgingMeta[slice.day] = {
          departMinutes: dayRoute.departMinutes,
          returnMinutes: dayRoute.returnMinutes,
          dayType: dayAnchors.dayType,
        };
      } else if (tourIds.length === 1) {
        const place = getCatalogPlaceById(tourIds[0]);
        if (place) {
          const depart = haversineMinutes(
            dayAnchors.start.coordinates,
            place.coordinates,
            transportation,
          );
          const ret = haversineMinutes(
            place.coordinates,
            dayAnchors.end.coordinates,
            transportation,
          );
          totalRouteSeconds += (depart + ret) * 60;
          dayLodgingMeta[slice.day] = {
            departMinutes: depart,
            returnMinutes: ret,
            dayType: dayAnchors.dayType,
          };
        }
      }
    } else if (tourIds.length > 1 && !options?.preserveOrder) {
      const dayMatrixOpts = resolveRouteMatrixOptions(tourIds.length, "day-local", routeProfile);
      const dayMatrix = await getDurationMatrix(tourIds, transportation, preferences.zoneId, {
        preferHaversine: dayMatrixOpts.preferHaversine,
        routeProfile,
      });
      if (dayMatrix.routingSource === "kakao") {
        routingSource = "kakao";
      }
      const dayRoute = optimizeVisitOrderWithMatrix(
        tourIds,
        dayMatrix.matrix,
        dayMatrix.coords,
        {
          anchorPlaceId: slice.day === 1 ? anchorPlaceId : null,
          transportation,
          pace: preferences.pace,
        },
      );
      totalRouteSeconds += dayRoute.totalDurationSeconds;
      tourIds = dayRoute.orderedPlaceIds;
    }

    let ids = tourIds;
    const beforeMeals = ids;

    if (!options?.skipMealInjection && !isCultureOnlyTrip(preferences)) {
      ids = await injectMealPlaceIdsForDaySlice(ids, context, {
        day: slice.day,
        duration: preferences.duration,
        excludeMealPlaceIds: usedMealPlaceIds,
      });
      for (const id of ids) {
        if (!beforeMeals.includes(id)) {
          const place = getCatalogPlaceById(id);
          if (place && isDiningPlace(place)) {
            usedMealPlaceIds.add(id);
          }
        }
      }
    }

    optimizedSlices.push({ day: slice.day, placeIds: ids });
  }

  const dedupedSlices = dedupeCrossDaySliceBoundaries(optimizedSlices);
  const orderedPlaceIds = dedupedSlices.flatMap((slice) => slice.placeIds);

  const finalLegOpts = resolveRouteMatrixOptions(
    orderedPlaceIds.length,
    "final-legs",
    routeProfile,
  );
  const finalMatrix = await getDurationMatrix(
    orderedPlaceIds,
    transportation,
    preferences.zoneId,
    {
      preferHaversine: finalLegOpts.preferHaversine,
      routeProfile,
    },
  );
  const orderedLegMinutes = legMinutesForPlaceIdOrder(
    orderedPlaceIds,
    finalMatrix.placeIds,
    finalMatrix.matrix,
    transportation,
  );
  if (finalMatrix.routingSource === "kakao") {
    routingSource = "kakao";
  }

  return {
    slices: dedupedSlices,
    orderedPlaceIds,
    totalRouteSeconds,
    routingSource,
    orderedLegMinutes,
    dayLodgingMeta: Object.keys(dayLodgingMeta).length > 0 ? dayLodgingMeta : undefined,
  };
}

/** 관광지 ID만 추출 (식당은 일정 단계에서 삽입) */
export function filterAttractionPlaceIds(
  placeIds: string[],
  preferences: TripPreferences,
  options?: {
    anchorPlaceId?: string | null;
    weatherSummary?: string | null;
  },
): string[] {
  const caveOpts = {
    season: preferences.season,
    anchorPlaceId: options?.anchorPlaceId ?? null,
    weatherSummary: options?.weatherSummary ?? null,
  };

  let filtered = placeIds;
  if (!isCultureOnlyTrip(preferences)) {
    filtered = filtered.filter((id) => {
      const place = getCatalogPlaceById(id);
      return place && !isDiningPlace(place) && !isLodgingPlace(place);
    });
  } else {
    filtered = filtered.filter((id) => {
      const place = getCatalogPlaceById(id);
      return place && !isLodgingPlace(place);
    });
  }

  return filtered.filter((id) => {
    const place = getCatalogPlaceById(id);
    if (!place) return false;
    return !shouldSkipCavePlace(place, caveOpts);
  });
}
