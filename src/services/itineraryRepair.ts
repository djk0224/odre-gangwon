/**
 * Lightweight itinerary helpers for client stores/UI.
 * Keeps tripStore / OdreTravelApp off the full itineraryService graph (crowd, scheduler, Kakao).
 */
import { injectLocalOffersIntoTimeline } from "@/lib/itineraryLocalStops";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type {
  Itinerary,
  ItineraryStop,
  ItineraryTimelineItem,
  TripPreferences,
} from "@/types/travel";

function syncStopCoordinatesFromCatalog(itinerary: Itinerary): Itinerary {
  let changed = false;
  const stops = itinerary.stops.map((stop) => {
    const place = getCatalogPlaceById(stop.placeId);
    if (!place) {
      return stop;
    }
    if (
      stop.coordinates.lat === place.coordinates.lat &&
      stop.coordinates.lng === place.coordinates.lng
    ) {
      return stop;
    }
    changed = true;
    return { ...stop, coordinates: place.coordinates };
  });

  return changed ? { ...itinerary, stops } : itinerary;
}

export function repairItinerary(itinerary: Itinerary): Itinerary {
  const syncedCoords = syncStopCoordinatesFromCatalog(itinerary);
  const stops = syncedCoords.stops.map((stop) => {
    const place = getCatalogPlaceById(stop.placeId);
    if (!place) return stop;
    return {
      ...stop,
      reservationRequired: place.reservationRequired,
      partner: place.partner,
      coordinates: place.coordinates,
    };
  });
  const synced = { ...syncedCoords, stops };
  const stopIds = new Set(synced.stops.map((stop) => stop.placeId));
  const uniqueIds = [...new Set(synced.stops.map((stop) => stop.placeId))].filter((id) => {
    const place = getCatalogPlaceById(id);
    return Boolean(
      place?.partner && place.reservationRequired && place.qrAvailable && stopIds.has(id),
    );
  });

  if (
    uniqueIds.length === synced.reservationPlaceIds.length &&
    uniqueIds.every((id, index) => id === synced.reservationPlaceIds[index])
  ) {
    return synced;
  }

  return { ...synced, reservationPlaceIds: uniqueIds };
}

export function buildItineraryTimeline(
  stops: ItineraryStop[],
  preferences?: TripPreferences,
) {
  const base: ItineraryTimelineItem[] = stops.map((stop) => ({
    id: `timeline-${stop.id}`,
    kind: "place" as const,
    day: stop.day,
    order: stop.order,
    title: stop.placeName,
    description: stop.note,
    duration: stop.duration,
    travelLegToNext: stop.movementNote,
    reservationRequired: stop.reservationRequired,
    partner: stop.partner,
    crowdLevel: stop.crowdLevel,
    expectedWait: stop.expectedWait,
    crowdConfidence: stop.crowdConfidence,
    selectionState: stop.selectionState,
  }));

  if (!preferences) {
    return base;
  }

  return injectLocalOffersIntoTimeline(base, preferences);
}
