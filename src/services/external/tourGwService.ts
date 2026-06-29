import { tourAreaDefaults } from "@/config/publicApiDefaults";
import { getSigunguCodesForZone } from "@/lib/sigunguResolver";
import { getTourApiServiceKey } from "@/lib/serverEnv";
import {
  buildDataGoKrUrl,
  normalizeItemList,
  requestDataGoKr,
} from "@/lib/dataGoKrClient";
import type { TourAreaItem } from "@/types/externalData";
import type { TravelZoneId } from "@/types/travel";

const TOUR_BASE = "https://apis.data.go.kr/B551011/KorService2";

type TourListBody = {
  items?: { item?: TourAreaItem | TourAreaItem[] };
  totalCount?: number;
};

function baseTourParams(extra: Record<string, string | number | undefined> = {}) {
  return {
    MobileOS: tourAreaDefaults.mobileOs,
    MobileApp: tourAreaDefaults.mobileApp,
    _type: "json",
    arrange: "Q",
    ...extra,
  };
}

async function tourListRequest(
  operation: string,
  params: Record<string, string | number | undefined>,
): Promise<TourAreaItem[]> {
  const serviceKey = getTourApiServiceKey();
  if (!serviceKey) {
    return [];
  }

  const url = buildDataGoKrUrl(TOUR_BASE, operation, serviceKey, params);
  const body = await requestDataGoKr<TourListBody>(url, {
    okCodes: ["0000"],
    emptyOnNoData: true,
  });

  return normalizeItemList(body.items?.item);
}

/** 지역기반 관광정보 */
export function fetchAreaBasedList(options?: {
  areaCode?: string;
  sigunguCode?: string;
  contentTypeId?: string;
  numOfRows?: number;
  pageNo?: number;
}) {
  return tourListRequest("areaBasedList2", {
    ...baseTourParams(),
    areaCode: options?.areaCode ?? tourAreaDefaults.areaCode,
    sigunguCode: options?.sigunguCode ?? tourAreaDefaults.sigunguCodeSamcheok,
    contentTypeId: options?.contentTypeId,
    numOfRows: options?.numOfRows ?? 20,
    pageNo: options?.pageNo ?? 1,
  });
}

/** 숙박정보 조회 */
export function fetchSearchStay(options?: {
  areaCode?: string;
  sigunguCode?: string;
  numOfRows?: number;
  pageNo?: number;
}) {
  return tourListRequest("searchStay2", {
    ...baseTourParams(),
    areaCode: options?.areaCode ?? tourAreaDefaults.areaCode,
    sigunguCode: options?.sigunguCode ?? tourAreaDefaults.sigunguCodeSamcheok,
    numOfRows: options?.numOfRows ?? 20,
    pageNo: options?.pageNo ?? 1,
  });
}

/** 키워드 검색 */
export function fetchSearchKeyword(options: {
  keyword: string;
  areaCode?: string;
  numOfRows?: number;
  pageNo?: number;
}) {
  return tourListRequest("searchKeyword2", {
    ...baseTourParams(),
    keyword: options.keyword,
    areaCode: options.areaCode ?? tourAreaDefaults.areaCode,
    numOfRows: options.numOfRows ?? 10,
    pageNo: options.pageNo ?? 1,
  });
}

/** 위치기반 관광정보 */
export function fetchLocationBasedList(options: {
  mapX: number;
  mapY: number;
  radius?: number;
  numOfRows?: number;
}) {
  return tourListRequest("locationBasedList2", {
    ...baseTourParams(),
    mapX: options.mapX,
    mapY: options.mapY,
    radius: options.radius ?? 5000,
    numOfRows: options.numOfRows ?? 10,
    pageNo: 1,
  });
}

/** 행사정보 */
export function fetchSearchFestival(options?: {
  areaCode?: string;
  numOfRows?: number;
}) {
  return tourListRequest("searchFestival2", {
    ...baseTourParams(),
    areaCode: options?.areaCode ?? tourAreaDefaults.areaCode,
    numOfRows: options?.numOfRows ?? 10,
    pageNo: 1,
  });
}

/** @deprecated alias */
export function fetchSamcheokDonghaeTourPlaces(options?: { numOfRows?: number }) {
  return fetchAreaBasedList({
    sigunguCode: tourAreaDefaults.sigunguCodeSamcheok,
    numOfRows: options?.numOfRows,
  });
}

export function fetchSamcheokDonghaeStays(options?: { numOfRows?: number }) {
  return fetchSearchStay({
    sigunguCode: tourAreaDefaults.sigunguCodeSamcheok,
    numOfRows: options?.numOfRows,
  });
}

/** MVP 권역 관광지·문화·레포츠·음식점 (지역기반 목록 병합) */
export async function fetchMvpRegionAttractions(options?: {
  numOfRowsPerCity?: number;
  contentTypeIds?: string[];
}) {
  const perCity = options?.numOfRowsPerCity ?? 30;
  const contentTypeIds = options?.contentTypeIds ?? ["12", "14", "28", "39"];
  const sigunguPairs = [
    tourAreaDefaults.sigunguCodeSamcheok,
    tourAreaDefaults.sigunguCodeDonghae,
  ] as const;

  const batches = await Promise.all(
    sigunguPairs.flatMap((sigunguCode) =>
      contentTypeIds.map((contentTypeId) =>
        fetchAreaBasedList({
          sigunguCode,
          contentTypeId,
          numOfRows: perCity,
          pageNo: 1,
        }),
      ),
    ),
  );

  const seen = new Set<string>();
  return batches.flat().filter((item) => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });
}

/** 삼척·동해 숙박 목록 병합 */
export async function fetchMvpRegionStays(options?: { numOfRowsPerCity?: number }) {
  const perCity = options?.numOfRowsPerCity ?? 12;
  const [samcheok, donghae] = await Promise.all([
    fetchSearchStay({
      sigunguCode: tourAreaDefaults.sigunguCodeSamcheok,
      numOfRows: perCity,
    }),
    fetchSearchStay({
      sigunguCode: tourAreaDefaults.sigunguCodeDonghae,
      numOfRows: perCity,
    }),
  ]);

  const seen = new Set<string>();
  return [...samcheok, ...donghae].filter((item) => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });
}

/** 권역(시·군 묶음) 숙박 목록 */
export async function fetchStaysForZone(
  zoneId: TravelZoneId,
  options?: { numOfRowsPerCity?: number },
) {
  const sigunguCodes = getSigunguCodesForZone(zoneId);
  const perCity = options?.numOfRowsPerCity ?? Math.max(6, Math.ceil(24 / sigunguCodes.length));

  const batches = await Promise.all(
    sigunguCodes.map((sigunguCode) =>
      fetchSearchStay({
        sigunguCode,
        numOfRows: perCity,
      }),
    ),
  );

  const seen = new Set<string>();
  return batches.flat().filter((item) => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });
}

/** 삼척·동해 음식점 (관광공사 GW 지역기반, contentTypeId 39) */
export async function fetchMvpRegionDining(options?: { numOfRowsPerCity?: number }) {
  return fetchDiningForZone("samcheok-donghae", options);
}

/** 권역(시·군 묶음) 음식점 목록 */
export async function fetchDiningForZone(
  zoneId: TravelZoneId,
  options?: { numOfRowsPerCity?: number },
) {
  const sigunguCodes = getSigunguCodesForZone(zoneId);
  const perCity = options?.numOfRowsPerCity ?? Math.max(6, Math.ceil(24 / sigunguCodes.length));

  const batches = await Promise.all(
    sigunguCodes.map((sigunguCode) =>
      fetchAreaBasedList({
        sigunguCode,
        contentTypeId: "39",
        numOfRows: perCity,
      }),
    ),
  );

  const seen = new Set<string>();
  return batches.flat().filter((item) => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });
}

/** 권역(시·군 묶음) 관광지·문화·레포츠·음식점 */
export async function fetchAttractionsForZone(
  zoneId: TravelZoneId,
  options?: {
    numOfRowsPerCity?: number;
    contentTypeIds?: string[];
  },
) {
  const sigunguCodes = getSigunguCodesForZone(zoneId);
  const perCity = options?.numOfRowsPerCity ?? Math.max(6, Math.ceil(30 / sigunguCodes.length));
  const contentTypeIds = options?.contentTypeIds ?? ["12", "14", "28", "39"];

  const batches = await Promise.all(
    sigunguCodes.flatMap((sigunguCode) =>
      contentTypeIds.map((contentTypeId) =>
        fetchAreaBasedList({
          sigunguCode,
          contentTypeId,
          numOfRows: perCity,
          pageNo: 1,
        }),
      ),
    ),
  );

  const seen = new Set<string>();
  return batches.flat().filter((item) => {
    if (seen.has(item.contentid)) return false;
    seen.add(item.contentid);
    return true;
  });
}
