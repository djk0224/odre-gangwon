/** 한국관광 데이터랩 · 관광빅데이터 GW (공공데이터포털 B551011) */

export const tourDataLabDefaults = {
  areaCode: "32",
  mobileOs: "ETC",
  mobileApp: "ODREGangwon",
} as const;

export const tourDataLabServices = {
  /** 관광빅데이터 GW — 지자체 일별 방문자 */
  dataLab: "https://apis.data.go.kr/B551011/DataLabService",
  /** 관광지 집중률 방문자 추이 예측 */
  tatsConcentration: "https://apis.data.go.kr/B551011/TatsCnctrRateService",
  /** 관광지별 연관 관광지 (티맵 내비 연계) */
  tarRelated: "https://apis.data.go.kr/B551011/TarRlteTarService1",
  /** 지역별 관광 수요 강도 (체류·소비) */
  areaDemand: "https://apis.data.go.kr/B551011/AreaTarDemDsService",
  /** 지역별 관광 자원 수요 (서비스·문화) */
  areaResourceDemand: "https://apis.data.go.kr/B551011/AreaTarResDemService",
} as const;

export const tourDataLabOperations = {
  locgoRegnVisitrDDList: "locgoRegnVisitrDDList",
  tatsCnctrRatedList: "tatsCnctrRatedList",
  relatedAreaBasedList1: "areaBasedList1",
  relatedSearchKeyword1: "searchKeyword1",
  areaTarSjrnDsList: "areaTarSjrnDsList",
  areaTarExpDsList: "areaTarExpDsList",
  areaTarSvcDemList: "areaTarSvcDemList",
  areaCulResDemList: "areaCulResDemList",
} as const;
