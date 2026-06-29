import type { Place, SeasonId } from "@/types/travel";

export function isCavePlace(place: Pick<Place, "category">): boolean {
  return place.category === "cave";
}

export function isRainyOrSnowyWeatherText(text?: string | null): boolean {
  if (!text?.trim()) return false;
  return /비|눈|소나기|강수|뇌우|호우|우박/.test(text);
}

/** 겨울·강수 시 동굴 방문은 습기·미끄럼·체감 온도 때문에 비추천 */
export function isCaveVisitDiscouraged(options: {
  season: SeasonId;
  skyLabel?: string | null;
  weatherSummary?: string | null;
}): boolean {
  if (options.season === "winter") return true;
  if (isRainyOrSnowyWeatherText(options.skyLabel)) return true;
  if (isRainyOrSnowyWeatherText(options.weatherSummary)) return true;
  return false;
}

export function shouldSkipCavePlace(
  place: Place,
  options: {
    season: SeasonId;
    anchorPlaceId?: string | null;
    skyLabel?: string | null;
    weatherSummary?: string | null;
  },
): boolean {
  if (!isCavePlace(place)) return false;
  if (options.anchorPlaceId && place.id === options.anchorPlaceId) return false;
  return isCaveVisitDiscouraged(options);
}
