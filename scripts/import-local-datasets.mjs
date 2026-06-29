/**
 * 강원 음식점 CSV · 소상공인 상권 ZIP → 권역 태깅 JSON (전 시·군 + MVP 호환)
 * 실행: npm run import:data
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "src/data/imported");

const restaurantCsv =
  process.env.GANGWON_RESTAURANT_CSV ??
  path.join(process.env.HOME ?? "", "Downloads/강원특별자치도_일반음식점 현황_20251217.csv");
const sbizZip =
  process.env.SBIZ_ZIP_PATH ??
  path.join(process.env.HOME ?? "", "Downloads/소상공인시장진흥공단_상가(상권)정보_20260331.zip");

const CITY_TO_ZONE = {
  강릉시: "gangneung-yangyang",
  양양군: "gangneung-yangyang",
  속초시: "sokcho-goseong",
  고성군: "sokcho-goseong",
  삼척시: "samcheok-donghae",
  동해시: "samcheok-donghae",
  태백시: "yeongwol-jeongseon",
  영월군: "yeongwol-jeongseon",
  정선군: "yeongwol-jeongseon",
  평창군: "pyeongchang-jeongseon",
  횡성군: "pyeongchang-jeongseon",
  철원군: "cheorwon-dmz",
  화천군: "cheorwon-dmz",
  양구군: "cheorwon-dmz",
  인제군: "cheorwon-dmz",
  원주시: "wonju-chuncheon",
  춘천시: "wonju-chuncheon",
  홍천군: "wonju-chuncheon",
};

const GANGWON_CITIES = Object.keys(CITY_TO_ZONE);
const MVP_CITIES = ["삼척시", "동해시"];

function slugId(prefix, name, address) {
  const base = `${name}-${address}`.replace(/\s+/g, "-").slice(0, 80);
  return `${prefix}-${Buffer.from(base).toString("base64url").slice(0, 16)}`;
}

async function importRestaurants() {
  const pyScript = path.join(__dirname, "import_restaurants.py");
  const stdout = execSync(`python3 "${pyScript}" "${restaurantCsv}"`, {
    encoding: "utf-8",
    maxBuffer: 80 * 1024 * 1024,
  });
  const items = JSON.parse(stdout.trim());

  fs.mkdirSync(outDir, { recursive: true });
  const gangwonPath = path.join(outDir, "gangwon-restaurants-gangwon.json");
  fs.writeFileSync(
    gangwonPath,
    JSON.stringify({ updatedAt: new Date().toISOString(), count: items.length, items }, null, 0),
  );
  console.log(`restaurants (gangwon): ${items.length} → ${gangwonPath}`);

  const mvpItems = items.filter((row) => MVP_CITIES.includes(row.city));
  const mvpPath = path.join(outDir, "gangwon-restaurants-samcheok-donghae.json");
  fs.writeFileSync(
    mvpPath,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), count: mvpItems.length, items: mvpItems },
      null,
      0,
    ),
  );
  console.log(`restaurants (mvp): ${mvpItems.length} → ${mvpPath}`);
}

async function importSbiz() {
  const tmpDir = path.join(root, ".tmp-sbiz-import");
  fs.mkdirSync(tmpDir, { recursive: true });
  execSync(`unzip -o -q "${sbizZip}" -d "${tmpDir}"`);
  const gangwonFile = fs
    .readdirSync(tmpDir)
    .find((name) => name.includes("강원") && name.endsWith(".csv"));
  if (!gangwonFile) {
    throw new Error("강원 CSV not found in zip");
  }

  const items = [];
  const rl = createInterface({
    input: createReadStream(path.join(tmpDir, gangwonFile), { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let header = null;
  let col = {};
  for await (const line of rl) {
    if (!header) {
      header = parseCsvLine(line);
      col = Object.fromEntries(header.map((h, i) => [h, i]));
      continue;
    }
    const row = parseCsvLine(line);
    const city = row[col["시군구명"]] ?? "";
    if (!GANGWON_CITIES.includes(city)) continue;
    const categoryLarge = row[col["상권업종대분류명"]] ?? "";
    if (categoryLarge !== "음식" && categoryLarge !== "숙박") continue;

    const lng = Number(row[col["경도"]]);
    const lat = Number(row[col["위도"]]);
    items.push({
      id: row[col["상가업소번호"]] ?? slugId("sbiz", row[col["상호명"]], city),
      name: row[col["상호명"]] ?? "",
      branch: row[col["지점명"]] ?? "",
      categoryLarge,
      categoryMid: row[col["상권업종중분류명"]] ?? "",
      categorySmall: row[col["상권업종소분류명"]] ?? "",
      address: row[col["도로명주소"]] || row[col["지번주소"]] || "",
      city,
      travelZone: CITY_TO_ZONE[city],
      coordinates:
        Number.isFinite(lng) && Number.isFinite(lat) ? { lng, lat } : undefined,
      source: "sbiz-stroll",
    });
  }

  fs.rmSync(tmpDir, { recursive: true, force: true });

  const gangwonPath = path.join(outDir, "sbiz-commerce-gangwon.json");
  fs.writeFileSync(
    gangwonPath,
    JSON.stringify({ updatedAt: new Date().toISOString(), count: items.length, items }, null, 0),
  );
  console.log(`sbiz (gangwon): ${items.length} → ${gangwonPath}`);

  const mvpItems = items.filter((row) => MVP_CITIES.includes(row.city));
  const mvpPath = path.join(outDir, "sbiz-commerce-samcheok-donghae.json");
  fs.writeFileSync(
    mvpPath,
    JSON.stringify(
      { updatedAt: new Date().toISOString(), count: mvpItems.length, items: mvpItems },
      null,
      0,
    ),
  );
  console.log(`sbiz (mvp): ${mvpItems.length} → ${mvpPath}`);
}

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  result.push(current);
  return result;
}

async function main() {
  if (!fs.existsSync(restaurantCsv)) {
    console.error("Missing restaurant CSV:", restaurantCsv);
    process.exit(1);
  }
  if (!fs.existsSync(sbizZip)) {
    console.error("Missing sbiz zip:", sbizZip);
    process.exit(1);
  }
  await importRestaurants();
  await importSbiz();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
