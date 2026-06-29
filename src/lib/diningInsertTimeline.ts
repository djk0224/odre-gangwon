import { parseEstimatedDurationMinutes } from "@/services/itineraryEditService";
import { estimateLegMinutesBetweenCoords } from "@/lib/itineraryLegMinutes";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { Coordinates, Place, TripPace, TripPreferences } from "@/types/travel";
import type { DiningSlotRole } from "@/lib/travelDuration";

export const MEAL_TARGET_MINUTES: Record<DiningSlotRole, number> = {
  start: 8 * 60 + 30,
  middle: 12 * 60 + 30,
  end: 18 * 60 + 30,
};

function dayStartMinutes(pace: TripPace): number {
  if (pace === "relaxed") return 9 * 60 + 30;
  if (pace === "packed") return 8 * 60 + 30;
  return 9 * 60;
}

export function splitTourAndDiningPlaceIds(placeIds: string[]): {
  tour: string[];
  dining: string[];
} {
  const tour: string[] = [];
  const dining: string[] = [];
  for (const placeId of placeIds) {
    const place = getCatalogPlaceById(placeId);
    if (place && isDiningPlace(place)) {
      dining.push(placeId);
    } else {
      tour.push(placeId);
    }
  }
  return { tour, dining };
}

export function simulateArrivalMinutesAtInsertIndex(
  tourPlaceIds: string[],
  insertIndex: number,
  diningPlace: Place,
  preferences: TripPreferences,
  originCoords: Coordinates | null,
): number {
  let cursor = dayStartMinutes(preferences.pace);
  let prev = originCoords;

  for (let index = 0; index < insertIndex; index += 1) {
    const place = getCatalogPlaceById(tourPlaceIds[index]);
    if (!place) continue;
    if (prev) {
      cursor += estimateLegMinutesBetweenCoords(
        prev,
        place.coordinates,
        preferences.transportation,
      );
    }
    cursor += parseEstimatedDurationMinutes(place.estimatedDuration);
    prev = place.coordinates;
  }

  if (prev) {
    cursor += estimateLegMinutesBetweenCoords(
      prev,
      diningPlace.coordinates,
      preferences.transportation,
    );
  }

  return cursor;
}

export function findBestMealInsertIndex(
  tourPlaceIds: string[],
  diningPlace: Place,
  targetArrivalMin: number,
  preferences: TripPreferences,
  originCoords: Coordinates | null,
): number {
  if (tourPlaceIds.length === 0) return 0;

  let bestIndex = tourPlaceIds.length;
  let bestDelta = Number.POSITIVE_INFINITY;

  for (let insertAt = 0; insertAt <= tourPlaceIds.length; insertAt += 1) {
    const arrival = simulateArrivalMinutesAtInsertIndex(
      tourPlaceIds,
      insertAt,
      diningPlace,
      preferences,
      originCoords,
    );
    const delta = Math.abs(arrival - targetArrivalMin);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIndex = insertAt;
    }
  }

  return bestIndex;
}

export function resolveMealInsertIndex(
  role: DiningSlotRole,
  tourPlaceIds: string[],
  diningPlace: Place,
  preferences: TripPreferences,
  originCoords: Coordinates | null,
): number {
  if (role === "start") return 0;
  if (role === "end") return tourPlaceIds.length;
  return findBestMealInsertIndex(
    tourPlaceIds,
    diningPlace,
    MEAL_TARGET_MINUTES.middle,
    preferences,
    originCoords,
  );
}

export function insertDiningPlaceAtIndex(
  tourPlaceIds: string[],
  diningId: string,
  insertIndex: number,
): string[] {
  return [
    ...tourPlaceIds.slice(0, insertIndex),
    diningId,
    ...tourPlaceIds.slice(insertIndex),
  ];
}
