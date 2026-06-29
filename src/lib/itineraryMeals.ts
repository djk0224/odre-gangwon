import { splitPlaceIdsByScheduleAndGeography } from "@/lib/itineraryDayPlanner";
import {
  insertDiningPlaceAtIndex,
  resolveMealInsertIndex,
} from "@/lib/diningInsertTimeline";
import {
  getDiningSlotRolesForDay,
  type DiningSlotRole,
} from "@/lib/travelDuration";
import { resolveEffectiveThemes } from "@/lib/regionalPreferences";
import { buildCrowdByPlaceId } from "@/services/engines/crowdEngine";
import { buildVisitCrowdContext } from "@/services/engines/visitSignals";
import type { EngineContext } from "@/services/engines/engineContext";
import { rerankPlaceIdsAsync } from "@/services/engines/personalizationRanker";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import type { Coordinates, Place, TravelDuration, TripPreferences } from "@/types/travel";

export const LUNCH_TIME_LABEL = "12:30";
export const DINNER_TIME_LABEL = "18:30";
export const BREAKFAST_TIME_LABEL = "08:30";

const ROLE_TIME_LABEL: Record<DiningSlotRole, string> = {
  start: BREAKFAST_TIME_LABEL,
  middle: LUNCH_TIME_LABEL,
  end: DINNER_TIME_LABEL,
};

/** 식사 목적 정류장 — 음식점·카페만 (시장은 관광지) */
export function isDiningCategory(category: Place["category"]): boolean {
  return category === "restaurant" || category === "cafe";
}

export function isDiningPlace(place: Place): boolean {
  return isDiningCategory(place.category);
}

export function itineraryIncludesDiningPlaceIds(placeIds: string[]): boolean {
  return placeIds.some((placeId) => {
    const place = getCatalogPlaceById(placeId);
    return place ? isDiningPlace(place) : false;
  });
}

function midpoint(a: Coordinates, b: Coordinates): Coordinates {
  return { lat: (a.lat + b.lat) / 2, lng: (a.lng + b.lng) / 2 };
}

function attractionPlaceIds(placeIds: string[]): string[] {
  return placeIds.filter((id) => {
    const place = getCatalogPlaceById(id);
    return place && !isDiningPlace(place);
  });
}

function zoneCenterCoordinates(zoneId: TripPreferences["zoneId"]): Coordinates | null {
  const zonePlaces = getCatalogPlaces().filter((place) => place.region === zoneId);
  if (zonePlaces.length === 0) return null;
  const coords = zonePlaces.map((place) => place.coordinates);
  return {
    lat: coords.reduce((sum, coord) => sum + coord.lat, 0) / coords.length,
    lng: coords.reduce((sum, coord) => sum + coord.lng, 0) / coords.length,
  };
}

function anchorForRole(role: DiningSlotRole, attractionIds: string[]): Coordinates | null {
  const places = attractionIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));
  if (places.length === 0) return null;
  if (role === "start") return places[0].coordinates;
  if (role === "end") return places[places.length - 1].coordinates;
  if (places.length === 1) return places[0].coordinates;
  const mid = Math.floor(places.length / 2);
  return midpoint(places[mid - 1].coordinates, places[mid].coordinates);
}

function insertDiningByRole(
  tourPlaceIds: string[],
  role: DiningSlotRole,
  diningId: string,
  preferences: TripPreferences,
  originCoords: Coordinates | null,
): string[] {
  const diningPlace = getCatalogPlaceById(diningId);
  if (!diningPlace) return tourPlaceIds;

  const insertAt = resolveMealInsertIndex(
    role,
    tourPlaceIds,
    diningPlace,
    preferences,
    originCoords,
  );
  return insertDiningPlaceAtIndex(tourPlaceIds, diningId, insertAt);
}

async function pickDiningPlaceId(
  context: EngineContext,
  anchor: Coordinates,
  timeLabel: string,
  excludeIds: Set<string>,
): Promise<string | null> {
  const candidates = getCatalogPlaces().filter(
    (place) =>
      place.region === context.zoneId &&
      isDiningPlace(place) &&
      !excludeIds.has(place.id),
  );

  if (candidates.length === 0) {
    return null;
  }

  const restaurantCandidates = candidates.filter((place) => place.category === "restaurant");
  const cafeCandidates = candidates.filter((place) => place.category === "cafe");
  const diningPool =
    restaurantCandidates.length > 0
      ? restaurantCandidates
      : cafeCandidates.length > 0
        ? cafeCandidates
        : [];
  if (diningPool.length === 0) {
    return null;
  }
  const candidateIds = diningPool.map((place) => place.id);
  const visitCrowd = buildVisitCrowdContext({ preferences: context.preferences });
  const crowdByPlaceId = await buildCrowdByPlaceId(candidateIds, context, {
    ...visitCrowd,
    quick: context.crowdMode === "quick",
    timeLabelByPlaceId: {
      ...visitCrowd.timeLabelByPlaceId,
      ...Object.fromEntries(candidateIds.map((id) => [id, timeLabel])),
    },
  });

  const [bestId] = await rerankPlaceIdsAsync(candidateIds, context, {
    anchorCoordinates: anchor,
    crowdByPlaceId,
    deemphasizeProximity: true,
    limit: 1,
  });

  return bestId ?? null;
}

/**
 * Day 슬라이스에 `getDiningSlotRolesForDay` 규칙에 맞춰 식사 장소를 삽입.
 */
export async function injectMealPlaceIdsForDaySlice(
  placeIds: string[],
  context: EngineContext,
  options?: {
    day?: number;
    duration?: TravelDuration;
    /** 다른 Day에 이미 배정된 식사 장소 — 동일 상권 중복 삽입 방지 */
    excludeMealPlaceIds?: Set<string>;
  },
): Promise<string[]> {
  const themes = resolveEffectiveThemes(context.preferences);
  if (themes.length === 1 && themes[0] === "culture") {
    return placeIds;
  }

  const day = options?.day ?? 1;
  const duration = options?.duration ?? context.preferences.duration;
  const roles = getDiningSlotRolesForDay(day, duration);
  const attractions = attractionPlaceIds(placeIds);
  const exclude = new Set([
    ...placeIds,
    ...(options?.excludeMealPlaceIds ? [...options.excludeMealPlaceIds] : []),
  ]);

  let result = [...attractions];
  const fallbackAnchor = zoneCenterCoordinates(context.zoneId);
  const lodgingOrigin = fallbackAnchor;

  for (const role of roles) {
    const anchor = anchorForRole(role, result) ?? fallbackAnchor;
    if (!anchor) continue;

    const diningId = await pickDiningPlaceId(
      context,
      anchor,
      ROLE_TIME_LABEL[role],
      exclude,
    );
    if (!diningId) continue;

    result = insertDiningByRole(result, role, diningId, context.preferences, lodgingOrigin);
    exclude.add(diningId);
  }

  return result.length > 0 ? result : placeIds;
}

export async function injectMealPlacesForItinerary(
  orderedPlaceIds: string[],
  preferences: TripPreferences,
  context: EngineContext,
): Promise<string[]> {
  const themes = resolveEffectiveThemes(preferences);
  if (themes.length === 1 && themes[0] === "culture") {
    return orderedPlaceIds;
  }

  const slices = await splitPlaceIdsByScheduleAndGeography(
    orderedPlaceIds,
    preferences,
    preferences.transportation,
  );

  const withMeals: string[] = [];
  const usedMealPlaceIds = new Set<string>();
  for (const slice of slices) {
    const ids = await injectMealPlaceIdsForDaySlice(slice.placeIds, context, {
      day: slice.day,
      duration: preferences.duration,
      excludeMealPlaceIds: usedMealPlaceIds,
    });
    for (const id of ids) {
      if (!slice.placeIds.includes(id)) {
        const place = getCatalogPlaceById(id);
        if (place && isDiningPlace(place)) {
          usedMealPlaceIds.add(id);
        }
      }
    }
    withMeals.push(...ids);
  }

  return withMeals;
}
