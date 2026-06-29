import "server-only";

import gangwonRestaurantsMvp from "@/data/imported/gangwon-restaurants-samcheok-donghae.json";
import sbizCommerceMvp from "@/data/imported/sbiz-commerce-samcheok-donghae.json";
import { resolveTravelZoneForCity } from "@/lib/cityToTravelZone";
import type { GangwonRestaurantRecord, SbizCommerceRecord } from "@/types/externalData";
import type { TravelZoneId } from "@/types/travel";

type DatasetBundle<T> = { updatedAt?: string; count?: number; items: T[] };

const restaurantBundle = gangwonRestaurantsMvp as DatasetBundle<GangwonRestaurantRecord>;
const sbizBundle = sbizCommerceMvp as DatasetBundle<SbizCommerceRecord>;

function zoneForRestaurant(row: GangwonRestaurantRecord): TravelZoneId | undefined {
  return row.travelZone ?? resolveTravelZoneForCity(row.city);
}

function zoneForCommerce(row: SbizCommerceRecord): TravelZoneId | undefined {
  return row.travelZone ?? resolveTravelZoneForCity(row.city);
}

export function listGangwonRestaurants(options?: {
  city?: string;
  zoneId?: TravelZoneId;
  cuisineType?: string;
  limit?: number;
}): GangwonRestaurantRecord[] {
  let items = restaurantBundle.items;
  if (options?.city) {
    items = items.filter((item) => item.city === options.city);
  }
  if (options?.zoneId) {
    items = items.filter((item) => zoneForRestaurant(item) === options.zoneId);
  }
  if (options?.cuisineType) {
    items = items.filter((item) => item.cuisineType.includes(options.cuisineType!));
  }
  const limit = options?.limit ?? 80;
  return items.slice(0, limit);
}

export function listSbizCommerce(options?: {
  city?: string;
  zoneId?: TravelZoneId;
  categoryLarge?: "음식" | "숙박";
  limit?: number;
}): SbizCommerceRecord[] {
  let items = sbizBundle.items;
  if (options?.city) {
    items = items.filter((item) => item.city === options.city);
  }
  if (options?.zoneId) {
    items = items.filter((item) => zoneForCommerce(item) === options.zoneId);
  }
  if (options?.categoryLarge) {
    items = items.filter((item) => item.categoryLarge === options.categoryLarge);
  }
  const limit = options?.limit ?? 80;
  return items.slice(0, limit);
}

export function getLocalDatasetMeta() {
  return {
    restaurants: {
      count: restaurantBundle.count ?? restaurantBundle.items.length,
      updatedAt: restaurantBundle.updatedAt,
      scope: "mvp-samcheok-donghae",
    },
    sbiz: {
      count: sbizBundle.count ?? sbizBundle.items.length,
      updatedAt: sbizBundle.updatedAt,
      scope: "mvp-samcheok-donghae",
    },
  };
}
