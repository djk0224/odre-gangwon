import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import zoneHeroImported from "@/data/imported/zone-hero-images.json";
import { partnerPlaceProfiles } from "@/data/partnerPlaceProfiles";
import { ZONE_HERO_OVERRIDES } from "@/data/zoneHeroOverrides";
import type { TravelZoneId } from "@/types/travel";
import {
  mapTourItemsToPlaces,
  normalizePlaceName,
  type TourItemWithRegion,
} from "@/lib/tourPlaceMapper";
import type { TourAreaItem } from "@/types/externalData";
import type { Place } from "@/types/travel";

function matchesPartnerName(place: Place, matchNames: string[]): boolean {
  const normalized = normalizePlaceName(place.name);
  return matchNames.some((candidate) => {
    const key = normalizePlaceName(candidate);
    return normalized.includes(key) || key.includes(normalized);
  });
}

export function applyPartnerPlaceProfiles(catalog: Place[]): Place[] {
  const result = [...catalog];

  for (const profile of partnerPlaceProfiles) {
    const index = result.findIndex(
      (place) =>
        place.region === profile.region && matchesPartnerName(place, profile.matchNames),
    );

    if (index >= 0) {
      const matched = result[index];
      result[index] = {
        ...matched,
        ...profile.patch,
        id: profile.id,
        region: profile.region,
        name: matched.name,
        coordinates: profile.patch.coordinates ?? matched.coordinates,
        category: profile.patch.category ?? matched.category,
        imageUrl: profile.patch.imageUrl ?? matched.imageUrl,
        contactPhone: profile.patch.contactPhone ?? matched.contactPhone,
      };
      continue;
    }

    result.push({
      id: profile.id,
      name: profile.matchNames[0],
      category: "experience",
      region: profile.region,
      description: profile.patch.description ?? "",
      signature: profile.patch.signature ?? "제휴",
      tags: profile.patch.tags ?? ["제휴"],
      operatingHours: profile.patch.operatingHours ?? "09:00 - 18:00",
      estimatedDuration: profile.patch.estimatedDuration ?? "1시간",
      distanceNote: travelZoneShortLabels[profile.region],
      recommendationReason: profile.patch.recommendationReason ?? "",
      gradient: "from-pine-deep via-pine to-mist",
      coordinates: { lat: 37.4, lng: 128.5 },
      ...profile.patch,
    });
  }

  return result;
}

function resolveZoneHeroImageUrl(zoneId: TravelZoneId): string | undefined {
  const override = ZONE_HERO_OVERRIDES[zoneId];
  if (override?.imageUrl) return override.imageUrl;
  const heroes = (zoneHeroImported as { heroes?: Record<string, { imageUrl?: string }> }).heroes;
  return heroes?.[zoneId]?.imageUrl;
}

/** GW 이미지가 없는 장소에 권역·카테고리·권역 대표 사진을 보강 */
export function enrichMissingPlaceImages(catalog: Place[]): Place[] {
  const zoneFallback = new Map<Place["region"], string>();
  const categoryFallback = new Map<string, string>();

  for (const place of catalog) {
    if (!place.imageUrl) continue;
    if (!zoneFallback.has(place.region)) {
      zoneFallback.set(place.region, place.imageUrl);
    }
    const key = `${place.region}:${place.category}`;
    if (!categoryFallback.has(key)) {
      categoryFallback.set(key, place.imageUrl);
    }
  }

  return catalog.map((place) => {
    if (place.imageUrl) return place;
    const categoryKey = `${place.region}:${place.category}`;
    const fromCatalog =
      categoryFallback.get(categoryKey) ?? zoneFallback.get(place.region);
    const fromZoneHero = resolveZoneHeroImageUrl(place.region);
    const imageUrl = fromCatalog ?? fromZoneHero;
    return imageUrl ? { ...place, imageUrl } : place;
  });
}

export function buildCatalogFromTourItems(items: TourAreaItem[]): Place[] {
  const withRegion: TourItemWithRegion[] = items.map((item) => ({ item }));
  const mapped = mapTourItemsToPlaces(withRegion);
  const withPartners = applyPartnerPlaceProfiles(mapped);
  return enrichMissingPlaceImages(withPartners);
}
