import type { Coordinates, TravelZoneId } from "@/types/travel";

export interface KakaoLocalDocument {
  id: string;
  place_name: string;
  address_name: string;
  road_address_name: string;
  phone: string;
  category_name: string;
  x: string;
  y: string;
}

export interface KakaoKeywordSearchResult {
  documents: KakaoLocalDocument[];
  meta: {
    total_count: number;
    pageable_count: number;
    is_end: boolean;
  };
}

export interface GeocodedPlaceResult {
  placeId: string;
  query: string;
  coordinates: Coordinates;
  matchedName: string;
  address: string;
  kakaoPlaceId: string;
  source: "kakao-local";
}

export interface TourAreaItem {
  contentid: string;
  contenttypeid: string;
  title: string;
  addr1: string;
  addr2?: string;
  mapx: string;
  mapy: string;
  tel?: string;
  firstimage?: string;
  firstimage2?: string;
  sigungucode?: string;
  areacode?: string;
  /** refresh 스크립트에서 detailImage2 등으로 보강 */
  resolvedImage?: string;
}

export interface WeatherSnapshot {
  region: string;
  observedAt: string;
  temperatureC?: number;
  precipitationMm?: number;
  skyLabel: string;
  windSpeedMs?: number;
  source: "weather-short" | "mock";
}

export interface MidWeatherSnapshot {
  region: string;
  observedAt: string;
  landForecast: string;
  source: "weather-mid";
}

export interface GangwonRestaurantRecord {
  id: string;
  name: string;
  businessType: string;
  cuisineType: string;
  address: string;
  city: string;
  travelZone?: TravelZoneId;
  source: "gangwon-restaurant";
}

export interface SbizCommerceRecord {
  id: string;
  name: string;
  branch: string;
  categoryLarge: string;
  categoryMid: string;
  categorySmall: string;
  address: string;
  city: string;
  travelZone?: TravelZoneId;
  coordinates?: Coordinates;
  source: "sbiz-stroll";
}

export interface TransitArrivalItem {
  routeName: string;
  arrivalMinutes: number;
  stationName: string;
  source: "tago-bus-arrival" | "mock";
}

export interface LocalCommerceItem {
  id: string;
  name: string;
  category: string;
  coordinates: Coordinates;
  source: "sbiz-stroll" | "gangwon-restaurant" | "mock";
}

/** DataLabService — 지자체 일별 방문자 */
export interface DataLabVisitorRecord {
  signguCode?: string;
  signguNm?: string;
  touNum?: string | number;
  baseYmd?: string;
  [key: string]: string | number | undefined;
}

/** TatsCnctrRateService — 관광지 집중률 예측 */
export interface DataLabConcentrationRecord {
  baseYmd?: string;
  baseYm?: string;
  areaCd?: string;
  signguCd?: string;
  signguNm?: string;
  tAtsNm?: string;
  cnctrRate?: string | number;
  vistNum?: string | number;
  [key: string]: string | number | undefined;
}

/** TarRlteTarService1 — 관광지별 연관 관광지 */
export interface DataLabRelatedTouristRecord {
  baseYm?: string;
  areaCd?: string;
  areaNm?: string;
  signguCd?: string;
  signguNm?: string;
  tAtsCd?: string;
  tAtsNm?: string;
  rlteTatsCd?: string;
  rlteTatsNm?: string;
  rlteRank?: string | number;
  rlteRegnCd?: string;
  rlteRegnNm?: string;
  rlteSignguCd?: string;
  rlteSignguNm?: string;
  rlteCtgryLclsNm?: string;
  rlteCtgryMclsNm?: string;
  rlteCtgrySclsNm?: string;
  [key: string]: string | number | undefined;
}

/** AreaTarDemDs / AreaTarResDem — 수요 지수 (필드명은 API 응답에 따라 유연) */
export interface DataLabDemandIndexRecord {
  baseYm?: string;
  areaCd?: string;
  signguCd?: string;
  dsIndex?: string | number;
  index?: string | number;
  value?: string | number;
  [key: string]: string | number | undefined;
}

export interface DataLabSigunguBundle {
  visitors: DataLabVisitorRecord[];
  concentration: DataLabConcentrationRecord[];
  relatedTourists: DataLabRelatedTouristRecord[];
  demandStay: DataLabDemandIndexRecord[];
  demandConsumption: DataLabDemandIndexRecord[];
  serviceDemand: DataLabDemandIndexRecord[];
  cultureDemand: DataLabDemandIndexRecord[];
}

export interface GangwonDataLabSnapshot {
  fetchedAt: string;
  areaCode: string;
  baseYm?: string;
  visitorWindow?: { startYmd: string; endYmd: string };
  sigungu: Record<string, DataLabSigunguBundle>;
  source: "imported" | "live";
}
