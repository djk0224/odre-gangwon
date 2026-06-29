/**
 * Tour GW · DataLab · 로컬 상권/음식점 스냅샷 일괄 갱신
 * 실행: npm run refresh:live-data
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const steps = [
  { name: "import:data", command: "npm", args: ["run", "import:data"] },
  { name: "refresh:tour-places", command: "npm", args: ["run", "refresh:tour-places"] },
  { name: "refresh:datalab-gangwon", command: "npm", args: ["run", "refresh:datalab-gangwon"] },
];

function runStep(step) {
  console.log(`\n▶ ${step.name}`);
  const result = spawnSync(step.command, step.args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(`${step.name} failed with exit code ${result.status ?? "unknown"}`);
  }
}

console.log("ODRÉ GANGWON — live data refresh pipeline");
for (const step of steps) {
  runStep(step);
}
console.log("\n✓ refresh:live-data complete");
