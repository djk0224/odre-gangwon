import { getKakaoRestApiKey } from "@/lib/serverEnv";
import { fetchJson } from "@/services/external/fetchJson";
import type { Coordinates } from "@/types/travel";

const KAKAO_NAVI_BASE = "https://apis-navi.kakaomobility.com/v1";

interface KakaoDirectionsRoute {
  summary?: { duration?: number; distance?: number };
  sections?: Array<{
    roads?: Array<{
      vertexes?: number[];
    }>;
  }>;
}

interface KakaoDirectionsResponse {
  routes?: KakaoDirectionsRoute[];
}

export interface DirectionsSegment {
  durationSeconds: number;
  distanceMeters: number;
  path: Coordinates[];
}

function getAuthHeader(restKey: string) {
  return { Authorization: `KakaoAK ${restKey}` };
}

function parseVertexes(vertexes: number[]): Coordinates[] {
  const path: Coordinates[] = [];
  for (let i = 0; i < vertexes.length - 1; i += 2) {
    const lng = vertexes[i];
    const lat = vertexes[i + 1];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      path.push({ lat, lng });
    }
  }
  return path;
}

export async function fetchDirectionsSegment(
  origin: Coordinates,
  destination: Coordinates,
): Promise<DirectionsSegment | null> {
  const restKey = getKakaoRestApiKey();
  if (!restKey) {
    return null;
  }

  const params = new URLSearchParams({
    origin: `${origin.lng},${origin.lat}`,
    destination: `${destination.lng},${destination.lat}`,
    priority: "RECOMMEND",
  });

  try {
    const body = await fetchJson<KakaoDirectionsResponse>(
      `${KAKAO_NAVI_BASE}/directions?${params}`,
      { headers: getAuthHeader(restKey) },
    );

    const route = body.routes?.[0];
    if (!route?.summary) {
      return null;
    }

    const path: Coordinates[] = [];
    for (const section of route.sections ?? []) {
      for (const road of section.roads ?? []) {
        if (road.vertexes?.length) {
          path.push(...parseVertexes(road.vertexes));
        }
      }
    }

    return {
      durationSeconds: route.summary.duration ?? 0,
      distanceMeters: route.summary.distance ?? 0,
      path: path.length > 0 ? path : [origin, destination],
    };
  } catch {
    return null;
  }
}

const LEG_REQUEST_GAP_MS = 140;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 도로 vertex가 없어 출발·도착 2점만 있는 경우는 직선 폴백으로 간주 */
function isSnappedRoadPath(path: Coordinates[]): boolean {
  return path.length > 2;
}

async function fetchDirectionsSegmentWithRetry(
  origin: Coordinates,
  destination: Coordinates,
  maxAttempts = 3,
): Promise<DirectionsSegment | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const segment = await fetchDirectionsSegment(origin, destination);
    if (segment && isSnappedRoadPath(segment.path)) {
      return segment;
    }
    if (attempt < maxAttempts - 1) {
      await sleep(LEG_REQUEST_GAP_MS * (attempt + 1));
    }
  }
  return null;
}

export interface RoutePolylineBuildResult {
  path: Coordinates[];
  /** 0-based leg index i = coordinates[i] → coordinates[i+1] */
  fallbackLegIndexes: number[];
  /** path index aligned with each coordinates[i] for map marker snapping */
  waypointIndexes: number[];
  usedKakao: boolean;
}

export async function fetchRoutePolyline(
  coordinates: Coordinates[],
): Promise<Coordinates[]> {
  const built = await fetchRoutePolylineDetailed(coordinates);
  return built.path;
}

export async function fetchRoutePolylineDetailed(
  coordinates: Coordinates[],
): Promise<RoutePolylineBuildResult> {
  if (coordinates.length < 2) {
    return {
      path: coordinates,
      fallbackLegIndexes: [],
      waypointIndexes: coordinates.map((_, index) => index),
      usedKakao: false,
    };
  }

  const merged: Coordinates[] = [];
  const fallbackLegIndexes: number[] = [];
  const waypointIndexes: number[] = new Array(coordinates.length).fill(0);
  let usedKakao = false;

  for (let i = 0; i < coordinates.length - 1; i += 1) {
    if (i > 0) {
      await sleep(LEG_REQUEST_GAP_MS);
    }

    const segment = await fetchDirectionsSegmentWithRetry(
      coordinates[i],
      coordinates[i + 1],
    );

    if (segment?.path.length && isSnappedRoadPath(segment.path)) {
      usedKakao = true;
      if (merged.length > 0) {
        waypointIndexes[i] = merged.length - 1;
        merged.push(...segment.path.slice(1));
      } else {
        merged.push(...segment.path);
        waypointIndexes[0] = 0;
      }
      waypointIndexes[i + 1] = merged.length - 1;
    } else {
      fallbackLegIndexes.push(i);
      if (merged.length === 0) {
        merged.push(coordinates[i]);
        waypointIndexes[0] = 0;
      } else {
        waypointIndexes[i] = merged.length - 1;
      }
      merged.push(coordinates[i + 1]);
      waypointIndexes[i + 1] = merged.length - 1;
    }
  }

  return {
    path: merged.length > 0 ? merged : coordinates,
    fallbackLegIndexes,
    waypointIndexes:
      merged.length > 0
        ? waypointIndexes
        : coordinates.map((_, index) => index),
    usedKakao,
  };
}
