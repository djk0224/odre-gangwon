/**
 * 공식 강원 네이처로드 coarse 페이지에서 코스 JSON·경로 갱신
 * 실행: npm run refresh:nature-road
 *       node scripts/refresh-nature-road.mjs [1] [2] ... (생략 시 1–7 전체)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "../src/data/imported");
const base = "https://natureroad.gangwon.kr";

const ALL_COURSE_IDS = [1, 2, 3, 4, 5, 6, 7];

function isGangwonCoord(lat, lng) {
  return lat >= 37 && lat <= 39.2 && lng >= 127 && lng <= 131;
}

function decodeRtPair(a, b) {
  const attempts = [
    { lat: a / 26328, lng: b / 8525 },
    { lat: b / 26328, lng: a / 8525 },
    { lat: b / 31000, lng: a / 5020 },
    { lat: a / 31000, lng: b / 5020 },
    { lat: a / 19600, lng: b / 9600 },
    { lat: b / 19600, lng: a / 9600 },
    { lat: a / 22800, lng: b / 10120 },
    { lat: b / 22800, lng: a / 10120 },
    { lat: a / 20000, lng: b / 10000 },
    { lat: b / 20000, lng: a / 10000 },
  ];
  for (const point of attempts) {
    if (isGangwonCoord(point.lat, point.lng)) return point;
  }
  return null;
}

function parseKakaoNavLinkPath(navLink) {
  if (!navLink) return [];
  try {
    const url = new URL(navLink);
    const rt = url.searchParams.get("rt");
    if (!rt) return [];
    const nums = rt.split(",").map((part) => Number(part.trim()));
    const path = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const point = decodeRtPair(nums[i], nums[i + 1]);
      if (point) path.push(point);
    }
    return path;
  } catch {
    return [];
  }
}

function extractNavWaypointNames(navLink) {
  if (!navLink) return [];
  try {
    const url = new URL(navLink);
    const names = [];
    for (const [key, value] of url.searchParams.entries()) {
      if (/^rt\d+$/i.test(key) && value.trim()) {
        names.push(decodeURIComponent(value.trim()));
      }
    }
    return names;
  } catch {
    return [];
  }
}

async function fetchCourse(id) {
  const res = await fetch(`${base}/coarse/${id}`, {
    headers: { "User-Agent": "ODRE-GANGWON/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for course ${id}`);
  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
  if (!match) throw new Error(`No __NEXT_DATA__ for course ${id}`);
  const data = JSON.parse(match[1]);
  return data.props.pageProps;
}

const ids = process.argv.slice(2).map(Number).filter(Boolean);
const targets = ids.length ? ids : ALL_COURSE_IDS;

const index = {
  updatedAt: new Date().toISOString(),
  source: base,
  courses: [],
};

for (const id of targets) {
  const pp = await fetchCourse(id);
  const coursePath = path.join(outDir, `nature-road-course-${id}.json`);
  fs.writeFileSync(coursePath, JSON.stringify(pp, null, 0));

  const navPath = parseKakaoNavLinkPath(pp.nav_link);
  const navNames = extractNavWaypointNames(pp.nav_link);
  const pathPayload = {
    courseId: id,
    label: `${pp.name} ${pp.road_name}`,
    navName: pp.nav_name ?? null,
    waypoints: navNames.map((name, i) => ({
      name,
      ...(navPath[i] ? { lat: navPath[i].lat, lng: navPath[i].lng } : {}),
    })),
    path: navPath,
  };
  const pathOut = path.join(outDir, `nature-road-path-${id}.json`);
  fs.writeFileSync(pathOut, JSON.stringify(pathPayload, null, 2));

  index.courses.push({
    id,
    name: pp.name,
    roadName: pp.road_name,
    distanceKm: Number(pp.km) || 0,
    viewPointCount: (pp.viewPoint ?? []).length,
    guideCoarseCount: (pp.guideCoarse ?? []).length,
    pathPointCount: navPath.length,
    officialUrl: `${base}/coarse/${id}`,
  });

  console.log(
    `updated course ${id} (${pp.road_name}) — ${(pp.viewPoint ?? []).length} spots, ${navPath.length} path pts`,
  );
}

const indexPath = path.join(outDir, "nature-road-index.json");
fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
console.log(`wrote ${indexPath} (${index.courses.length} courses)`);
