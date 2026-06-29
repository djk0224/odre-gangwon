import { createHash } from "crypto";
import { fetchDirectionsSegment } from "@/services/external/kakaoDirectionsService";
import { getKakaoRestApiKey } from "@/lib/serverEnv";
import {
  adjustMinutesForTransportation,
  haversineMinutes,
} from "@/services/engines/routeEngine";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { Coordinates, Transportation, TravelZoneId } from "@/types/travel";
import type { RouteMatrixProfile } from "@/lib/routeMatrixPreference";
import type { RoutingSource } from "@/lib/executionKernel/types";

const memoryCache = new Map<string, { matrix: number[][]; routingSource: RoutingSource; at: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const MAX_FULL_MATRIX_SIZE = 12;
const MAX_CONCURRENT_SEGMENTS = 6;

export interface DurationMatrixResult {
  matrix: number[][];
  coords: Coordinates[];
  placeIds: string[];
  routingSource: RoutingSource;
  usedKakao: boolean;
}

function cacheKey(placeIds: string[], transportation: Transportation, zoneId: TravelZoneId) {
  const payload = `${zoneId}:${transportation}:${placeIds.join(",")}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 24);
}

function buildHaversineMatrix(coords: Coordinates[], transportation: Transportation): number[][] {
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

async function fetchSegmentMinutes(
  from: Coordinates,
  to: Coordinates,
  transportation: Transportation,
): Promise<{ minutes: number; usedKakao: boolean }> {
  if (!getKakaoRestApiKey()) {
    return { minutes: haversineMinutes(from, to, transportation), usedKakao: false };
  }

  try {
    const segment = await fetchDirectionsSegment(from, to);
    if (segment?.durationSeconds) {
      const driveMinutes = Math.max(1, Math.round(segment.durationSeconds / 60));
      return {
        minutes: adjustMinutesForTransportation(driveMinutes, transportation),
        usedKakao: true,
      };
    }
  } catch {
    /* fallback below */
  }

  return { minutes: haversineMinutes(from, to, transportation), usedKakao: false };
}

async function buildKakaoMatrix(
  placeIds: string[],
  coords: Coordinates[],
  transportation: Transportation,
): Promise<{ matrix: number[][]; usedKakao: boolean }> {
  const n = coords.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  let usedKakao = false;

  const pairs: Array<{ i: number; j: number }> = [];
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      pairs.push({ i, j });
    }
  }

  for (let offset = 0; offset < pairs.length; offset += MAX_CONCURRENT_SEGMENTS) {
    const batch = pairs.slice(offset, offset + MAX_CONCURRENT_SEGMENTS);
    const results = await Promise.all(
      batch.map(async ({ i, j }) => {
        const seg = await fetchSegmentMinutes(coords[i], coords[j], transportation);
        return { i, j, minutes: seg.minutes, usedKakao: seg.usedKakao };
      }),
    );
    for (const { i, j, minutes, usedKakao: kakao } of results) {
      matrix[i][j] = minutes;
      matrix[j][i] = minutes;
      if (kakao) usedKakao = true;
    }
  }

  return { matrix, usedKakao };
}

export async function getDurationMatrix(
  placeIds: string[],
  transportation: Transportation,
  zoneId: TravelZoneId,
  options?: { preferHaversine?: boolean; routeProfile?: RouteMatrixProfile },
): Promise<DurationMatrixResult> {
  const unique = [...new Set(placeIds)].filter((id) => Boolean(getCatalogPlaceById(id)));
  const coords = unique
    .map((id) => getCatalogPlaceById(id)?.coordinates)
    .filter((c): c is Coordinates => Boolean(c));

  if (coords.length !== unique.length || unique.length <= 1) {
    const matrix =
      coords.length === unique.length && unique.length > 0
        ? buildHaversineMatrix(coords, transportation)
        : [];
    return {
      matrix,
      coords,
      placeIds: unique,
      routingSource: "haversine",
      usedKakao: false,
    };
  }

  const key = cacheKey(unique, transportation, zoneId);
  const cached = memoryCache.get(key);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return {
      matrix: cached.matrix,
      coords,
      placeIds: unique,
      routingSource: cached.routingSource,
      usedKakao: cached.routingSource === "kakao",
    };
  }

  const useHaversineOnly =
    options?.routeProfile === "fast" ||
    options?.preferHaversine === true ||
    !getKakaoRestApiKey() ||
    unique.length > MAX_FULL_MATRIX_SIZE;

  let matrix: number[][];
  let routingSource: RoutingSource;
  let usedKakao = false;

  if (useHaversineOnly) {
    matrix = buildHaversineMatrix(coords, transportation);
    routingSource = "haversine";
  } else {
    const built = await buildKakaoMatrix(unique, coords, transportation);
    matrix = built.matrix;
    usedKakao = built.usedKakao;
    routingSource = usedKakao ? "kakao" : "haversine";
  }

  memoryCache.set(key, { matrix, routingSource, at: Date.now() });

  return { matrix, coords, placeIds: unique, routingSource, usedKakao };
}

export function clearDurationMatrixCacheForTests() {
  memoryCache.clear();
}
