import { getDistanceKm } from "@/lib/geoUtils";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { RouteMatrixProfile } from "@/lib/routeMatrixPreference";
import type {
  Coordinates,
  ItineraryDay,
  ItineraryRoutingSource,
  ItineraryStop,
  TripPace,
  Transportation,
  TravelZoneId,
} from "@/types/travel";

/** Kakao Directions는 차량(도로) 기준 — 대중교통은 체감 배율 적용 */
const PUBLIC_TRANSIT_DURATION_FACTOR = 1.45;
const PUBLIC_TRANSIT_BUFFER_MINUTES = 6;

export interface RouteOptimizationResult {
  orderedPlaceIds: string[];
  totalDurationSeconds: number;
  usedKakao: boolean;
  polyline?: Coordinates[];
}

export function haversineMinutes(from: Coordinates, to: Coordinates, transportation: Transportation): number {
  const km = getDistanceKm(from, to);
  const speedKmh = transportation === "car" ? 45 : 28;
  return Math.round((km / speedKmh) * 60);
}

export function getTransportationLabel(transportation: Transportation): string {
  return transportation === "public-transit" ? "대중교통" : "차량";
}

export function adjustMinutesForTransportation(
  driveMinutes: number,
  transportation: Transportation,
): number {
  if (transportation === "car") {
    return Math.max(1, driveMinutes);
  }
  return Math.max(
    1,
    Math.round(driveMinutes * PUBLIC_TRANSIT_DURATION_FACTOR) + PUBLIC_TRANSIT_BUFFER_MINUTES,
  );
}

export function formatMinutesLabel(minutes: number): string {
  if (minutes < 60) return `약 ${minutes}분`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins > 0) return `약 ${hours}시간 ${mins}분`;
  return `약 ${hours}시간`;
}

export function formatMovementLeg(
  minutes: number,
  transportation: Transportation,
  nextPlaceName: string,
): string {
  const mode = getTransportationLabel(transportation);
  return `→ ${nextPlaceName} · ${mode} ${formatMinutesLabel(minutes)}`;
}

async function fetchSegmentMinutes(
  from: Coordinates,
  to: Coordinates,
  transportation: Transportation,
): Promise<{ minutes: number; usedKakao: boolean; path?: Coordinates[] }> {
  // Server bulk leg enrichment (일정 생성·메타 재계산): Haversine만 사용.
  // Kakao Directions는 구간당 REST 호출이 누적되어 생성 화면이 수십 초~타임아웃될 수 있음.
  // 지도 폴리라인·실경로는 클라이언트 `/api/external/kakao/directions`에서 표시.
  if (typeof window === "undefined") {
    return {
      minutes: haversineMinutes(from, to, transportation),
      usedKakao: false,
    };
  } else {
    try {
      const params = new URLSearchParams({
        originLat: String(from.lat),
        originLng: String(from.lng),
        destLat: String(to.lat),
        destLng: String(to.lng),
      });
      const res = await fetch(`/api/external/kakao/directions?${params}`);
      if (res.ok) {
        const data = (await res.json()) as { durationSeconds?: number; path?: Coordinates[] };
        if (data.durationSeconds) {
          const driveMinutes = Math.max(1, Math.round(data.durationSeconds / 60));
          return {
            minutes: adjustMinutesForTransportation(driveMinutes, transportation),
            usedKakao: true,
            path: data.path,
          };
        }
      }
    } catch {
      /* fallback */
    }
  }

  const raw = haversineMinutes(from, to, transportation);
  return {
    minutes:
      transportation === "car" ? raw : Math.max(1, raw + PUBLIC_TRANSIT_BUFFER_MINUTES),
    usedKakao: false,
  };
}

function buildHaversineMatrix(
  coords: Coordinates[],
  transportation: Transportation,
): number[][] {
  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        matrix[i][j] = haversineMinutes(coords[i], coords[j], transportation);
      }
    }
  }
  return matrix;
}

function tourCost(order: number[], matrix: number[][]): number {
  let total = 0;
  for (let i = 0; i < order.length - 1; i += 1) {
    total += matrix[order[i]][order[i + 1]];
  }
  return total;
}

function nearestNeighborOrder(matrix: number[][], startIndex: number): number[] {
  const n = matrix.length;
  const visited = new Set<number>([startIndex]);
  const order = [startIndex];

  while (visited.size < n) {
    const last = order[order.length - 1];
    let best = -1;
    let bestCost = Infinity;
    for (let j = 0; j < n; j += 1) {
      if (visited.has(j)) continue;
      if (matrix[last][j] < bestCost) {
        bestCost = matrix[last][j];
        best = j;
      }
    }
    if (best < 0) break;
    visited.add(best);
    order.push(best);
  }

  return order;
}

/** 동해안 북→남(위도 내림) 등 해안대 주축 정렬 */
function resolveCorridorAxis(coords: Coordinates[]): "lat" | "lng" {
  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);
  const latSpan = Math.max(...lats) - Math.min(...lats);
  const lngSpan = Math.max(...lngs) - Math.min(...lngs);
  return latSpan >= lngSpan ? "lat" : "lng";
}

function corridorSeedOrder(
  coords: Coordinates[],
  anchorIndex: number,
  northFirst: boolean,
): number[] {
  const n = coords.length;
  const axis = resolveCorridorAxis(coords);
  const rest = Array.from({ length: n }, (_, i) => i).filter((i) => i !== anchorIndex);
  rest.sort((a, b) => {
    const av = axis === "lat" ? coords[a].lat : coords[a].lng;
    const bv = axis === "lat" ? coords[b].lat : coords[b].lng;
    return northFirst ? bv - av : av - bv;
  });
  return [anchorIndex, ...rest];
}

function pickBestTourOrder(
  matrix: number[][],
  coords: Coordinates[],
  anchorIndex: number,
  options?: { allowAlternateStarts?: boolean },
): number[] {
  const n = matrix.length;
  const seeds: number[][] = [
    nearestNeighborOrder(matrix, anchorIndex),
    corridorSeedOrder(coords, anchorIndex, true),
    corridorSeedOrder(coords, anchorIndex, false),
  ];

  if (options?.allowAlternateStarts && n >= 3) {
    const minLatIdx = coords.reduce((best, c, i) => (c.lat < coords[best].lat ? i : best), 0);
    const maxLatIdx = coords.reduce((best, c, i) => (c.lat > coords[best].lat ? i : best), 0);
    if (minLatIdx !== anchorIndex) {
      seeds.push(nearestNeighborOrder(matrix, minLatIdx));
    }
    if (maxLatIdx !== anchorIndex && maxLatIdx !== minLatIdx) {
      seeds.push(nearestNeighborOrder(matrix, maxLatIdx));
    }
  }

  let bestOrder = seeds[0];
  let bestCost = Infinity;

  for (const seed of seeds) {
    const candidate = n >= 3 ? twoOptLite(seed, matrix) : seed;
    const cost = tourCost(candidate, matrix);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = candidate;
    }
  }

  return bestOrder;
}

function twoOptLite(order: number[], matrix: number[][]): number[] {
  const improved = [...order];
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 1; i < improved.length - 2; i += 1) {
      for (let j = i + 1; j < improved.length - 1; j += 1) {
        const a = improved[i - 1];
        const b = improved[i];
        const c = improved[j];
        const d = improved[j + 1];
        const before = matrix[a][b] + matrix[c][d];
        const after = matrix[a][c] + matrix[b][d];
        if (after + 0.01 < before) {
          improved.splice(i, j - i + 1, ...improved.slice(i, j + 1).reverse());
          changed = true;
        }
      }
    }
  }
  return improved;
}

export function extractLegMinutesFromMatrix(matrix: number[][], n: number): number[] {
  const legMinutes: number[] = [];
  for (let i = 0; i < n - 1; i += 1) {
    legMinutes.push(matrix[i]?.[i + 1] ?? 0);
  }
  return legMinutes;
}

export { legMinutesForPlaceIdOrder } from "@/lib/itineraryLegMinutes";

export async function buildDurationMatrix(
  placeIds: string[],
  transportation: Transportation,
  options?: { preferHaversine?: boolean },
): Promise<{ matrix: number[][]; coords: Coordinates[]; usedKakao: boolean }> {
  const coords = placeIds
    .map((id) => getCatalogPlaceById(id)?.coordinates)
    .filter((c): c is Coordinates => Boolean(c));

  if (coords.length !== placeIds.length || options?.preferHaversine) {
    return {
      matrix: buildHaversineMatrix(coords, transportation),
      coords,
      usedKakao: false,
    };
  }

  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  let usedKakao = false;

  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      const seg = await fetchSegmentMinutes(coords[i], coords[j], transportation);
      matrix[i][j] = seg.minutes;
      matrix[j][i] = seg.minutes;
      if (seg.usedKakao) usedKakao = true;
    }
  }

  return { matrix, coords, usedKakao };
}

export function optimizeVisitOrderWithMatrix(
  placeIds: string[],
  matrix: number[][],
  coords: Coordinates[],
  options?: {
    anchorPlaceId?: string | null;
    transportation?: Transportation;
    pace?: TripPace;
  },
): RouteOptimizationResult {
  const unique = [...new Set(placeIds)].filter((id) => Boolean(getCatalogPlaceById(id)));
  if (unique.length <= 1) {
    return {
      orderedPlaceIds: unique,
      totalDurationSeconds: 0,
      usedKakao: false,
    };
  }

  if (matrix.length !== unique.length || coords.length !== unique.length) {
    const withCoords = unique.filter((id) => {
      const c = getCatalogPlaceById(id)?.coordinates;
      return c && Number.isFinite(c.lat) && Number.isFinite(c.lng);
    });
    return {
      orderedPlaceIds: withCoords,
      totalDurationSeconds: 0,
      usedKakao: false,
    };
  }

  const anchorIdx = options?.anchorPlaceId
    ? unique.indexOf(options.anchorPlaceId)
    : -1;

  let order: number[];
  if (anchorIdx >= 0) {
    order = pickBestTourOrder(matrix, coords, anchorIdx);
  } else {
    const starts = new Set<number>([0]);
    if (coords.length >= 2) {
      starts.add(coords.reduce((best, c, i) => (c.lat < coords[best].lat ? i : best), 0));
      starts.add(coords.reduce((best, c, i) => (c.lat > coords[best].lat ? i : best), 0));
    }
    let bestOrder = pickBestTourOrder(matrix, coords, 0, { allowAlternateStarts: true });
    let bestCost = tourCost(bestOrder, matrix);
    for (const start of starts) {
      const candidate = pickBestTourOrder(matrix, coords, start, {
        allowAlternateStarts: true,
      });
      const cost = tourCost(candidate, matrix);
      if (cost < bestCost) {
        bestCost = cost;
        bestOrder = candidate;
      }
    }
    order = bestOrder;
  }

  const orderedPlaceIds = order.map((i) => unique[i]);
  let totalMinutes = 0;
  for (let i = 0; i < order.length - 1; i += 1) {
    totalMinutes += matrix[order[i]][order[i + 1]];
  }

  return {
    orderedPlaceIds,
    totalDurationSeconds: totalMinutes * 60,
    usedKakao: false,
  };
}

export interface DepotRouteResult extends RouteOptimizationResult {
  departMinutes: number;
  returnMinutes: number;
}

function roundTripTourCost(
  order: number[],
  matrix: number[][],
  departMinutes: number[],
  returnMinutes: number[],
): number {
  if (order.length === 0) return 0;
  let total = departMinutes[order[0]] ?? 0;
  total += tourCost(order, matrix);
  total += returnMinutes[order[order.length - 1]] ?? 0;
  return total;
}

/** 관광지만 순열 — start/end depot 왕복 비용 포함 */
export function optimizeVisitOrderFromDepots(
  startDepot: Coordinates,
  endDepot: Coordinates,
  placeIds: string[],
  matrix: number[][],
  matrixPlaceIds: string[],
  options?: {
    transportation?: Transportation;
    anchorPlaceId?: string | null;
  },
): DepotRouteResult {
  const transportation = options?.transportation ?? "car";
  const unique = [...new Set(placeIds)].filter((id) => Boolean(getCatalogPlaceById(id)));

  if (unique.length === 0) {
    const minutes = haversineMinutes(startDepot, endDepot, transportation);
    return {
      orderedPlaceIds: [],
      totalDurationSeconds: minutes * 60,
      usedKakao: false,
      departMinutes: 0,
      returnMinutes: minutes,
    };
  }

  if (matrix.length !== unique.length || matrixPlaceIds.length !== unique.length) {
    return {
      orderedPlaceIds: unique,
      totalDurationSeconds: 0,
      usedKakao: false,
      departMinutes: 0,
      returnMinutes: 0,
    };
  }

  const coords = unique.map((id) => getCatalogPlaceById(id)!.coordinates);
  const departMinutes = coords.map((c) => haversineMinutes(startDepot, c, transportation));
  const returnMinutes = coords.map((c) => haversineMinutes(c, endDepot, transportation));

  const anchorIdx = options?.anchorPlaceId
    ? unique.indexOf(options.anchorPlaceId)
    : -1;

  const n = unique.length;
  const indexOrder = Array.from({ length: n }, (_, i) => i);

  const seeds: number[][] = [];
  if (anchorIdx >= 0) {
    seeds.push(pickBestTourOrder(matrix, coords, anchorIdx));
  } else {
    const best = pickBestTourOrder(matrix, coords, 0, { allowAlternateStarts: true });
    seeds.push(best);
    const closestToDepot = indexOrder.reduce((bestI, i) =>
      (departMinutes[i] ?? Infinity) < (departMinutes[bestI] ?? Infinity) ? i : bestI,
    0);
    seeds.push(nearestNeighborOrder(matrix, closestToDepot));
  }

  let bestOrder = seeds[0];
  let bestCost = roundTripTourCost(bestOrder, matrix, departMinutes, returnMinutes);

  for (const seed of seeds) {
    const candidate = n >= 3 ? twoOptLite(seed, matrix) : seed;
    const cost = roundTripTourCost(candidate, matrix, departMinutes, returnMinutes);
    if (cost < bestCost) {
      bestCost = cost;
      bestOrder = candidate;
    }
  }

  const orderedPlaceIds = bestOrder.map((i) => unique[i]);
  const middleMinutes = tourCost(bestOrder, matrix);
  const depart = departMinutes[bestOrder[0]] ?? 0;
  const ret = returnMinutes[bestOrder[bestOrder.length - 1]] ?? 0;

  return {
    orderedPlaceIds,
    totalDurationSeconds: (depart + middleMinutes + ret) * 60,
    usedKakao: false,
    departMinutes: depart,
    returnMinutes: ret,
  };
}

export async function optimizeVisitOrder(
  placeIds: string[],
  options?: {
    anchorPlaceId?: string | null;
    transportation?: Transportation;
    pace?: TripPace;
    preferHaversine?: boolean;
  },
): Promise<RouteOptimizationResult> {
  const unique = [...new Set(placeIds)].filter((id) => Boolean(getCatalogPlaceById(id)));
  if (unique.length <= 1) {
    return {
      orderedPlaceIds: unique,
      totalDurationSeconds: 0,
      usedKakao: false,
    };
  }

  const transportation = options?.transportation ?? "car";
  const { matrix, coords, usedKakao } = await buildDurationMatrix(unique, transportation, {
    preferHaversine: options?.preferHaversine,
  });

  if (matrix.length !== unique.length || coords.length !== unique.length) {
    const withCoords = unique.filter((id) => {
      const c = getCatalogPlaceById(id)?.coordinates;
      return c && Number.isFinite(c.lat) && Number.isFinite(c.lng);
    });
    if (withCoords.length <= 1) {
      return {
        orderedPlaceIds: withCoords,
        totalDurationSeconds: 0,
        usedKakao: false,
      };
    }
    return optimizeVisitOrder(withCoords, options);
  }

  const result = optimizeVisitOrderWithMatrix(unique, matrix, coords, options);
  return { ...result, usedKakao };
}

export function estimateMovingTimeLabel(
  totalSeconds: number,
  stopCount: number,
  transportation: Transportation,
): string {
  const mode = getTransportationLabel(transportation);
  let core: string;

  if (totalSeconds <= 0) {
    const fallback = transportation === "car" ? 50 + stopCount * 8 : 70 + stopCount * 10;
    const hours = Math.floor(fallback / 60);
    const mins = fallback % 60;
    core =
      mins > 0 ? `${hours}시간 ${mins}분` : hours > 0 ? `${hours}시간` : `${fallback}분`;
  } else {
    const minutes = Math.round(totalSeconds / 60);
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) core = `${hours}시간 ${mins}분`;
    else if (hours > 0) core = `${hours}시간`;
    else core = `${mins}분`;
  }

  return `${core} (${mode})`;
}

export async function enrichStopsTravelLegs(
  stops: ItineraryStop[],
  transportation: Transportation,
  zoneId: TravelZoneId = "samcheok-donghae",
  options?: { routeProfile?: RouteMatrixProfile },
): Promise<{ stops: ItineraryStop[]; routingSource: ItineraryRoutingSource }> {
  if (stops.length < 2) {
    return {
      stops: stops.map((stop) => ({ ...stop, travelMinutesToNext: undefined })),
      routingSource: "haversine",
    };
  }

  const routeProfile = options?.routeProfile ?? "accurate";

  const { getDurationMatrix } = await import("@/services/engines/durationMatrixCache");
  const { legMinutesForPlaceIdOrder: legsFromMatrix } = await import(
    "@/lib/itineraryLegMinutes"
  );

  const daySet = new Set<ItineraryDay>();
  stops.forEach((stop) => daySet.add(stop.day));
  const days = Array.from(daySet).sort((a, b) => a - b) as ItineraryDay[];
  const legByStopId = new Map<string, { minutes: number; note: string }>();
  let routingSource: ItineraryRoutingSource = "haversine";

  for (const day of days) {
    const dayStops = stops
      .filter((stop) => stop.day === day)
      .sort((a, b) => a.order - b.order);

    if (dayStops.length < 2) continue;

    const placeIds = dayStops.map((stop) => stop.placeId);
    const matrixResult = await getDurationMatrix(placeIds, transportation, zoneId, {
      routeProfile,
    });
    if (matrixResult.routingSource === "kakao") {
      routingSource = "kakao";
    }
    const legMinutes = legsFromMatrix(
      placeIds,
      matrixResult.placeIds,
      matrixResult.matrix,
      transportation,
    );

    for (let i = 0; i < dayStops.length - 1; i += 1) {
      const from = dayStops[i];
      const to = dayStops[i + 1];
      const minutes = legMinutes[i] ?? estimateLegMinutesBetweenCoords(
        from.coordinates,
        to.coordinates,
        transportation,
      );
      legByStopId.set(from.id, {
        minutes,
        note: formatMovementLeg(minutes, transportation, to.placeName),
      });
    }
  }

  const enrichedStops = stops.map((stop) => {
    const leg = legByStopId.get(stop.id);
    if (!leg) {
      return { ...stop, travelMinutesToNext: undefined };
    }
    return {
      ...stop,
      travelMinutesToNext: leg.minutes,
      movementNote: leg.note,
    };
  });

  return { stops: enrichedStops, routingSource };
}

function estimateLegMinutesBetweenCoords(
  from: Coordinates,
  to: Coordinates,
  transportation: Transportation,
): number {
  return Math.max(1, haversineMinutes(from, to, transportation));
}

export function sumTravelMinutes(stops: ItineraryStop[]): number {
  return stops.reduce((sum, stop) => sum + (stop.travelMinutesToNext ?? 0), 0);
}

export function estimateMovingTimeFromStops(
  stops: ItineraryStop[],
  transportation: Transportation = "car",
): { totalSeconds: number; label: string } {
  if (stops.length < 2) {
    return { totalSeconds: 0, label: estimateMovingTimeLabel(0, stops.length, transportation) };
  }

  let totalMinutes = 0;
  for (let i = 0; i < stops.length - 1; i += 1) {
    totalMinutes += haversineMinutes(
      stops[i].coordinates,
      stops[i + 1].coordinates,
      transportation,
    );
  }

  const totalSeconds = totalMinutes * 60;
  return {
    totalSeconds,
    label: estimateMovingTimeLabel(totalSeconds, stops.length, transportation),
  };
}

export interface ClientRoutePolylineResult {
  path: Coordinates[];
  fallbackLegIndexes: number[];
  /** path index for each input coordinate — used to align visit-order markers */
  waypointIndexes: number[];
  source: "kakao" | "partial" | "fallback";
}

export async function fetchClientRoutePolyline(
  coordinates: Coordinates[],
): Promise<Coordinates[]> {
  const built = await fetchClientRoutePolylineDetailed(coordinates);
  return built.path;
}

export async function fetchClientRoutePolylineDetailed(
  coordinates: Coordinates[],
): Promise<ClientRoutePolylineResult> {
  if (coordinates.length < 2) {
    return {
      path: coordinates,
      fallbackLegIndexes: [],
      waypointIndexes: coordinates.map((_, index) => index),
      source: "fallback",
    };
  }

  try {
    const res = await fetch("/api/external/kakao/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "polyline", coordinates }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        path?: Coordinates[];
        fallbackLegIndexes?: number[];
        waypointIndexes?: number[];
        source?: ClientRoutePolylineResult["source"];
      };
      if (data.path?.length) {
        return {
          path: data.path,
          fallbackLegIndexes: data.fallbackLegIndexes ?? [],
          waypointIndexes:
            data.waypointIndexes?.length === coordinates.length
              ? data.waypointIndexes
              : coordinates.map((_, index) => index),
          source: data.source ?? "kakao",
        };
      }
    }
  } catch {
    /* straight line between stops */
  }

  return {
    path: coordinates,
    fallbackLegIndexes: coordinates.slice(0, -1).map((_, index) => index),
    waypointIndexes: coordinates.map((_, index) => index),
    source: "fallback",
  };
}
