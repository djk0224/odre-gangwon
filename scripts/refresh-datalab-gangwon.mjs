/**
 * 한국관광 데이터랩 · 관광빅데이터 GW — 강원 18시·군 스냅샷
 * 실행: npm run refresh:datalab-gangwon
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src/data/imported/datalab-gangwon.json");

const AREA_CODE = "32";
const SIGUNGU_CODES = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18",
];

const SERVICES = {
  dataLab: "https://apis.data.go.kr/B551011/DataLabService",
  tatsConcentration: "https://apis.data.go.kr/B551011/TatsCnctrRateService",
  tarRelated: "https://apis.data.go.kr/B551011/TarRlteTarService1",
  areaDemand: "https://apis.data.go.kr/B551011/AreaTarDemDsService",
  areaResourceDemand: "https://apis.data.go.kr/B551011/AreaTarResDemService",
};

const DELAY_MS = 350;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

function encodeServiceKey(rawKey) {
  return rawKey.includes("%") ? rawKey : encodeURIComponent(rawKey);
}

function normalizeItemList(item) {
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}

function formatYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function formatBaseYm(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}${m}`;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dataLabRequest(serviceKey, baseUrl, operation, params) {
  const url = new URL(`${baseUrl.replace(/\/$/, "")}/${operation}`);
  url.searchParams.set("serviceKey", encodeServiceKey(serviceKey));
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "ODREGangwon");
  url.searchParams.set("_type", "json");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  const res = await fetch(url);
  if (!res.ok) throw new Error(`${operation} HTTP ${res.status}`);
  const data = await res.json();
  const code = data?.response?.header?.resultCode ?? "";
  if (code !== "00" && code !== "0000" && code !== "03") {
    throw new Error(`${operation} ${data?.response?.header?.resultMsg ?? code}`);
  }
  return normalizeItemList(data?.response?.body?.items?.item);
}

async function fetchSigunguBundle(serviceKey, sigunguCode, { startYmd, endYmd, baseYm }) {
  const common = { areaCd: AREA_CODE, signguCd: sigunguCode, baseYm };

  const visitorsAll = await dataLabRequest(
    serviceKey,
    SERVICES.dataLab,
    "locgoRegnVisitrDDList",
    { startYmd, endYmd, pageNo: 1, numOfRows: 200 },
  );
  await sleep(DELAY_MS);

  const concentration = await dataLabRequest(
    serviceKey,
    SERVICES.tatsConcentration,
    "tatsCnctrRatedList",
    { areaCd: AREA_CODE, signguCd: sigunguCode, pageNo: 1, numOfRows: 100 },
  );
  await sleep(DELAY_MS);

  const relatedTourists = await dataLabRequest(
    serviceKey,
    SERVICES.tarRelated,
    "areaBasedList1",
    { ...common, pageNo: 1, numOfRows: 200 },
  );
  await sleep(DELAY_MS);

  const demandStay = await dataLabRequest(
    serviceKey,
    SERVICES.areaDemand,
    "areaTarSjrnDsList",
    { ...common, pageNo: 1, numOfRows: 50 },
  );
  await sleep(DELAY_MS);

  const demandConsumption = await dataLabRequest(
    serviceKey,
    SERVICES.areaDemand,
    "areaTarExpDsList",
    { ...common, pageNo: 1, numOfRows: 50 },
  );
  await sleep(DELAY_MS);

  const serviceDemand = await dataLabRequest(
    serviceKey,
    SERVICES.areaResourceDemand,
    "areaTarSvcDemList",
    { ...common, pageNo: 1, numOfRows: 50 },
  );
  await sleep(DELAY_MS);

  const cultureDemand = await dataLabRequest(
    serviceKey,
    SERVICES.areaResourceDemand,
    "areaCulResDemList",
    { ...common, pageNo: 1, numOfRows: 50 },
  );

  const visitors = visitorsAll.filter(
    (row) => String(row.signguCode ?? row.signguCd ?? "") === sigunguCode,
  );

  return {
    visitors: visitors.length > 0 ? visitors : visitorsAll,
    concentration,
    relatedTourists,
    demandStay,
    demandConsumption,
    serviceDemand,
    cultureDemand,
  };
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(root, ".env")),
    ...loadEnvFile(path.join(root, ".env.local")),
  };
  const serviceKey =
    env.DATA_LAB_API_KEY ||
    env.TOUR_API_SERVICE_KEY ||
    env.PUBLIC_DATA_PORTAL_SERVICE_KEY;

  if (!serviceKey) {
    console.error("Missing TOUR_API_SERVICE_KEY or PUBLIC_DATA_PORTAL_SERVICE_KEY");
    process.exit(1);
  }

  const endDate = new Date();
  const startDate = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
  const startYmd = formatYmd(startDate);
  const endYmd = formatYmd(endDate);
  const baseYm = formatBaseYm(endDate);

  console.log(`Fetching Gangwon DataLab snapshot (${SIGUNGU_CODES.length} sigungu)...`);
  console.log(`  visitors: ${startYmd} ~ ${endYmd}, demand/related: ${baseYm}`);

  const sigungu = {};
  let failures = 0;

  for (const code of SIGUNGU_CODES) {
    try {
      console.log(`  sigungu ${code}...`);
      sigungu[code] = await fetchSigunguBundle(serviceKey, code, {
        startYmd,
        endYmd,
        baseYm,
      });
      await sleep(DELAY_MS);
    } catch (error) {
      failures += 1;
      console.warn(`  sigungu ${code} failed:`, error instanceof Error ? error.message : error);
      sigungu[code] = {
        visitors: [],
        concentration: [],
        relatedTourists: [],
        demandStay: [],
        demandConsumption: [],
        serviceDemand: [],
        cultureDemand: [],
      };
    }
  }

  const snapshot = {
    fetchedAt: new Date().toISOString(),
    areaCode: AREA_CODE,
    baseYm,
    visitorWindow: { startYmd, endYmd },
    sigungu,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf-8");
  console.log(`Wrote ${outPath} (${failures} sigungu failures)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
