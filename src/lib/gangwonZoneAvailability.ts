import { getCatalogPlaceCountByZone } from "@/data/placeCatalog";
import type { TravelZoneId } from "@/types/travel";

/** GW 카탈로그가 이 수 이상이면 UI·일정·네이처로드 실행 가능 */
export const EXECUTABLE_ZONE_MIN_PLACES = 30;

export const GANGWON_TRAVEL_ZONE_IDS: TravelZoneId[] = [
  "samcheok-donghae",
  "gangneung-yangyang",
  "sokcho-goseong",
  "pyeongchang-jeongseon",
  "yeongwol-jeongseon",
  "cheorwon-dmz",
  "wonju-chuncheon",
];

export function isZoneCatalogExecutable(zoneId: TravelZoneId): boolean {
  return getCatalogPlaceCountByZone(zoneId) >= EXECUTABLE_ZONE_MIN_PLACES;
}

/** UI·일정·스탬프에서 권역 실행 가능 여부 — 카탈로그 로드 후 동적으로 평가 */
export function isTravelZoneAvailable(zoneId: TravelZoneId): boolean {
  return isZoneCatalogExecutable(zoneId);
}

export function getCatalogCountsByZone(): Record<TravelZoneId, number> {
  return Object.fromEntries(
    GANGWON_TRAVEL_ZONE_IDS.map((zoneId) => [zoneId, getCatalogPlaceCountByZone(zoneId)]),
  ) as Record<TravelZoneId, number>;
}
