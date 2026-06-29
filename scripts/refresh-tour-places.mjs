/**
 * 한국관광공사 KorService2 — 강원 전 시·군 지역기반 관광정보 + 이미지 보강
 * 실행: npm run refresh:tour-places
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src/data/imported/tour-gw-gangwon.json");
const mvpOutPath = path.join(root, "src/data/imported/tour-gw-samcheok-donghae.json");
const zoneHeroPath = path.join(root, "src/data/imported/zone-hero-images.json");
const MVP_SIGUNGU_CODES = new Set(["3", "4"]);

const SIGUNGU_TO_ZONE = {
  "1": "gangneung-yangyang",
  "7": "gangneung-yangyang",
  "2": "sokcho-goseong",
  "5": "sokcho-goseong",
  "3": "samcheok-donghae",
  "4": "samcheok-donghae",
  "8": "yeongwol-jeongseon",
  "11": "pyeongchang-jeongseon",
  "15": "pyeongchang-jeongseon",
  "6": "cheorwon-dmz",
  "10": "cheorwon-dmz",
  "12": "cheorwon-dmz",
  "17": "cheorwon-dmz",
  "9": "wonju-chuncheon",
  "13": "wonju-chuncheon",
  "14": "pyeongchang-jeongseon",
  "16": "wonju-chuncheon",
  "18": "wonju-chuncheon",
};

/** Curated assets in public/images/zones — preserved across GW refresh */
const CUSTOM_ZONE_HEROES = {
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

const ZONE_HINTS = {
  "samcheok-donghae": ["환선굴", "케이블카", "추암", "장호"],
  "gangneung-yangyang": ["경포", "안목", "주문진", "오죽"],
  "sokcho-goseong": ["속초", "아바이", "설악", "고성"],
  "pyeongchang-jeongseon": ["알펜시아", "월정사", "대관령"],
  "yeongwol-jeongseon": ["동강", "래프팅", "레일바이크"],
  "cheorwon-dmz": ["DMZ", "철원", "평화", "두루미"],
  "wonju-chuncheon": ["의암", "춘천", "소양", "막국수"],
};

const PREFERRED_TYPES = new Set(["12", "28", "14"]);

const TOUR_BASE = "https://apis.data.go.kr/B551011/KorService2";
const AREA_CODE = "32";
const SIGUNGU_CODES = [
  "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18",
];
const CONTENT_TYPES = ["12", "14", "15", "28", "38", "39"];
const ROWS = 100;
const MAX_PAGES = 5;
const IMAGE_CONCURRENCY = 1;
const IMAGE_REQUEST_DELAY_MS = 600;
const TOUR_REQUEST_MAX_RETRIES = 4;
const TOUR_REQUEST_RETRY_BASE_MS = 3000;
const RATE_LIMIT_COOLDOWN_MS = 90_000;
const BACKFILL_WARMUP_MS = 120_000;

let rateLimitUntil = 0;

async function waitForRateLimitCooldown() {
  const now = Date.now();
  if (now < rateLimitUntil) {
    const waitMs = rateLimitUntil - now;
    console.warn(`API rate limit cooldown — waiting ${Math.ceil(waitMs / 1000)}s`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

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

function hasListImage(item) {
  const raw = item.firstimage || item.firstimage2 || item.resolvedImage;
  return Boolean(raw && String(raw).trim());
}

function toHttps(url) {
  if (!url) return undefined;
  const value = String(url).trim();
  if (!value) return undefined;
  return value.startsWith("http://") ? value.replace("http://", "https://") : value;
}

async function tourRequest(serviceKey, operation, params) {
  const url = new URL(`${TOUR_BASE}/${operation}`);
  url.searchParams.set("serviceKey", encodeServiceKey(serviceKey));
  url.searchParams.set("MobileOS", "ETC");
  url.searchParams.set("MobileApp", "ODRE_GANGWON");
  url.searchParams.set("_type", "json");
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") url.searchParams.set(key, String(value));
  });

  for (let attempt = 0; attempt <= TOUR_REQUEST_MAX_RETRIES; attempt += 1) {
    await waitForRateLimitCooldown();
    const res = await fetch(url);
    if (res.status === 429) {
      rateLimitUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      if (attempt >= TOUR_REQUEST_MAX_RETRIES) {
        throw new Error(`${operation} HTTP 429`);
      }
      const waitMs = TOUR_REQUEST_RETRY_BASE_MS * 2 ** attempt;
      console.warn(`${operation} HTTP 429 — retry in ${waitMs}ms (${attempt + 1}/${TOUR_REQUEST_MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      continue;
    }
    if (!res.ok) throw new Error(`${operation} HTTP ${res.status}`);
    const data = await res.json();
    const code = data?.response?.header?.resultCode ?? data?.resultCode ?? "";
    const msg = data?.response?.header?.resultMsg ?? data?.resultMsg ?? code;
    if (code !== "0000" && code !== "03") {
      throw new Error(`${operation} ${msg}`);
    }
    return data?.response?.body;
  }
  throw new Error(`${operation} exhausted retries`);
}

async function fetchAreaPages(serviceKey, sigunguCode, contentTypeId) {
  const collected = [];
  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await tourRequest(serviceKey, "areaBasedList2", {
      arrange: "Q",
      areaCode: AREA_CODE,
      sigunguCode,
      contentTypeId,
      numOfRows: ROWS,
      pageNo: page,
    });
    const batch = normalizeItemList(body?.items?.item);
    collected.push(...batch);
    const total = Number(body?.totalCount ?? 0);
    if (batch.length < ROWS) break;
    if (total > 0 && collected.length >= total) break;
  }
  return collected;
}

async function fetchDetailImage(serviceKey, contentId) {
  const body = await tourRequest(serviceKey, "detailImage2", {
    contentId,
    imageYN: "Y",
  });
  const images = normalizeItemList(body?.items?.item);
  for (const image of images) {
    const url = toHttps(image.originimgurl || image.smallimageurl);
    if (url) return url;
  }
  return undefined;
}

async function fetchDetailCommonImage(serviceKey, contentId) {
  const body = await tourRequest(serviceKey, "detailCommon2", {
    contentId,
  });
  const item = normalizeItemList(body?.items?.item)[0];
  if (!item) return undefined;
  return toHttps(item.firstimage || item.firstimage2);
}

async function resolveMissingImages(serviceKey, items) {
  const missing = items.filter((item) => !hasListImage(item));
  console.log(`image backfill targets: ${missing.length} / ${items.length}`);

  let resolved = 0;

  for (let index = 0; index < missing.length; index += 1) {
    const item = missing[index];
    try {
      let url = await fetchDetailImage(serviceKey, item.contentid);
      if (!url) {
        url = await fetchDetailCommonImage(serviceKey, item.contentid);
      }
      if (url) {
        item.resolvedImage = url;
        resolved += 1;
      }
    } catch (error) {
      console.warn(`image skip ${item.contentid}: ${error.message}`);
    }
    if (IMAGE_REQUEST_DELAY_MS > 0) {
      await new Promise((resolve) => setTimeout(resolve, IMAGE_REQUEST_DELAY_MS));
    }
    if ((index + 1) % 25 === 0 || index + 1 === missing.length) {
      console.log(`  images ${index + 1}/${missing.length} (resolved ${resolved})`);
    }
  }

  return resolved;
}

function getItemImage(item) {
  return toHttps(item.firstimage || item.firstimage2 || item.resolvedImage);
}

function pickZoneHero(zoneId, items) {
  const zoneItems = items.filter(
    (item) => SIGUNGU_TO_ZONE[item.sigungucode] === zoneId && getItemImage(item),
  );
  if (zoneItems.length === 0) return null;

  const hints = ZONE_HINTS[zoneId] ?? [];
  for (const hint of hints) {
    const match = zoneItems.find((item) => item.title.includes(hint));
    const imageUrl = match ? getItemImage(match) : undefined;
    if (match && imageUrl) {
      return { imageUrl, placeName: match.title, contentid: match.contentid };
    }
  }

  const scenic = zoneItems.find((item) => PREFERRED_TYPES.has(item.contenttypeid));
  const picked = scenic ?? zoneItems[0];
  const imageUrl = getItemImage(picked);
  if (!imageUrl) return null;
  return { imageUrl, placeName: picked.title, contentid: picked.contentid };
}

function buildZoneHeroes(items) {
  const heroes = {};
  for (const zoneId of new Set(Object.values(SIGUNGU_TO_ZONE))) {
    heroes[zoneId] = pickZoneHero(zoneId, items);
  }
  return heroes;
}

function writeCatalogOutputs(items, resolvedCount) {
  const withImage = items.filter((item) => hasListImage(item)).length;

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const payload = {
    updatedAt: new Date().toISOString(),
    areaCode: AREA_CODE,
    sigunguCodes: SIGUNGU_CODES,
    contentTypeIds: CONTENT_TYPES,
    count: items.length,
    imageCoverage: {
      total: items.length,
      withImage,
      backfilled: resolvedCount,
    },
    items,
  };
  fs.writeFileSync(outPath, JSON.stringify(payload));

  const mvpItems = items.filter((item) => MVP_SIGUNGU_CODES.has(String(item.sigungucode ?? "")));
  const mvpWithImage = mvpItems.filter((item) => hasListImage(item)).length;
  fs.writeFileSync(
    mvpOutPath,
    JSON.stringify({
      updatedAt: payload.updatedAt,
      areaCode: AREA_CODE,
      sigunguCodes: [...MVP_SIGUNGU_CODES],
      contentTypeIds: CONTENT_TYPES,
      count: mvpItems.length,
      imageCoverage: {
        total: mvpItems.length,
        withImage: mvpWithImage,
        backfilled: mvpItems.filter((item) => item.resolvedImage).length,
      },
      items: mvpItems,
    }),
  );

  const zoneHeroes = buildZoneHeroes(items);
  for (const [zoneId, hero] of Object.entries(CUSTOM_ZONE_HEROES)) {
    zoneHeroes[zoneId] = hero;
  }
  fs.writeFileSync(
    zoneHeroPath,
    JSON.stringify({
      updatedAt: new Date().toISOString(),
      heroes: zoneHeroes,
    }),
  );

  const heroCount = Object.values(zoneHeroes).filter(Boolean).length;
  console.log(
    `saved ${items.length} places → ${outPath} (images ${withImage}/${items.length})`,
  );
  console.log(
    `saved ${mvpItems.length} MVP places → ${mvpOutPath} (images ${mvpWithImage}/${mvpItems.length})`,
  );
  console.log(`saved zone heroes ${heroCount}/7 → ${zoneHeroPath}`);
}

async function warmupBeforeImageBackfill() {
  console.log(`warming up ${Math.ceil(BACKFILL_WARMUP_MS / 1000)}s before image backfill (API rate limit)`);
  await new Promise((resolve) => setTimeout(resolve, BACKFILL_WARMUP_MS));
}

async function main() {
  const imagesOnly = process.argv.includes("--images-only");
  const env = {
    ...loadEnvFile(path.join(root, ".env")),
    ...loadEnvFile(path.join(root, ".env.local")),
  };
  const serviceKey =
    env.TOUR_API_SERVICE_KEY || env.PUBLIC_DATA_PORTAL_SERVICE_KEY || "";
  if (!serviceKey) {
    console.error("TOUR_API_SERVICE_KEY or PUBLIC_DATA_PORTAL_SERVICE_KEY required");
    process.exit(1);
  }

  if (imagesOnly) {
    if (!fs.existsSync(outPath)) {
      console.error(`Missing catalog: ${outPath}`);
      process.exit(1);
    }
    const existing = JSON.parse(fs.readFileSync(outPath, "utf-8"));
    const items = existing.items ?? [];
    console.log(`images-only backfill on ${items.length} existing places`);
    await warmupBeforeImageBackfill();
    const resolvedCount = await resolveMissingImages(serviceKey, items);
    writeCatalogOutputs(items, resolvedCount);
    return;
  }

  const seen = new Set();
  const items = [];

  for (const sigunguCode of SIGUNGU_CODES) {
    for (const contentTypeId of CONTENT_TYPES) {
      const batch = await fetchAreaPages(serviceKey, sigunguCode, contentTypeId);
      let added = 0;
      for (const item of batch) {
        if (!item?.contentid || seen.has(item.contentid)) continue;
        if (!item.title?.trim()) continue;
        seen.add(item.contentid);
        items.push(item);
        added += 1;
      }
      console.log(`sigungu ${sigunguCode} type ${contentTypeId}: +${added} (batch ${batch.length})`);
    }
  }

  await warmupBeforeImageBackfill();
  const resolvedCount = await resolveMissingImages(serviceKey, items);
  writeCatalogOutputs(items, resolvedCount);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
