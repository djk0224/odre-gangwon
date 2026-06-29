import type { TravelZoneId } from "@/types/travel";

/** Curated zone hero assets in /public/images/zones — not overwritten by GW refresh. */
export const ZONE_HERO_OVERRIDES: Partial<
  Record<TravelZoneId, { imageUrl: string; placeName: string }>
> = {
  "samcheok-donghae": {
    imageUrl: "/images/zones/samcheok-donghae.png",
    placeName: "장호항",
  },
  "gangneung-yangyang": {
    imageUrl: "/images/zones/gangneung-yangyang.png",
    placeName: "강릉 해안",
  },
  "sokcho-goseong": {
    imageUrl: "/images/zones/sokcho-goseong.png",
    placeName: "속초해수욕장",
  },
  "pyeongchang-jeongseon": {
    imageUrl: "/images/zones/pyeongchang-jeongseon.png",
    placeName: "알펜시아 슬라이딩",
  },
};
