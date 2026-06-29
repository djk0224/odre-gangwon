import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import type { Place, PlaceCategory, TravelZoneId } from "@/types/travel";

/** 장소 탐색 탭 칩 순서 */
export const PLACE_CATEGORY_BROWSE_ORDER: PlaceCategory[] = [
  "sea",
  "cave",
  "cable-car",
  "observatory",
  "experience",
  "trail",
  "market",
  "restaurant",
  "cafe",
];

const categoryLabels: Record<PlaceCategory, string> = {
  cave: "동굴",
  sea: "바다",
  observatory: "전망",
  "cable-car": "케이블카",
  market: "시장",
  trail: "산책",
  restaurant: "음식점",
  cafe: "카페",
  experience: "체험",
};

export function getPlaceCategoryLabel(category: PlaceCategory): string {
  return categoryLabels[category];
}

const zoneLabelSet = new Set(Object.values(travelZoneShortLabels));

/** GW·카탈로그 태그가 있으면 관광지/문화시설 등 공식 유형을 우선 표시 */
export function getPlaceDisplayCategory(
  place?: Pick<Place, "category" | "tags">,
): string {
  if (place?.tags?.length) {
    const typeTag = place.tags.find(
      (tag) => tag !== "GW" && !zoneLabelSet.has(tag as TravelZoneId),
    );
    if (typeTag) return typeTag;
  }
  return getPlaceCategoryLabel(place?.category ?? "experience");
}

export function getPlaceZoneLabel(
  place?: Pick<Place, "region">,
  fallbackZoneId?: TravelZoneId,
): string {
  if (place?.region) {
    return travelZoneShortLabels[place.region];
  }
  if (fallbackZoneId) {
    return travelZoneShortLabels[fallbackZoneId];
  }
  return travelZoneShortLabels[fallbackZoneId ?? "samcheok-donghae"] ?? "강원";
}
