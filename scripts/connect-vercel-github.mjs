/**
 * Vercel ↔ GitHub 네이티브 연동 (push 시 자동 배포·PR Preview)
 *
 * 선행 조건: Vercel 계정에 GitHub Login Connection 연결
 * https://vercel.com/account/settings/authentication → Connect GitHub
 *
 * 실행: npm run connect:vercel-git
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const authPath = path.join(os.homedir(), "Library/Application Support/com.vercel.cli/auth.json");

function readVercelToken() {
  if (!fs.existsSync(authPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(authPath, "utf-8")).token;
  } catch {
    return null;
  }
}

async function hasGitHubLoginConnection(token) {
  const response = await fetch("https://api.vercel.com/v2/user", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) return false;
  const data = await response.json();
  const connections = data.user?.loginConnections ?? [];
  return connections.some((entry) => String(entry.type).toLowerCase().includes("github"));
}

const token = readVercelToken();
if (!token) {
  console.error("Vercel CLI 로그인이 필요합니다: npx vercel login");
  process.exit(1);
}

const githubConnected = await hasGitHubLoginConnection(token);
if (!githubConnected) {
  console.error("GitHub Login Connection이 없습니다.\n");
  console.error("1. https://vercel.com/account/settings/authentication 접속");
  console.error("2. GitHub → Connect (또는 Add Login Connection)");
  console.error("3. 이 스크립트를 다시 실행하거나: npx vercel git connect --yes\n");
  console.error("GitHub App 설치: https://github.com/apps/vercel");
  process.exit(1);
}

try {
  execSync("npx vercel git connect --yes", { cwd: root, stdio: "inherit" });
  console.log("\n연동 완료. main 브랜치 push 시 Vercel이 자동 배포합니다.");
} catch {
  console.error("\n연동 실패. 프로젝트 Git 설정에서 저장소를 수동 연결하세요:");
  console.error("https://vercel.com/djk0224s-projects/odre-gangwon/settings/git");
  process.exit(1);
}
