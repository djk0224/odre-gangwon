import { weatherGridDefaults } from "@/config/publicApiDefaults";
import { getWeatherApiServiceKey } from "@/lib/serverEnv";
import {
  buildDataGoKrUrl,
  normalizeItemList,
  PublicApiError,
  requestDataGoKr,
} from "@/lib/dataGoKrClient";
import type { MidWeatherSnapshot, WeatherSnapshot } from "@/types/externalData";

const WEATHER_BASE = "https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0";
const MID_WEATHER_BASE = "https://apis.data.go.kr/1360000/MidFcstInfoService";

/** 강원영동 중기육상예보 구역 */
const MID_LAND_REG_ID = "11D10000";

interface ForecastRow {
  category: string;
  fcstDate: string;
  fcstTime: string;
  fcstValue: string;
}

type ForecastBody = {
  items?: { item?: ForecastRow | ForecastRow[] };
};

const VILAGE_BASE_TIMES = ["0200", "0500", "0800", "1100", "1400", "1700", "2000", "2300"];

function formatKstDate(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function pickLatestBaseTime(now = new Date()) {
  const kstHour = (now.getUTCHours() + 9) % 24;
  const kstMinute = now.getUTCMinutes();
  const current = kstHour * 100 + kstMinute;

  let picked = VILAGE_BASE_TIMES[0];
  for (const time of VILAGE_BASE_TIMES) {
    if (Number(time) <= current) {
      picked = time;
    }
  }
  return picked;
}

function skyLabel(code: string, pty: string) {
  if (pty === "1" || pty === "4") return "비";
  if (pty === "2") return "비/눈";
  if (pty === "3") return "눈";
  if (code === "1") return "맑음";
  if (code === "3") return "구름많음";
  if (code === "4") return "흐림";
  return "맑음";
}

export async function fetchVilageForecast(options?: {
  nx?: number;
  ny?: number;
  regionLabel?: string;
}): Promise<WeatherSnapshot | null> {
  const serviceKey = getWeatherApiServiceKey();
  if (!serviceKey) {
    return null;
  }

  const nx = options?.nx ?? weatherGridDefaults.samcheokDonghae.nx;
  const ny = options?.ny ?? weatherGridDefaults.samcheokDonghae.ny;
  const now = new Date();
  const baseDate = formatKstDate(now);
  const baseTime = pickLatestBaseTime(now);

  const url = buildDataGoKrUrl(WEATHER_BASE, "getVilageFcst", serviceKey, {
    pageNo: 1,
    numOfRows: 200,
    dataType: "JSON",
    base_date: baseDate,
    base_time: baseTime,
    nx,
    ny,
  });

  const body = await requestDataGoKr<ForecastBody>(url, {
    okCodes: ["00"],
    emptyOnNoData: true,
  });

  const rows = normalizeItemList(body.items?.item);
  if (rows.length === 0) {
    return null;
  }

  const targetTime = rows[0]?.fcstTime;
  const slice = rows.filter((row) => row.fcstTime === targetTime);
  const byCategory = Object.fromEntries(slice.map((row) => [row.category, row.fcstValue]));

  return {
    region: options?.regionLabel ?? "강원",
    observedAt: `${baseDate}${baseTime}`,
    temperatureC: byCategory.TMP ? Number(byCategory.TMP) : undefined,
    precipitationMm: byCategory.PCP
      ? byCategory.PCP === "강수없음"
        ? 0
        : Number.parseFloat(byCategory.PCP)
      : undefined,
    skyLabel: skyLabel(byCategory.SKY ?? "1", byCategory.PTY ?? "0"),
    windSpeedMs: byCategory.WSD ? Number(byCategory.WSD) : undefined,
    source: "weather-short",
  };
}

/** @deprecated alias */
export function fetchShortTermForecast(options: {
  nx: number;
  ny: number;
  regionLabel: string;
}) {
  return fetchVilageForecast(options);
}

export function fetchSamcheokDonghaeWeather() {
  return fetchVilageForecast({ regionLabel: "강원" });
}

interface MidLandRow {
  regId: string;
  wf5Am?: string;
  wf5Pm?: string;
  wf6Am?: string;
  wf6Pm?: string;
  wf7Am?: string;
  wf7Pm?: string;
  wf8?: string;
}

type MidLandBody = {
  items?: { item?: MidLandRow | MidLandRow[] };
};

function formatKstYmd(date: Date) {
  const kst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(kst.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function pickMidTmFcCandidates(now = new Date()) {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const today = formatKstYmd(now);
  const yesterday = formatKstYmd(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const kstHour = kst.getUTCHours();

  if (kstHour >= 18) {
    return [`${today}1800`, `${today}0600`, `${yesterday}1800`];
  }
  if (kstHour >= 6) {
    return [`${today}0600`, `${yesterday}1800`];
  }
  return [`${yesterday}1800`, `${today}0600`];
}

/** 기상청 중기육상예보 (강원영동) */
export async function fetchMidLandForecast(options?: {
  regId?: string;
  regionLabel?: string;
}): Promise<MidWeatherSnapshot | null> {
  const serviceKey = getWeatherApiServiceKey();
  if (!serviceKey) {
    return null;
  }

  const regId = options?.regId ?? MID_LAND_REG_ID;

  for (const tmFc of pickMidTmFcCandidates()) {
    const url = buildDataGoKrUrl(MID_WEATHER_BASE, "getMidLandFcst", serviceKey, {
      pageNo: 1,
      numOfRows: 10,
      dataType: "JSON",
      regId,
      tmFc,
    });

    try {
      const body = await requestDataGoKr<MidLandBody>(url, {
        okCodes: ["00"],
        emptyOnNoData: true,
      });

      const rows = normalizeItemList(body.items?.item);
      const row = rows.find((item) => item.regId === regId) ?? rows[0];
      if (!row) {
        continue;
      }

      const segments = [
        row.wf5Am,
        row.wf5Pm,
        row.wf6Am,
        row.wf6Pm,
        row.wf7Am,
        row.wf7Pm,
        row.wf8,
      ].filter(Boolean) as string[];

      return {
        region: options?.regionLabel ?? "강원",
        observedAt: tmFc,
        landForecast: segments.slice(0, 4).join(" · ") || "중기 전망 조회",
        source: "weather-mid",
      };
    } catch (error) {
      if (error instanceof PublicApiError && error.resultCode === "03") {
        continue;
      }
      throw error;
    }
  }

  return null;
}

export function fetchSamcheokDonghaeMidWeather() {
  return fetchMidLandForecast({ regionLabel: "강원 (중기)" });
}
