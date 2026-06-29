import type { TravelZoneId } from "@/types/travel";

/** 시·군·구 명 → 앱 권역 (로컬 CSV·상권 데이터용) */
const CITY_TO_ZONE: Record<string, TravelZoneId> = {
  강릉시: "gangneung-yangyang",
  양양군: "gangneung-yangyang",
  속초시: "sokcho-goseong",
  고성군: "sokcho-goseong",
  삼척시: "samcheok-donghae",
  동해시: "samcheok-donghae",
  태백시: "yeongwol-jeongseon",
  영월군: "yeongwol-jeongseon",
  정선군: "yeongwol-jeongseon",
  평창군: "pyeongchang-jeongseon",
  횡성군: "pyeongchang-jeongseon",
  철원군: "cheorwon-dmz",
  화천군: "cheorwon-dmz",
  양구군: "cheorwon-dmz",
  인제군: "cheorwon-dmz",
  원주시: "wonju-chuncheon",
  춘천시: "wonju-chuncheon",
  홍천군: "wonju-chuncheon",
};

export function resolveTravelZoneForCity(city?: string): TravelZoneId | undefined {
  if (!city) return undefined;
  return CITY_TO_ZONE[city];
}
