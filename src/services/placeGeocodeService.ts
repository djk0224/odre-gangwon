import { getRuntimeCatalogPlaces } from "@/lib/catalogRuntime";
import { placeGeocodeQueries, mvpGeocodeCenter } from "@/data/placeGeocodeQueries";
import { normalizePlaceName } from "@/lib/tourPlaceMapper";
import { geocodePlaceByQuery } from "@/services/external/kakaoLocalService";
import type { GeocodedPlaceResult } from "@/types/externalData";
import type { Coordinates, Place } from "@/types/travel";

let runtimeCoordinateOverrides: Record<string, Coordinates> = {};

export function getRuntimeCoordinateOverrides() {
  return { ...runtimeCoordinateOverrides };
}

export function setRuntimeCoordinateOverrides(overrides: Record<string, Coordinates>) {
  runtimeCoordinateOverrides = { ...overrides };
  placeByIdCache = null;
  placeByIdCacheLength = -1;
}

export function applyCoordinateOverrides(sourcePlaces: Place[]): Place[] {
  return sourcePlaces.map((place) => {
    const override = runtimeCoordinateOverrides[place.id];
    return override ? { ...place, coordinates: override } : place;
  });
}

let placeByIdCache: Map<string, Place> | null = null;
let placeByIdCacheLength = -1;

function rebuildPlaceByIdCache(places: Place[]) {
  placeByIdCache = new Map(places.map((place) => [place.id, place]));
  placeByIdCacheLength = places.length;
}

export function getCatalogPlaces(): Place[] {
  const places = applyCoordinateOverrides(getRuntimeCatalogPlaces());
  if (!placeByIdCache || places.length !== placeByIdCacheLength) {
    rebuildPlaceByIdCache(places);
  }
  return places;
}

export function getPartnerPlaces(): Place[] {
  return getCatalogPlaces().filter((place) => place.partner);
}

export function getCatalogPlaceById(placeId: string): Place | undefined {
  const places = getCatalogPlaces();
  return placeByIdCache?.get(placeId);
}

export function findCatalogPlaceByNameHint(
  hint: string,
  region?: Place["region"],
): Place | undefined {
  const key = normalizePlaceName(hint);
  return getCatalogPlaces().find((place) => {
    if (region && place.region !== region) return false;
    const name = normalizePlaceName(place.name);
    return name.includes(key) || key.includes(name);
  });
}

export async function geocodeCatalogPlaces(placeIds?: string[]): Promise<{
  results: GeocodedPlaceResult[];
  failures: Array<{ placeId: string; query: string; reason: string }>;
}> {
  const targets = placeIds?.length
    ? getRuntimeCatalogPlaces().filter((place) => placeIds.includes(place.id))
    : getRuntimeCatalogPlaces().filter((place) => placeGeocodeQueries[place.id]);

  const results: GeocodedPlaceResult[] = [];
  const failures: Array<{ placeId: string; query: string; reason: string }> = [];

  for (const place of targets) {
    const query = placeGeocodeQueries[place.id] ?? `${place.name} 삼척`;
    try {
      const match = await geocodePlaceByQuery(query, mvpGeocodeCenter);
      if (!match) {
        failures.push({ placeId: place.id, query, reason: "검색 결과 없음" });
        continue;
      }

      runtimeCoordinateOverrides[place.id] = match.coordinates;
      results.push({
        placeId: place.id,
        query,
        coordinates: match.coordinates,
        matchedName: match.document.place_name,
        address: match.document.road_address_name || match.document.address_name,
        kakaoPlaceId: match.document.id,
        source: "kakao-local",
      });
    } catch (error) {
      failures.push({
        placeId: place.id,
        query,
        reason: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  }

  return { results, failures };
}
