import { isTravelZoneAvailable } from "@/lib/gangwonZoneAvailability";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { ReservationOffer } from "@/types/reservationHub";
import type { TravelZoneId, TripPreferences } from "@/types/travel";

export function isExecutableTravelZone(zoneId: TravelZoneId): boolean {
  return isTravelZoneAvailable(zoneId);
}

export function resolveStampZoneFromPlaceId(placeId: string): TravelZoneId | null {
  const place = getCatalogPlaceById(placeId);
  if (!place) return null;
  return isExecutableTravelZone(place.region) ? place.region : null;
}

const HUB_OFFER_PLACE_ID = /^(?:activity|dining)-(.+)$/;

export function resolveStampZoneFromHubOffer(
  offer: ReservationOffer,
  preferences: TripPreferences,
): TravelZoneId | null {
  const linkedPlaceId = offer.id.match(HUB_OFFER_PLACE_ID)?.[1];
  if (linkedPlaceId) {
    const fromPlace = resolveStampZoneFromPlaceId(linkedPlaceId);
    if (fromPlace) return fromPlace;
  }

  if (isExecutableTravelZone(preferences.zoneId)) {
    return preferences.zoneId;
  }

  return null;
}

export function earnRegionStampOnReservation(
  collect: (zoneId: TravelZoneId) => boolean,
  zoneId: TravelZoneId | null,
): boolean {
  if (!zoneId) return false;
  return collect(zoneId);
}
