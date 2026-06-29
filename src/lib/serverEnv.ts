import { dataSourceCatalog, type DataSourceId } from "@/config/dataSources";

function readEnv(key: string): string {
  return process.env[key]?.trim() ?? "";
}

/** 공공데이터포털 통합 인증키 (개별 키 없을 때 fallback) */
export function getPublicDataPortalKey() {
  return (
    readEnv("PUBLIC_DATA_PORTAL_SERVICE_KEY") ||
    readEnv("TOUR_API_SERVICE_KEY") ||
    readEnv("TAGO_SERVICE_KEY") ||
    readEnv("WEATHER_API_SERVICE_KEY")
  );
}

export function getKakaoRestApiKey() {
  return readEnv("KAKAO_REST_API_KEY");
}

export function getTourApiServiceKey() {
  return readEnv("TOUR_API_SERVICE_KEY") || getPublicDataPortalKey();
}

export function getDataLabApiKey() {
  return readEnv("DATA_LAB_API_KEY") || getTourApiServiceKey();
}

export function getSbizServiceKey() {
  return readEnv("SBIZ_SERVICE_KEY");
}

export function getGangwonOpenApiKey() {
  return readEnv("GANGWON_OPEN_API_KEY");
}

export function getWeatherApiServiceKey() {
  return readEnv("WEATHER_API_SERVICE_KEY") || getPublicDataPortalKey();
}

export function getTagoServiceKey() {
  return readEnv("TAGO_SERVICE_KEY") || getPublicDataPortalKey();
}

export function getOpenAiApiKey() {
  return readEnv("OPENAI_API_KEY");
}

export function getGeminiApiKey() {
  return readEnv("GEMINI_API_KEY") || readEnv("GOOGLE_GENERATIVE_AI_API_KEY");
}

export function getNaverNewsClientId() {
  return readEnv("NAVER_NEWS_CLIENT_ID");
}

export function getNaverNewsClientSecret() {
  return readEnv("NAVER_NEWS_CLIENT_SECRET");
}

export function isNaverNewsConfigured() {
  return Boolean(getNaverNewsClientId() && getNaverNewsClientSecret());
}

export function isLlmConfigured() {
  return Boolean(getOpenAiApiKey() || getGeminiApiKey());
}

export function isDataSourceConfigured(id: DataSourceId): boolean {
  switch (id) {
    case "kakao-map":
      return Boolean(readEnv("NEXT_PUBLIC_KAKAO_MAP_APP_KEY") || getKakaoRestApiKey());
    case "naver-map":
      return Boolean(readEnv("NAVER_MAP_CLIENT_ID") && readEnv("NAVER_MAP_CLIENT_SECRET"));
    case "naver-news":
      return isNaverNewsConfigured();
    case "tmap":
      return Boolean(readEnv("TMAP_API_KEY"));
    case "tour-gw":
      return Boolean(getTourApiServiceKey() || getPublicDataPortalKey());
    case "data-lab":
      return Boolean(getDataLabApiKey());
    case "sbiz-stroll":
      return true;
    case "gangwon-restaurant":
      return true;
    case "gangwon-lodging":
      return Boolean(getGangwonOpenApiKey());
    case "weather-short":
    case "weather-mid":
      return Boolean(getWeatherApiServiceKey() || getPublicDataPortalKey());
    case "tago-bus-arrival":
    case "tago-bus-route":
      return Boolean(getTagoServiceKey() || getPublicDataPortalKey());
    case "odre-preferences":
    case "odre-behavior":
    case "odre-partner":
      return true;
    default:
      return false;
  }
}

export function getDataSourceStatus() {
  return dataSourceCatalog.map((source) => ({
    ...source,
    configured: isDataSourceConfigured(source.id),
    missingEnvKeys: source.envKeys.filter((key) => !readEnv(key)),
  }));
}
