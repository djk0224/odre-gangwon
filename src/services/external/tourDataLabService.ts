import {
  tourDataLabDefaults,
  tourDataLabOperations,
  tourDataLabServices,
} from "@/config/tourDataLabApi";
import { GANGWON_AREA_CODE } from "@/config/tourZoneSigungu";
import {
  buildDataGoKrUrl,
  normalizeItemList,
  requestDataGoKr,
} from "@/lib/dataGoKrClient";
import { computeDataLabDemandScore } from "@/lib/tourDataLabScoring";
import {
  getCachedGangwonDataLabSnapshot,
  getSigunguBundleFromSnapshot,
  loadGangwonDataLabSnapshot,
} from "@/lib/tourDataLabSnapshot";
import { getDataLabApiKey } from "@/lib/serverEnv";
import type {
  DataLabConcentrationRecord,
  DataLabDemandIndexRecord,
  DataLabRelatedTouristRecord,
  DataLabSigunguBundle,
  DataLabVisitorRecord,
  GangwonDataLabSnapshot,
} from "@/types/externalData";

export {
  computeDataLabDemandScore,
  getCachedGangwonDataLabSnapshot,
  getSigunguBundleFromSnapshot,
  loadGangwonDataLabSnapshot,
};

type ListBody<T> = {
  items?: { item?: T | T[] };
  totalCount?: number;
};

function baseParams(extra: Record<string, string | number | undefined> = {}) {
  return {
    MobileOS: tourDataLabDefaults.mobileOs,
    MobileApp: tourDataLabDefaults.mobileApp,
    _type: "json",
    ...extra,
  };
}

function parseNumeric(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

async function dataLabListRequest<T>(
  baseUrl: string,
  operation: string,
  params: Record<string, string | number | undefined>,
): Promise<T[]> {
  const serviceKey = getDataLabApiKey();
  if (!serviceKey) {
    return [];
  }

  const url = buildDataGoKrUrl(baseUrl, operation, serviceKey, params);
  const body = await requestDataGoKr<ListBody<T>>(url, {
    okCodes: ["00", "0000", "03"],
    emptyOnNoData: true,
  });

  return normalizeItemList(body.items?.item);
}

/** 지자체 일별 방문자 (locgoRegnVisitrDDList) */
export function fetchLocgoRegnVisitrDDList(options: {
  startYmd: string;
  endYmd: string;
  pageNo?: number;
  numOfRows?: number;
}) {
  return dataLabListRequest<DataLabVisitorRecord>(
    tourDataLabServices.dataLab,
    tourDataLabOperations.locgoRegnVisitrDDList,
    {
      ...baseParams(),
      startYmd: options.startYmd,
      endYmd: options.endYmd,
      pageNo: options.pageNo ?? 1,
      numOfRows: options.numOfRows ?? 100,
    },
  );
}

/** 관광지 집중률 방문자 추이 예측 (tatsCnctrRatedList) */
export function fetchTarConcentrationForecast(options: {
  areaCd?: string;
  signguCd: string;
  tAtsNm?: string;
  pageNo?: number;
  numOfRows?: number;
}) {
  return dataLabListRequest<DataLabConcentrationRecord>(
    tourDataLabServices.tatsConcentration,
    tourDataLabOperations.tatsCnctrRatedList,
    {
      ...baseParams(),
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      signguCd: options.signguCd,
      ...(options.tAtsNm ? { tAtsNm: options.tAtsNm } : {}),
      pageNo: options.pageNo ?? 1,
      numOfRows: options.numOfRows ?? 100,
    },
  );
}

/** 지역기반 관광지별 연관 관광지 (areaBasedList1) */
export function fetchRelatedTouristsByArea(options: {
  baseYm: string;
  areaCd?: string;
  signguCd: string;
  pageNo?: number;
  numOfRows?: number;
}) {
  return dataLabListRequest<DataLabRelatedTouristRecord>(
    tourDataLabServices.tarRelated,
    tourDataLabOperations.relatedAreaBasedList1,
    {
      ...baseParams(),
      baseYm: options.baseYm,
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      signguCd: options.signguCd,
      pageNo: options.pageNo ?? 1,
      numOfRows: options.numOfRows ?? 200,
    },
  );
}

/** 키워드(관광지명) 기반 연관 관광지 (searchKeyword1) */
export function fetchRelatedTouristsByKeyword(options: {
  baseYm: string;
  keyword: string;
  areaCd?: string;
  signguCd?: string;
  tAtsNm?: string;
  tAtsCd?: string;
  pageNo?: number;
  numOfRows?: number;
}) {
  return dataLabListRequest<DataLabRelatedTouristRecord>(
    tourDataLabServices.tarRelated,
    tourDataLabOperations.relatedSearchKeyword1,
    {
      ...baseParams(),
      baseYm: options.baseYm,
      keyword: options.keyword,
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      ...(options.signguCd ? { signguCd: options.signguCd } : {}),
      ...(options.tAtsNm ? { tAtsNm: options.tAtsNm } : {}),
      ...(options.tAtsCd ? { tAtsCd: options.tAtsCd } : {}),
      pageNo: options.pageNo ?? 1,
      numOfRows: options.numOfRows ?? 50,
    },
  );
}

/** 지역별 관광 수요 강도 — 체류 (areaTarSjrnDsList) */
export function fetchAreaDemandStayIntensity(options: {
  baseYm: string;
  areaCd?: string;
  signguCd: string;
}) {
  return dataLabListRequest<DataLabDemandIndexRecord>(
    tourDataLabServices.areaDemand,
    tourDataLabOperations.areaTarSjrnDsList,
    {
      ...baseParams(),
      baseYm: options.baseYm,
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      signguCd: options.signguCd,
      pageNo: 1,
      numOfRows: 50,
    },
  );
}

/** 지역별 관광 수요 강도 — 소비 (areaTarExpDsList) */
export function fetchAreaDemandConsumptionIntensity(options: {
  baseYm: string;
  areaCd?: string;
  signguCd: string;
}) {
  return dataLabListRequest<DataLabDemandIndexRecord>(
    tourDataLabServices.areaDemand,
    tourDataLabOperations.areaTarExpDsList,
    {
      ...baseParams(),
      baseYm: options.baseYm,
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      signguCd: options.signguCd,
      pageNo: 1,
      numOfRows: 50,
    },
  );
}

/** 지역별 관광 자원 수요 — 관광 서비스 (areaTarSvcDemList) */
export function fetchAreaTourServiceDemand(options: {
  baseYm: string;
  areaCd?: string;
  signguCd: string;
}) {
  return dataLabListRequest<DataLabDemandIndexRecord>(
    tourDataLabServices.areaResourceDemand,
    tourDataLabOperations.areaTarSvcDemList,
    {
      ...baseParams(),
      baseYm: options.baseYm,
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      signguCd: options.signguCd,
      pageNo: 1,
      numOfRows: 50,
    },
  );
}

/** 지역별 관광 자원 수요 — 문화 자원 (areaCulResDemList) */
export function fetchAreaCultureResourceDemand(options: {
  baseYm: string;
  areaCd?: string;
  signguCd: string;
}) {
  return dataLabListRequest<DataLabDemandIndexRecord>(
    tourDataLabServices.areaResourceDemand,
    tourDataLabOperations.areaCulResDemList,
    {
      ...baseParams(),
      baseYm: options.baseYm,
      areaCd: options.areaCd ?? GANGWON_AREA_CODE,
      signguCd: options.signguCd,
      pageNo: 1,
      numOfRows: 50,
    },
  );
}

function emptySigunguBundle(): DataLabSigunguBundle {
  return {
    visitors: [],
    concentration: [],
    relatedTourists: [],
    demandStay: [],
    demandConsumption: [],
    serviceDemand: [],
    cultureDemand: [],
  };
}

/** 단일 시·군에 대해 DataLab API 결과를 병렬 수집 */
export async function fetchGangwonSigunguDataLabBundle(
  sigunguCode: string,
  options?: {
    startYmd?: string;
    endYmd?: string;
    baseYm?: string;
  },
): Promise<DataLabSigunguBundle> {
  const end = options?.endYmd ?? formatYmd(new Date());
  const start =
    options?.startYmd ??
    formatYmd(new Date(Date.now() - 29 * 24 * 60 * 60 * 1000));
  const baseYm = options?.baseYm ?? end.slice(0, 6);

  const [
    visitors,
    concentration,
    relatedTourists,
    demandStay,
    demandConsumption,
    serviceDemand,
    cultureDemand,
  ] = await Promise.all([
    fetchLocgoRegnVisitrDDList({ startYmd: start, endYmd: end }).then((rows) =>
      rows.filter(
        (row) =>
          String(row.signguCode ?? row.signguCd ?? "") === sigunguCode ||
          rows.length <= 1,
      ),
    ),
    fetchTarConcentrationForecast({ signguCd: sigunguCode }),
    fetchRelatedTouristsByArea({ baseYm, signguCd: sigunguCode }),
    fetchAreaDemandStayIntensity({ baseYm, signguCd: sigunguCode }),
    fetchAreaDemandConsumptionIntensity({ baseYm, signguCd: sigunguCode }),
    fetchAreaTourServiceDemand({ baseYm, signguCd: sigunguCode }),
    fetchAreaCultureResourceDemand({ baseYm, signguCd: sigunguCode }),
  ]);

  return {
    visitors,
    concentration,
    relatedTourists,
    demandStay,
    demandConsumption,
    serviceDemand,
    cultureDemand,
  };
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function formatBaseYm(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

/** @deprecated use computeDataLabDemandScore */
export function computeDemandScoreFromBundle(bundle: DataLabSigunguBundle): number {
  return computeDataLabDemandScore(bundle);
}

function normalizePlaceKey(value: string): string {
  return value.replace(/\s+/g, "").toLowerCase();
}

/** 스냅샷·라이브 데이터에서 기준 관광지의 연관 관광지 목록 (rlteRank 오름차순) */
export function getRelatedTouristsForPlace(options: {
  placeName: string;
  tAtsCd?: string;
  sigunguCode?: string;
  snapshot?: GangwonDataLabSnapshot | null;
  limit?: number;
}): DataLabRelatedTouristRecord[] {
  const snapshot = options.snapshot ?? getCachedGangwonDataLabSnapshot();
  if (!snapshot) return [];

  const bundles = options.sigunguCode
    ? [snapshot.sigungu[options.sigunguCode]].filter(Boolean)
    : Object.values(snapshot.sigungu);

  const nameKey = normalizePlaceKey(options.placeName);
  const matches: DataLabRelatedTouristRecord[] = [];

  for (const bundle of bundles) {
    if (!bundle) continue;
    for (const row of bundle.relatedTourists ?? []) {
      const byCode =
        options.tAtsCd &&
        String(row.tAtsCd ?? "") === String(options.tAtsCd);
      const byName =
        row.tAtsNm &&
        (normalizePlaceKey(String(row.tAtsNm)).includes(nameKey) ||
          nameKey.includes(normalizePlaceKey(String(row.tAtsNm))));
      if (byCode || byName) {
        matches.push(row);
      }
    }
  }

  const seen = new Set<string>();
  const deduped = matches
    .sort(
      (a, b) =>
        (parseNumeric(a.rlteRank) ?? 999) - (parseNumeric(b.rlteRank) ?? 999),
    )
    .filter((row) => {
      const key = String(row.rlteTatsCd ?? row.rlteTatsNm ?? "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const limit = options.limit ?? 8;
  return deduped.slice(0, limit);
}

function rankRelatedRows(
  rows: DataLabRelatedTouristRecord[],
  limit: number,
): DataLabRelatedTouristRecord[] {
  const seen = new Set<string>();
  return rows
    .sort(
      (a, b) =>
        (parseNumeric(a.rlteRank) ?? 999) - (parseNumeric(b.rlteRank) ?? 999),
    )
    .filter((row) => {
      const key = String(row.rlteTatsCd ?? row.rlteTatsNm ?? "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/** 라이브 API로 연관 관광지 조회 (키워드 우선, 실패 시 지역 목록 필터) */
export async function fetchRelatedTouristsForPlace(options: {
  placeName: string;
  sigunguCode?: string;
  tAtsCd?: string;
  baseYm?: string;
  limit?: number;
}): Promise<DataLabRelatedTouristRecord[]> {
  const baseYm = options.baseYm ?? formatBaseYm();
  const limit = options.limit ?? 8;

  const keywordRows = await fetchRelatedTouristsByKeyword({
    baseYm,
    keyword: options.placeName,
    signguCd: options.sigunguCode,
    tAtsNm: options.placeName,
    tAtsCd: options.tAtsCd,
    numOfRows: 50,
  });

  if (keywordRows.length > 0) {
    return rankRelatedRows(keywordRows, limit);
  }

  if (options.sigunguCode) {
    const regional = await fetchRelatedTouristsByArea({
      baseYm,
      signguCd: options.sigunguCode,
    });
    return getRelatedTouristsForPlace({
      placeName: options.placeName,
      tAtsCd: options.tAtsCd,
      sigunguCode: options.sigunguCode,
      snapshot: {
        fetchedAt: new Date().toISOString(),
        areaCode: GANGWON_AREA_CODE,
        baseYm,
        sigungu: {
          [options.sigunguCode]: {
            ...emptySigunguBundle(),
            relatedTourists: regional,
          },
        },
        source: "live",
      },
      limit,
    });
  }

  return [];
}

export function emptyGangwonDataLabSnapshot(): GangwonDataLabSnapshot {
  return {
    fetchedAt: new Date().toISOString(),
    areaCode: GANGWON_AREA_CODE,
    sigungu: {},
    source: "imported",
  };
}

export function mergeSigunguIntoSnapshot(
  snapshot: GangwonDataLabSnapshot,
  sigunguCode: string,
  bundle: DataLabSigunguBundle,
): GangwonDataLabSnapshot {
  return {
    ...snapshot,
    sigungu: {
      ...snapshot.sigungu,
      [sigunguCode]: bundle,
    },
  };
}

export { emptySigunguBundle };
