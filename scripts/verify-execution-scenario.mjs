/**
 * 실행 엔진 데모 시나리오 사전 검증 (오프라인)
 * 실행: npm run verify:execution
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const checks = [];

function pass(label) {
  checks.push({ label, ok: true });
  console.log(`✓ ${label}`);
}

function fail(label, detail) {
  checks.push({ label, ok: false, detail });
  console.error(`✗ ${label}${detail ? ` — ${detail}` : ""}`);
}

const requiredFiles = [
  "src/lib/executionKernel/buildItinerary.ts",
  "src/services/executionStateService.ts",
  "src/services/engines/durationMatrixCache.ts",
  "src/lib/itineraryLegMinutes.ts",
  "src/data/imported/datalab-gangwon.json",
];

for (const rel of requiredFiles) {
  const full = path.join(root, rel);
  if (fs.existsSync(full)) {
    pass(`file ${rel}`);
  } else {
    fail(`file ${rel}`, "missing");
  }
}

const datalabPath = path.join(root, "src/data/imported/datalab-gangwon.json");
if (fs.existsSync(datalabPath)) {
  try {
    const raw = JSON.parse(fs.readFileSync(datalabPath, "utf8"));
    const count = raw?.sigungu ? Object.keys(raw.sigungu).length : 0;
    if (count >= 10) {
      pass(`datalab sigungu bundles (${count})`);
    } else if (count > 0) {
      pass(`datalab sigungu bundles (${count}, run refresh:datalab-gangwon for full set)`);
    } else {
      pass("datalab snapshot placeholder (npm run refresh:datalab-gangwon)");
    }
  } catch (error) {
    fail("datalab JSON parse", error instanceof Error ? error.message : String(error));
  }
}

const failed = checks.filter((item) => !item.ok);
if (failed.length > 0) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}

console.log(`\n✓ verify:execution — ${checks.length} checks passed`);
