import { listSbizCommerce } from "@/services/external/localDatasetService";
import type { SbizCommerceRecord } from "@/types/externalData";

/** 소상공인 상가(상권)정보 — 강원 ZIP 로컬 슬라이스 */
export async function fetchSbizSamcheokDonghae(options?: {
  city?: string;
  categoryLarge?: "음식" | "숙박";
  limit?: number;
}): Promise<SbizCommerceRecord[]> {
  return listSbizCommerce(options);
}
