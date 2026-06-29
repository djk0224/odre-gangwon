import {
  GANGWON_SIGUNGU_CODES,
  sigunguToTravelZone,
} from "@/config/tourZoneSigungu";
import type { Place, TravelZoneId } from "@/types/travel";

const SIGUNGU_LABELS: Record<string, string> = {
  "1": "강릉",
  "2": "고성",
  "3": "동해",
  "4": "삼척",
  "5": "속초",
  "6": "양구",
  "7": "양양",
  "8": "영월",
  "9": "원주",
  "10": "인제",
  "11": "정선",
  "12": "철원",
  "13": "춘천",
  "14": "태백",
  "15": "평창",
  "16": "홍천",
  "17": "화천",
  "18": "횡성",
};

/** 권역 → 대표 시·군 (다중 매핑 시 첫 코드) */
const zoneToPrimarySigungu: Record<TravelZoneId, string> = {
  "gangneung-yangyang": "1",
  "sokcho-goseong": "5",
  "samcheok-donghae": "4",
  "pyeongchang-jeongseon": "15",
  "yeongwol-jeongseon": "8",
  "cheorwon-dmz": "12",
  "wonju-chuncheon": "13",
};

export function getSigunguLabel(sigunguCode: string): string {
  return SIGUNGU_LABELS[sigunguCode] ?? `시군${sigunguCode}`;
}

export function getSigunguCodesForZone(zoneId: TravelZoneId): string[] {
  return GANGWON_SIGUNGU_CODES.filter(
    (code) => sigunguToTravelZone[code] === zoneId,
  ) as string[];
}

/** 장소명·주소 힌트로 시·군 코드 추정 */
export function resolveSigunguCodeForPlace(place: Place): string {
  const haystack = `${place.name} ${place.description} ${place.distanceNote}`;
  for (const [code, label] of Object.entries(SIGUNGU_LABELS)) {
    if (haystack.includes(label)) {
      return code;
    }
  }

  const zoneCodes = getSigunguCodesForZone(place.region);
  if (zoneCodes.length === 1) {
    return zoneCodes[0];
  }

  return zoneToPrimarySigungu[place.region] ?? zoneCodes[0] ?? "4";
}

export function resolveSigunguCodeForZone(zoneId: TravelZoneId): string {
  return zoneToPrimarySigungu[zoneId] ?? "4";
}
