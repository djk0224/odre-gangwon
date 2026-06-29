/**
 * 오드레 노트 — 네이버 뉴스 sourceLine·원문 URL·히어로 이미지 갱신
 * 실행: npm run refresh:notes
 *
 * 관련성·정치/사건 필터 적용. 날짜 하한은 ODRE_NOTE_NEWS_SINCE env 있을 때만.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  downloadHeroImageToFile,
  resolveArticleHeroImageUrl,
  toPublicImagePath,
} from "../src/lib/newsArticleImage";
import {
  ODRE_NOTE_NEWS_PROFILES,
  pickBestOdreNoteNewsItem,
} from "../src/lib/odreNoteNewsProfileRegistry";
import { resolveOdreNoteEventPeriod } from "../src/lib/odreNoteEventPeriod";
import { ODRE_NOTE_SEEDS, ODRE_NOTE_SEED_COUNT } from "../src/data/odreNotes";
import {
  dedupeNaverNewsItems,
  filterNaverNewsSince,
  formatNaverNewsSourceLine,
  parseNaverNewsPubDate,
  searchNaverNews,
  type NaverNewsItem,
} from "../src/services/external/naverNewsService";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outPath = path.join(root, "src/data/imported/odre-notes.json");
const heroDir = path.join(root, "public/images/odre-notes");

function loadEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};
  const env: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

function applyEnv() {
  const merged = {
    ...loadEnvFile(path.join(root, ".env")),
    ...loadEnvFile(path.join(root, ".env.local")),
  };
  for (const [key, value] of Object.entries(merged)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

function resolveScrapeSince(): string | undefined {
  const fromEnv = process.env.ODRE_NOTE_NEWS_SINCE?.trim();
  if (!fromEnv || fromEnv === "0" || fromEnv.toLowerCase() === "off") return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(fromEnv)) return fromEnv;
  return undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchNewsForProfile(
  profile: (typeof ODRE_NOTE_NEWS_PROFILES)[string],
  sinceIso?: string,
): Promise<NaverNewsItem[]> {
  const batches: NaverNewsItem[] = [];

  for (const query of profile.queries) {
    for (const start of [1, 11, 21, 31]) {
      const items = await searchNaverNews(query, { display: 10, start, sort: "sim" });
      batches.push(...items);
      await sleep(200);
    }
    await sleep(250);
  }

  const deduped = dedupeNaverNewsItems(batches);
  return sinceIso ? filterNaverNewsSince(deduped, sinceIso) : deduped;
}

async function main() {
  applyEnv();
  const scrapeSince = resolveScrapeSince();
  console.log(
    scrapeSince
      ? `[refresh:notes] scrape since ${scrapeSince} (inclusive)`
      : "[refresh:notes] no date floor — all eligible articles",
  );

  const configured = Boolean(
    process.env.NAVER_NEWS_CLIENT_ID?.trim() && process.env.NAVER_NEWS_CLIENT_SECRET?.trim(),
  );

  const overlays: Array<{
    id: string;
    sourceLine: string;
    imageUrl?: string;
    eventPeriod?: { startDate: string; endDate?: string; monthOnly?: boolean };
    source: { kind: "naver-news"; url: string; pubDate?: string };
  }> = [];

  if (configured) {
    fs.mkdirSync(heroDir, { recursive: true });

    for (const [seedId, profile] of Object.entries(ODRE_NOTE_NEWS_PROFILES)) {
      try {
        const items = await fetchNewsForProfile(profile, scrapeSince);
        const picked = pickBestOdreNoteNewsItem(items, profile, seedId);

        if (!picked) {
          console.warn(
            `[refresh:notes] ${seedId} — no relevant match${scrapeSince ? ` since ${scrapeSince}` : ""} (score < ${profile.minScore ?? 6}), keeping TS seed sourceLine`,
          );
          continue;
        }

        const { item, score } = picked;
        const pubDate = parseNaverNewsPubDate(item.pubDate);
        const articleUrl = item.originallink || item.link;
        const seed = ODRE_NOTE_SEEDS.find((entry) => entry.id === seedId);
        const eventPeriod = resolveOdreNoteEventPeriod(
          seedId,
          item.title,
          item.description,
          pubDate,
          seed?.eventPeriod,
        );
        const overlay: (typeof overlays)[number] = {
          id: seedId,
          sourceLine: formatNaverNewsSourceLine(item),
          source: {
            kind: "naver-news",
            url: articleUrl,
            pubDate,
          },
        };
        if (eventPeriod) {
          overlay.eventPeriod = eventPeriod;
        }

        try {
          const hero = await resolveArticleHeroImageUrl(item.originallink, item.link);

          if (hero) {
            const savedPath = await downloadHeroImageToFile(
              hero.imageUrl,
              path.join(heroDir, seedId),
              { referer: hero.pageUrl },
            );
            if (savedPath) {
              overlay.imageUrl = toPublicImagePath(savedPath, path.join(root, "public"));
              console.log(`[refresh:notes] ${seedId} hero ← ${overlay.imageUrl}`);
            } else {
              console.warn(`[refresh:notes] ${seedId} hero download failed (${hero.imageUrl})`);
            }
          } else {
            console.warn(`[refresh:notes] ${seedId} no og:image found`);
          }
        } catch (imageError) {
          const message = imageError instanceof Error ? imageError.message : String(imageError);
          console.warn(`[refresh:notes] ${seedId} hero extract failed: ${message}`);
        }

        overlays.push(overlay);
        const periodLabel = eventPeriod
          ? `${eventPeriod.startDate}${eventPeriod.endDate ? `~${eventPeriod.endDate}` : ""}`
          : "—";
        console.log(
          `[refresh:notes] ${seedId} score=${score} date=${pubDate ?? "?"} period=${periodLabel} ← ${item.title.slice(0, 52)}…`,
        );
        await sleep(400);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`[refresh:notes] ${seedId} failed: ${message}`);
      }
    }
  } else {
    console.warn("[refresh:notes] NAVER_NEWS_* keys missing — writing empty overlays (TS seeds used)");
  }

  const output = {
    notes: [],
    overlays,
    scrapeSince,
    refreshedAt: new Date().toISOString(),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
  console.log(`[refresh:notes] wrote ${overlays.length}/${ODRE_NOTE_SEED_COUNT} overlays → ${outPath}`);

  const verify = spawnSync("npx", ["--yes", "tsx", "scripts/verify-odre-notes.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (verify.status !== 0) {
    process.exit(verify.status ?? 1);
  }

  const audit = spawnSync("npx", ["--yes", "tsx", "scripts/audit-odre-notes-alignment.ts"], {
    cwd: root,
    stdio: "inherit",
  });
  if (audit.status !== 0) {
    process.exit(audit.status ?? 1);
  }
}

main().catch((error) => {
  console.error("[refresh:notes] fatal:", error);
  process.exit(1);
});
