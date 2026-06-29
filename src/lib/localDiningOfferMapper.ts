import { resolveTravelZoneForCity } from "@/lib/cityToTravelZone";
import type { ReservationOffer } from "@/types/reservationHub";
import type { GangwonRestaurantRecord } from "@/types/externalData";

const DINING_GRADIENTS = [
  "from-pine via-mist to-sand",
  "from-ink to-pine-deep",
  "from-pine-deep to-sand",
] as const;

export function mapGangwonRestaurantToOffer(
  item: GangwonRestaurantRecord,
  index: number,
): ReservationOffer {
  const zoneId = item.travelZone ?? resolveTravelZoneForCity(item.city);

  return {
    id: item.id,
    category: "dining",
    zoneId,
    title: item.name,
    subtitle: `${item.city} · ${item.cuisineType}`,
    description: item.address,
    priceLabel: "좌석·방문 예약",
    badge: index < 3 ? "공공 API" : undefined,
    gradient: DINING_GRADIENTS[index % DINING_GRADIENTS.length],
    meta: item.businessType,
    source: "gangwon-restaurant",
    externalId: item.id,
  };
}

export function mapGangwonRestaurantsToOffers(items: GangwonRestaurantRecord[]): ReservationOffer[] {
  return items.map((item, index) => mapGangwonRestaurantToOffer(item, index));
}
