import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import { haversineMinutes } from "@/services/engines/routeEngine";
import type { Coordinates, Transportation } from "@/types/travel";

/** 매트릭스·API 없을 때 좌표 기반 추정 (고정 25분 대신) */
export function estimateLegMinutesBetweenCoords(
  from: Coordinates,
  to: Coordinates,
  transportation: Transportation,
): number {
  return Math.max(1, haversineMinutes(from, to, transportation));
}

export function estimateLegMinutesBetweenPlaceIds(
  fromPlaceId: string,
  toPlaceId: string,
  transportation: Transportation,
): number {
  const from = getCatalogPlaceById(fromPlaceId)?.coordinates;
  const to = getCatalogPlaceById(toPlaceId)?.coordinates;
  if (!from || !to) {
    return transportation === "car" ? 15 : 22;
  }
  return estimateLegMinutesBetweenCoords(from, to, transportation);
}

export function legMinutesForPlaceIdOrder(
  orderedPlaceIds: string[],
  sourcePlaceIds: string[],
  matrix: number[][],
  transportation: Transportation,
): number[] {
  const indexById = new Map(sourcePlaceIds.map((id, index) => [id, index]));
  const legMinutes: number[] = [];

  for (let i = 0; i < orderedPlaceIds.length - 1; i += 1) {
    const fromId = orderedPlaceIds[i];
    const toId = orderedPlaceIds[i + 1];
    const fromIdx = indexById.get(fromId);
    const toIdx = indexById.get(toId);

    if (fromIdx !== undefined && toIdx !== undefined) {
      const minutes = matrix[fromIdx]?.[toIdx];
      if (minutes && minutes > 0) {
        legMinutes.push(minutes);
        continue;
      }
    }

    legMinutes.push(estimateLegMinutesBetweenPlaceIds(fromId, toId, transportation));
  }

  return legMinutes;
}

export function averageLegMinutes(legMinutes: number[], transportation: Transportation): number {
  if (legMinutes.length === 0) {
    return transportation === "car" ? 15 : 22;
  }
  const sum = legMinutes.reduce((acc, value) => acc + value, 0);
  return Math.max(1, Math.round(sum / legMinutes.length));
}

export function resolveLegMinutesBetween(
  fromPlaceId: string,
  toPlaceId: string,
  orderedPlaceIds: string[],
  orderedLegMinutes: number[] | undefined,
  transportation: Transportation,
): number {
  if (!orderedLegMinutes?.length) {
    return estimateLegMinutesBetweenPlaceIds(fromPlaceId, toPlaceId, transportation);
  }

  const fromIndex = orderedPlaceIds.indexOf(fromPlaceId);
  if (fromIndex < 0 || fromIndex >= orderedPlaceIds.length - 1) {
    return estimateLegMinutesBetweenPlaceIds(fromPlaceId, toPlaceId, transportation);
  }
  if (orderedPlaceIds[fromIndex + 1] !== toPlaceId) {
    return estimateLegMinutesBetweenPlaceIds(fromPlaceId, toPlaceId, transportation);
  }

  const minutes = orderedLegMinutes[fromIndex];
  return minutes && minutes > 0
    ? minutes
    : estimateLegMinutesBetweenPlaceIds(fromPlaceId, toPlaceId, transportation);
}
