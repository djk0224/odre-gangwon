/** 삼척·동해 MVP 권역 — 공공 API 기본 코드 */

/** 한국관광공사 KorService2 */
export const tourAreaDefaults = {
  areaCode: "32",
  sigunguCodeSamcheok: "4",
  sigunguCodeDonghae: "5",
  mobileOs: "ETC",
  mobileApp: "ODRE_GANGWON",
} as const;

/** TAGO 버스 (cityCode는 getCtyCodeList 기준) */
export const tagoCityDefaults = {
  /** 삼척시권 정류소·노선 조회에 사용 (실측) */
  samcheok: "32310",
  /** 동해시 — 목록에서 citycode 확인 후 보강 */
  donghae: "32340",
} as const;

/** 기상청 단기예보 격자 (삼척 시내 기준) */
export const weatherGridDefaults = {
  samcheokDonghae: { nx: 98, ny: 75 },
} as const;
