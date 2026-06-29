import { filterAttractionPlaceIds } from "@/lib/itineraryDayPlanner";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { TripPreferences } from "@/types/travel";
import type { PlaceSelection } from "@/lib/executionKernel/types";

export function validatePlaceSelection(
  placeIds: string[],
  preferences: TripPreferences,
  options?: {
    anchorPlaceId?: string | null;
    weatherSummary?: string | null;
    zoneId?: TripPreferences["zoneId"];
  },
): PlaceSelection {
  const zoneId = options?.zoneId ?? preferences.zoneId;
  const warnings: string[] = [];
  const removedIds: string[] = [];
  const seen = new Set<string>();

  const normalized = placeIds.filter((id) => {
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });

  const attractions = filterAttractionPlaceIds(normalized, preferences, {
    anchorPlaceId: options?.anchorPlaceId,
    weatherSummary: options?.weatherSummary,
  });

  for (const id of normalized) {
    if (!attractions.includes(id)) {
      removedIds.push(id);
    }
  }

  const valid: string[] = [];
  for (const id of attractions) {
    const place = getCatalogPlaceById(id);
    if (!place) {
      removedIds.push(id);
      continue;
    }
    if (place.region !== zoneId) {
      removedIds.push(id);
      warnings.push(`${place.name}은(는) 선택 권역(${zoneId}) 밖이라 제외했습니다.`);
      continue;
    }
    valid.push(id);
  }

  if (options?.anchorPlaceId && valid.includes(options.anchorPlaceId)) {
    const rest = valid.filter((id) => id !== options.anchorPlaceId);
    return {
      placeIds: [options.anchorPlaceId, ...rest],
      removedIds,
      warnings,
    };
  }

  return { placeIds: valid, removedIds, warnings };
}
