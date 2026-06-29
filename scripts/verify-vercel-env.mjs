/**
 * Vercel 배포용 환경 변수 검증 (값은 출력하지 않음)
 * 실행: npm run verify:vercel-env
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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

const env = {
  ...loadEnvFile(path.join(root, ".env")),
  ...loadEnvFile(path.join(root, ".env.local")),
  ...process.env,
};

function has(key) {
  return Boolean(env[key]?.trim());
}

const checks = [
  {
    id: "kakao-map",
    label: "Kakao Map SDK (브라우저 지도)",
    required: true,
    keys: ["NEXT_PUBLIC_KAKAO_MAP_APP_KEY"],
    hint: "Vercel에 설정 후 반드시 Redeploy (NEXT_PUBLIC_* 는 빌드 시 주입)",
  },
  {
    id: "kakao-rest",
    label: "Kakao REST (경로·이동시간)",
    required: true,
    keys: ["KAKAO_REST_API_KEY"],
    hint: "서버 전용. 설정 후 재배포 없이도 런타임 반영",
  },
  {
    id: "public-data",
    label: "공공데이터포털 통합 키",
    required: true,
    keys: ["PUBLIC_DATA_PORTAL_SERVICE_KEY", "TOUR_API_SERVICE_KEY"],
    anyOf: true,
    hint: "디코딩(일반) 키 권장. 이미 URL 인코딩된 키도 코드에서 처리",
  },
  {
    id: "demo-auth",
    label: "내 메뉴 시연 로그인",
    required: true,
    keys: ["DEMO_AUTH_USERNAME", "DEMO_AUTH_PASSWORD"],
    hint: "둘 다 설정해야 로그인 API 활성화",
  },
  {
    id: "llm",
    label: "AI 일정·채팅 (Gemini/OpenAI)",
    required: false,
    keys: ["GEMINI_API_KEY", "OPENAI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    anyOf: true,
    hint: "없으면 규칙 기반 fallback",
  },
  {
    id: "naver-news",
    label: "오드레 노트 뉴스",
    required: false,
    keys: ["NAVER_NEWS_CLIENT_ID", "NAVER_NEWS_CLIENT_SECRET"],
    hint: "둘 다 있어야 활성",
  },
];

let failed = 0;

console.log("ODRÉ GANGWON — Vercel env check\n");

for (const check of checks) {
  const present = check.keys.filter((key) => has(key));
  const ok = check.anyOf ? present.length > 0 : present.length === check.keys.length;
  const status = ok ? "OK" : check.required ? "MISSING" : "optional";
  const icon = ok ? "✓" : check.required ? "✗" : "○";

  console.log(`${icon} ${check.label} [${status}]`);
  if (!ok && check.required) {
    failed += 1;
    console.log(`   keys: ${check.keys.join(check.anyOf ? " | " : " + ")}`);
  }
  console.log(`   ${check.hint}`);
  if (present.length > 0) {
    console.log(`   set: ${present.join(", ")}`);
  }
  console.log("");
}

const dataFiles = [
  "src/data/imported/tour-gw-samcheok-donghae.json",
  "src/data/imported/tour-gw-gangwon.json",
  "src/data/imported/gangwon-restaurants-samcheok-donghae.json",
  "src/data/imported/sbiz-commerce-samcheok-donghae.json",
  "src/data/imported/datalab-gangwon.json",
];

console.log("Bundled data files (git commit 확인):\n");
for (const rel of dataFiles) {
  const exists = fs.existsSync(path.join(root, rel));
  console.log(`${exists ? "✓" : "✗"} ${rel}`);
  if (!exists) failed += 1;
}

console.log("\nKakao Developers → 앱 → 플랫폼 → Web 도메인에 Vercel URL 등록:");
console.log("  https://<project>.vercel.app");
console.log("  (Preview URL도 시연에 쓰면 각각 등록)\n");

if (failed > 0) {
  console.error(`\n${failed} issue(s) — Vercel Dashboard → Settings → Environment Variables 확인`);
  process.exit(1);
}

console.log("Ready for Vercel deploy.");
