import { shouldSkipCavePlace } from "@/lib/caveVisitConditions";
import { splitPlaceIdsByDayCaps } from "@/lib/itineraryDayPlanner";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { resolveEffectiveThemes } from "@/lib/regionalPreferences";
import {
  getDayCountForDuration,
  getMaxAttractionStopsForDay,
  getMaxAttractionStopsForTrip,
} from "@/lib/travelDuration";
import type { EngineContext } from "@/services/engines/engineContext";
import { rerankPlaceIdsAsync } from "@/services/engines/personalizationRanker";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import type { Coordinates, Place, TripPreferences, TripTheme } from "@/types/travel";

function isCultureOnlyThemes(themes: TripTheme[]): boolean {
  return themes.length === 1 && themes[0] === "culture";
}

function isBackfillCandidate(
  place: Place,
  themes: TripTheme[],
  caveFilterOpts: { season: TripPreferences["season"]; anchorPlaceId: string | null },
): boolean {
  if (isLodgingPlace(place)) return false;
  if (!isCultureOnlyThemes(themes) && isDiningPlace(place)) return false;
  if (shouldSkipCavePlace(place, caveFilterOpts)) return false;
  return true;
}

function centroidOfIds(placeIds: string[]): Coordinates | null {
  const places = placeIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));
  if (places.length === 0) return null;
  return {
    lat: places.reduce((sum, place) => sum + place.coordinates.lat, 0) / places.length,
    lng: places.reduce((sum, place) => sum + place.coordinates.lng, 0) / places.length,
  };
}

function zoneCenterCoordinates(zoneId: TripPreferences["zoneId"]): Coordinates | null {
  const zonePlaces = getCatalogPlaces().filter((place) => place.region === zoneId);
  if (zonePlaces.length === 0) return null;
  return {
    lat: zonePlaces.reduce((sum, place) => sum + place.coordinates.lat, 0) / zonePlaces.length,
    lng: zonePlaces.reduce((sum, place) => sum + place.coordinates.lng, 0) / zonePlaces.length,
  };
}

/**
 * 사용자가 고른 관광지가 페이스·Day 상한을 채우지 못하면 권역 카탈로그에서 AI 순위로 보충한다.
 * Day별 상한(첫날·중간·귀가일)을 우선 맞춘다.
 */
export async function backfillAttractionPlaceIds(
  attractionIds: string[],
  preferences: TripPreferences,
  context: EngineContext,
  options?: {
    anchorPlaceId?: string | null;
    weatherSummary?: string | null;
  },
): Promise<string[]> {
  const unique = [...new Set(attractionIds)].filter((id) => {
    const place = getCatalogPlaceById(id);
    return place && !isDiningPlace(place) && !isLodgingPlace(place);
  });

  const tripCap = getMaxAttractionStopsForTrip(preferences);
  if (unique.length >= tripCap) {
    return unique.slice(0, tripCap);
  }

  const dayCount = getDayCountForDuration(preferences.duration);
  if (dayCount <= 1) {
    return backfillFlatAttractionList(unique, preferences, context, options, tripCap);
  }

  const caps = Array.from({ length: dayCount }, (_, index) =>
    getMaxAttractionStopsForDay(index + 1, preferences.pace, preferences.duration),
  );
  const chunks = splitPlaceIdsByDayCaps(unique, preferences).map((chunk) => [...chunk]);
  const exclude = new Set(unique);
  const themes = resolveEffectiveThemes(preferences);
  const caveOpts = {
    season: preferences.season,
    anchorPlaceId: options?.anchorPlaceId ?? context.anchorPlaceId ?? null,
    weatherSummary: options?.weatherSummary ?? null,
  };

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const need = caps[dayIndex] - chunks[dayIndex].length;
    if (need <= 0) continue;

    const anchor =
      centroidOfIds(chunks[dayIndex]) ??
      (dayIndex > 0 ? centroidOfIds(chunks[dayIndex - 1]) : null) ??
      zoneCenterCoordinates(preferences.zoneId);

    const candidates = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !exclude.has(place.id) &&
        isBackfillCandidate(place, themes, caveOpts),
    );

    if (candidates.length === 0) continue;

    const picked = await rerankPlaceIdsAsync(
      candidates.map((place) => place.id),
      context,
      {
        anchorCoordinates: anchor ?? undefined,
        limit: need,
        deemphasizeProximity: false,
      },
    );

    for (const placeId of picked) {
      chunks[dayIndex].push(placeId);
      exclude.add(placeId);
    }
  }

  return chunks.flat();
}

async function backfillFlatAttractionList(
  unique: string[],
  preferences: TripPreferences,
  context: EngineContext,
  options: { anchorPlaceId?: string | null; weatherSummary?: string | null } | undefined,
  tripCap: number,
): Promise<string[]> {
  const need = tripCap - unique.length;
  if (need <= 0) return unique;

  const exclude = new Set(unique);
  const themes = resolveEffectiveThemes(preferences);
  const caveOpts = {
    season: preferences.season,
    anchorPlaceId: options?.anchorPlaceId ?? context.anchorPlaceId ?? null,
    weatherSummary: options?.weatherSummary ?? null,
  };
  const anchor =
    centroidOfIds(unique) ?? zoneCenterCoordinates(preferences.zoneId);

  const candidates = getCatalogPlaces().filter(
    (place) =>
      place.region === preferences.zoneId &&
      !exclude.has(place.id) &&
      isBackfillCandidate(place, themes, caveOpts),
  );
  if (candidates.length === 0) return unique;

  const picked = await rerankPlaceIdsAsync(
    candidates.map((place) => place.id),
    context,
    {
      anchorCoordinates: anchor ?? undefined,
      limit: need,
      deemphasizeProximity: true,
    },
  );

  return [...unique, ...picked.filter((id) => !exclude.has(id))].slice(0, tripCap);
}

export function countAttractionDeficitByDay(
  attractionIds: string[],
  preferences: Pick<TripPreferences, "duration" | "pace" | "transportation">,
): number {
  const dayCount = getDayCountForDuration(preferences.duration);
  const caps = Array.from({ length: dayCount }, (_, index) =>
    getMaxAttractionStopsForDay(index + 1, preferences.pace, preferences.duration),
  );
  const chunks = splitPlaceIdsByDayCaps(attractionIds, preferences);
  return caps.reduce((sum, cap, index) => sum + Math.max(0, cap - (chunks[index]?.length ?? 0)), 0);
}
