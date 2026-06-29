/**
 * Vercel ↔ GitHub 네이티브 연동 (push 시 자동 배포·PR Preview)
 *
 * 선행 조건: Vercel 계정에 GitHub 연결 + Vercel GitHub App 설치
 * https://vercel.com/account/settings/authentication
 * https://github.com/apps/vercel
 *
 * 실행: npm run connect:vercel-git
 */
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

try {
  execSync("npx vercel git connect --yes", { cwd: root, stdio: "inherit" });
  console.log("\n연동 완료. main 브랜치 push 시 Vercel이 자동 배포합니다.");
} catch {
  console.error("\n연동 실패. 아래를 확인하세요:");
  console.error("1. https://vercel.com/account/settings/authentication → GitHub Connect");
  console.error("2. https://github.com/apps/vercel → odre-gangwon 저장소 접근");
  console.error("3. https://vercel.com/djk0224s-projects/odre-gangwon/settings/git");
  process.exit(1);
}
