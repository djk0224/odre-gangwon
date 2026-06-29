import { splitPlaceIdsByDayCaps } from "@/lib/itineraryDayPlanner";
import { shouldSkipCavePlace } from "@/lib/caveVisitConditions";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { resolvePlacesFromSelectionState } from "@/lib/placeSelectionFromState";
import { enrichPreferencesFromRegionalContext } from "@/lib/regionalPreferences";
import { getMaxAttractionStopsForTrip } from "@/lib/travelDuration";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import type { Place, SelectionIntent, TripPreferences } from "@/types/travel";

function scorePlace(place: Place): number {
  let value = 0;
  if (place.partner && place.reservationRequired && place.qrAvailable) value += 120;
  else if (place.partner) value += 50;
  if (!isDiningPlace(place) && !isLodgingPlace(place)) value += 12;
  return value;
}

/** Browser-safe place pick when /api/ai/itinerary is slow or unavailable */
export function pickPlaceIdsForPreferencesClient(
  preferences: TripPreferences,
  anchorPlaceId?: string | null,
  selectedPlaceState?: Record<string, { intent: SelectionIntent; updatedAt?: string }>,
): string[] {
  const resolved = enrichPreferencesFromRegionalContext(preferences);
  const catalog = getCatalogPlaces().filter((place) => place.region === resolved.zoneId);
  const caveOpts = { season: resolved.season, anchorPlaceId: anchorPlaceId ?? null };

  const limit = Math.min(getMaxAttractionStopsForTrip(resolved), 12);

  const ids: string[] = [];
  const push = (place: Place | undefined) => {
    if (!place || ids.includes(place.id)) return;
    if (isLodgingPlace(place)) return;
    if (isDiningPlace(place)) return;
    if (shouldSkipCavePlace(place, caveOpts)) return;
    ids.push(place.id);
  };

  const { mustGo, interested } = resolvePlacesFromSelectionState(
    selectedPlaceState,
    resolved.zoneId,
    caveOpts,
  );
  for (const place of mustGo) push(place);
  push(anchorPlaceId ? getCatalogPlaceById(anchorPlaceId) : undefined);
  for (const place of interested) push(place);

  const ranked = [...catalog].sort((a, b) => scorePlace(b) - scorePlace(a));
  for (const place of ranked) {
    if (ids.length >= limit) break;
    push(place);
  }

  if (!ids.some((id) => {
    const place = getCatalogPlaceById(id);
    return place?.partner && place.reservationRequired;
  })) {
    const partner = catalog.find(
      (place) =>
        place.partner &&
        place.reservationRequired &&
        place.qrAvailable &&
        !shouldSkipCavePlace(place, caveOpts),
    );
    if (partner) {
      ids.unshift(partner.id);
    }
  }

  return [...new Set(ids)].slice(0, limit);
}
