import type { ReservationOffer } from "@/types/reservationHub";
import type { Place, TravelZoneId } from "@/types/travel";
import { filterStayOffersByZone } from "@/lib/stayOffers";

export function normalizeSearchQuery(query: string): string {
  return query.trim().toLowerCase();
}

function matchesQuery(fields: Array<string | undefined>, query: string): boolean {
  if (!query) return true;
  return fields.some((field) => field?.toLowerCase().includes(query));
}

export function filterReservationOffers(
  offers: ReservationOffer[],
  query: string,
): ReservationOffer[] {
  const keyword = normalizeSearchQuery(query);
  if (!keyword) return offers;

  return offers.filter((offer) =>
    matchesQuery(
      [offer.title, offer.subtitle, offer.description, offer.priceLabel, offer.badge, offer.meta],
      keyword,
    ),
  );
}

export function filterReservationOffersByZone(
  offers: ReservationOffer[],
  zoneId: TravelZoneId,
): ReservationOffer[] {
  return filterStayOffersByZone(offers, zoneId);
}

export function filterAttractionPlaces(places: Place[], query: string): Place[] {
  const keyword = normalizeSearchQuery(query);
  if (!keyword) return places;

  return places.filter((place) =>
    matchesQuery(
      [
        place.name,
        place.description,
        place.signature,
        place.distanceNote,
        ...place.tags,
      ],
      keyword,
    ),
  );
}

export function filterTransportRoutes<
  T extends {
    routeno: number | string;
    routetp: string;
    startnodenm: string;
    endnodenm: string;
  },
>(routes: T[], query: string): T[] {
  const keyword = normalizeSearchQuery(query);
  if (!keyword) return routes;

  return routes.filter((route) =>
    matchesQuery(
      [
        String(route.routeno),
        route.routetp,
        route.startnodenm,
        route.endnodenm,
      ],
      keyword,
    ),
  );
}

export function filterTransportArrivals<
  T extends { routeName: string; arrivalMinutes: number },
>(arrivals: T[], query: string): T[] {
  const keyword = normalizeSearchQuery(query);
  if (!keyword) return arrivals;

  return arrivals.filter((item) =>
    matchesQuery([item.routeName, `${item.arrivalMinutes}`], keyword),
  );
}
