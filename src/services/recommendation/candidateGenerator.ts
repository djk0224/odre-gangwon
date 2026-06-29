import { getCatalogPlaces } from "@/services/placeGeocodeService";
import type { Place, TravelZoneId, TripPreferences } from "@/types/travel";

export interface RecommendationCandidate {
  place: Place;
  zoneBucket: "gangneung" | "yangyang" | "sokcho" | "samcheok" | "other";
}

export function resolveZoneBucket(placeName: string, zoneId: TravelZoneId): RecommendationCandidate["zoneBucket"] {
  const text = `${zoneId} ${placeName}`;
  if (/강릉|안목|주문진/.test(text)) return "gangneung";
  if (/양양|낙산|서피/.test(text)) return "yangyang";
  if (/속초|영금|중앙시장/.test(text)) return "sokcho";
  if (/삼척|동해/.test(text)) return "samcheok";
  return "other";
}

export function buildRecommendationCandidates(
  preferences: TripPreferences,
  selectedPlaceIds: string[] = [],
): RecommendationCandidate[] {
  const selected = new Set(selectedPlaceIds);
  return getCatalogPlaces()
    .filter((place) => place.region === preferences.zoneId && !selected.has(place.id))
    .map((place) => ({
      place,
      zoneBucket: resolveZoneBucket(place.name, preferences.zoneId),
    }));
}
