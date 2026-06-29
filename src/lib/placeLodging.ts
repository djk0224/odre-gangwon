import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { Place } from "@/types/travel";

const LODGING_NAME_PATTERN =
  /펜션|캠핑|숙박|호텔|모텔|리조트|민박|게스트|콘도|글램핑|glamping|resort|hotel|motel|pension/i;

/** 일정·관광지 동선에서 제외할 숙박·리조트·펜션 등 */
export function isLodgingPlace(place: Place): boolean {
  if (LODGING_NAME_PATTERN.test(place.name)) {
    return true;
  }
  if (place.tags.some((tag) => tag === "숙박" || LODGING_NAME_PATTERN.test(tag))) {
    return true;
  }
  if (/숙박/.test(place.signature) && !/숙박업|숙박시설안내/.test(place.signature)) {
    return true;
  }
  if (place.description.startsWith("숙박 ·")) {
    return true;
  }
  return false;
}

export function isLodgingPlaceId(placeId: string): boolean {
  const place = getCatalogPlaceById(placeId);
  return place ? isLodgingPlace(place) : false;
}
