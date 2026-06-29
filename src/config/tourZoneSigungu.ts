import type { TravelZoneId } from "@/types/travel";

/** 강원특별자치도 areaCode (KorService2) */
export const GANGWON_AREA_CODE = "32";

/** 강원 시·군 sigunguCode 전체 */
export const GANGWON_SIGUNGU_CODES = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
] as const;

/** 시·군 → 앱 권역 (미매핑 시 원주·춘천) */
export const sigunguToTravelZone: Record<string, TravelZoneId> = {
  "1": "gangneung-yangyang",
  "7": "gangneung-yangyang",
  "2": "sokcho-goseong",
  "5": "sokcho-goseong",
  "3": "samcheok-donghae",
  "4": "samcheok-donghae",
  "8": "yeongwol-jeongseon",
  "11": "pyeongchang-jeongseon",
  "15": "pyeongchang-jeongseon",
  "6": "cheorwon-dmz",
  "10": "cheorwon-dmz",
  "12": "cheorwon-dmz",
  "17": "cheorwon-dmz",
  "9": "wonju-chuncheon",
  "13": "wonju-chuncheon",
  "14": "pyeongchang-jeongseon",
  "16": "wonju-chuncheon",
  "18": "wonju-chuncheon",
};

export const travelZoneShortLabels: Record<TravelZoneId, string> = {
  "samcheok-donghae": "삼척·동해",
  "gangneung-yangyang": "강릉·양양",
  "sokcho-goseong": "속초·고성",
  "pyeongchang-jeongseon": "평창·정선",
  "yeongwol-jeongseon": "영월·정선",
  "cheorwon-dmz": "철원·접경",
  "wonju-chuncheon": "원주·춘천",
};

export function getTravelZoneForSigungu(sigunguCode?: string): TravelZoneId {
  if (sigunguCode && sigunguCode in sigunguToTravelZone) {
    return sigunguToTravelZone[sigunguCode];
  }
  return "wonju-chuncheon";
}
