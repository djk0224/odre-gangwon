import { listGangwonRestaurants } from "@/services/external/localDatasetService";
import type { GangwonRestaurantRecord } from "@/types/externalData";
import type { TravelZoneId } from "@/types/travel";

/** 강원 일반음식점 현황 CSV (전 시·군 + MVP 슬라이스 폴백) */
export async function fetchGangwonRestaurants(options?: {
  city?: string;
  zoneId?: TravelZoneId;
  limit?: number;
}): Promise<GangwonRestaurantRecord[]> {
  return listGangwonRestaurants(options);
}

/** 시군별 숙박업소 오픈API — 미연동 (숙박은 관광 GW searchStay2 사용) */
export async function fetchGangwonLodging(): Promise<
  Array<{ name: string; address: string; licenseType: string }>
> {
  return [];
}
