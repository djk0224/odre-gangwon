export type DataSourceId =
  | "tour-gw"
  | "data-lab"
  | "sbiz-stroll"
  | "gangwon-restaurant"
  | "weather-short"
  | "weather-mid"
  | "tago-bus-arrival"
  | "tago-bus-route"
  | "gangwon-lodging"
  | "kakao-map"
  | "naver-map"
  | "naver-news"
  | "tmap"
  | "odre-preferences"
  | "odre-behavior"
  | "odre-partner";

export interface DataSourceDefinition {
  id: DataSourceId;
  name: string;
  domain: string;
  provider: string;
  envKeys: string[];
  docsUrl?: string;
}

export const dataSourceCatalog: DataSourceDefinition[] = [
  {
    id: "tour-gw",
    name: "한국관광공사 국문 관광정보 서비스_GW",
    domain: "관광 콘텐츠·관광지·숙박·행사·이미지",
    provider: "한국관광공사 / 공공데이터포털",
    envKeys: ["TOUR_API_SERVICE_KEY"],
    docsUrl: "https://www.data.go.kr/",
  },
  {
    id: "data-lab",
    name: "한국관광 데이터랩 · 관광빅데이터 GW",
    domain: "방문자·집중률·체류·소비·자원 수요 (강원 18시군)",
    provider: "한국관광공사 / 공공데이터포털",
    envKeys: ["TOUR_API_SERVICE_KEY", "PUBLIC_DATA_PORTAL_SERVICE_KEY", "DATA_LAB_API_KEY"],
    docsUrl: "https://www.data.go.kr/",
  },
  {
    id: "sbiz-stroll",
    name: "소상공인시장진흥공단 상가정보 API",
    domain: "지역상권·음식점·카페·소매점",
    provider: "소상공인시장진흥공단 / 공공데이터포털",
    envKeys: ["SBIZ_SERVICE_KEY"],
  },
  {
    id: "gangwon-restaurant",
    name: "강원특별자치도 일반음식점 현황",
    domain: "음식점·식당·업태 분류",
    provider: "강원특별자치도 / 공공데이터포털",
    envKeys: ["GANGWON_OPEN_API_KEY"],
  },
  {
    id: "weather-short",
    name: "기상청 단기예보 조회서비스",
    domain: "날씨·강수·기온·풍속 기반 일정 조정",
    provider: "기상청 / 공공데이터포털",
    envKeys: ["WEATHER_API_SERVICE_KEY"],
  },
  {
    id: "weather-mid",
    name: "기상청 중기예보 조회서비스",
    domain: "4~10일 육상·기온 전망",
    provider: "기상청 / 공공데이터포털",
    envKeys: ["WEATHER_API_SERVICE_KEY"],
  },
  {
    id: "tago-bus-arrival",
    name: "국토교통부 TAGO 버스도착정보",
    domain: "대중교통·버스 도착",
    provider: "국토교통부 / 공공데이터포털",
    envKeys: ["TAGO_SERVICE_KEY"],
  },
  {
    id: "tago-bus-route",
    name: "국토교통부 TAGO 버스노선정보",
    domain: "버스 노선·정류소 경유",
    provider: "국토교통부 / 공공데이터포털",
    envKeys: ["TAGO_SERVICE_KEY"],
  },
  {
    id: "gangwon-lodging",
    name: "강원 시군별 숙박업소 데이터",
    domain: "숙박시설·인허가 숙박업소",
    provider: "강원특별자치도 시군 / 공공데이터포털",
    envKeys: ["GANGWON_OPEN_API_KEY"],
  },
  {
    id: "kakao-map",
    name: "카카오맵 API",
    domain: "지도·좌표·이동시간·경로",
    provider: "Kakao Developers",
    envKeys: ["NEXT_PUBLIC_KAKAO_MAP_APP_KEY", "KAKAO_REST_API_KEY"],
    docsUrl: "https://developers.kakao.com/",
  },
  {
    id: "naver-map",
    name: "네이버 지도 API",
    domain: "지도·좌표·경로 (대안)",
    provider: "NAVER Cloud",
    envKeys: ["NAVER_MAP_CLIENT_ID", "NAVER_MAP_CLIENT_SECRET"],
  },
  {
    id: "naver-news",
    name: "네이버 검색 API · 뉴스",
    domain: "강원 관련 뉴스 수집 (오드레 노트 출처 신호)",
    provider: "NAVER Developers",
    envKeys: ["NAVER_NEWS_CLIENT_ID", "NAVER_NEWS_CLIENT_SECRET"],
    docsUrl: "https://developers.naver.com/docs/serviceapi/search/news/news.md",
  },
  {
    id: "tmap",
    name: "TMAP API",
    domain: "경로·소요시간 (대안)",
    provider: "SK telecom",
    envKeys: ["TMAP_API_KEY"],
  },
  {
    id: "odre-preferences",
    name: "자체 사용자 선호 데이터",
    domain: "개인화 추천·여행 취향",
    provider: "오드래강원",
    envKeys: [],
  },
  {
    id: "odre-behavior",
    name: "자체 사용자 행동 로그",
    domain: "place_view·search_submit·reservation_confirm·tab_view (tripStore persist + /api/behavior/events)",
    provider: "오드래강원",
    envKeys: [],
  },
  {
    id: "odre-partner",
    name: "지역 사업자 제휴 데이터",
    domain: "쿠폰·예약·로컬 패키지",
    provider: "오드래강원",
    envKeys: [],
  },
];
