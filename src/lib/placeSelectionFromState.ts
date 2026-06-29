import { shouldSkipCavePlace } from "@/lib/caveVisitConditions";
import { isLodgingPlace } from "@/lib/placeLodging";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { Place, SelectionIntent, SeasonId, TravelZoneId } from "@/types/travel";

function sortByUpdatedAt(
  entries: Array<[string, { updatedAt?: string }]>,
): Array<[string, { updatedAt?: string }]> {
  return [...entries].sort((a, b) =>
    (a[1].updatedAt ?? "").localeCompare(b[1].updatedAt ?? ""),
  );
}

function placeFromSelectionEntry(
  placeId: string,
  zoneId: TravelZoneId,
  caveOpts: { season: SeasonId; anchorPlaceId: string | null },
): Place | undefined {
  const place = getCatalogPlaceById(placeId);
  if (!place || place.region !== zoneId || isLodgingPlace(place)) return undefined;
  if (shouldSkipCavePlace(place, caveOpts)) return undefined;
  return place;
}

/** tripStore selectedPlaceState → must_go·interested 카탈로그 Place (일정 엔진 시드) */
export function resolvePlacesFromSelectionState(
  selectedPlaceState:
    | Record<string, { intent: SelectionIntent; updatedAt?: string }>
    | undefined,
  zoneId: TravelZoneId,
  caveOpts: { season: SeasonId; anchorPlaceId: string | null },
): { mustGo: Place[]; interested: Place[] } {
  if (!selectedPlaceState) {
    return { mustGo: [], interested: [] };
  }

  const mustGo = sortByUpdatedAt(
    Object.entries(selectedPlaceState).filter(([, value]) => value.intent === "must_go"),
  )
    .map(([placeId]) => placeFromSelectionEntry(placeId, zoneId, caveOpts))
    .filter((place): place is Place => Boolean(place));

  const mustGoIds = new Set(mustGo.map((place) => place.id));
  const interested = sortByUpdatedAt(
    Object.entries(selectedPlaceState).filter(([, value]) => value.intent === "interested"),
  )
    .map(([placeId]) => placeFromSelectionEntry(placeId, zoneId, caveOpts))
    .filter((place): place is Place => Boolean(place && !mustGoIds.has(place.id)));

  return { mustGo, interested };
}
