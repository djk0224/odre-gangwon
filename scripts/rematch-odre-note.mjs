/**
 * 단일 오드레 노트 overlay 재매칭
 * 사용: node scripts/rematch-odre-note.mjs note-dmz-peace-trail
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
for (const f of [".env", ".env.local"]) {
  const p = path.join(root, f);
  if (!fs.existsSync(p)) continue;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    const v = t.slice(i + 1).replace(/^["']|["']$/g, "");
    if (!process.env[k]) process.env[k] = v;
  }
}

const seedId = process.argv[2];
if (!seedId) {
  console.error("Usage: node scripts/rematch-odre-note.mjs <seed-id>");
  process.exit(1);
}

const { ODRE_NOTE_NEWS_PROFILES, pickBestOdreNoteNewsItem } = await import(
  "../src/lib/odreNoteNewsProfileRegistry.ts"
);
const { resolveOdreNoteEventPeriod } = await import("../src/lib/odreNoteEventPeriod.ts");
const { ODRE_NOTE_SEEDS } = await import("../src/data/odreNotes.ts");
const {
  dedupeNaverNewsItems,
  searchNaverNews,
  formatNaverNewsSourceLine,
  parseNaverNewsPubDate,
} = await import("../src/services/external/naverNewsService.ts");

const profile = ODRE_NOTE_NEWS_PROFILES[seedId];
const seed = ODRE_NOTE_SEEDS.find((s) => s.id === seedId);
if (!profile || !seed) {
  console.error(`Unknown seed or profile: ${seedId}`);
  process.exit(1);
}

const batches = [];
for (const q of profile.queries) {
  for (const start of [1, 11, 21, 31]) {
    batches.push(...(await searchNaverNews(q, { display: 10, start, sort: "sim" })));
  }
}
const items = dedupeNaverNewsItems(batches);
const picked = pickBestOdreNoteNewsItem(items, profile, seedId);
console.log(picked?.score ?? "no match", picked?.item.title ?? "");

const file = JSON.parse(fs.readFileSync("src/data/imported/odre-notes.json", "utf8"));
const idx = file.overlays.findIndex((o) => o.id === seedId);
if (!picked) {
  console.error("No news picked");
  process.exit(1);
}

const pubDate = parseNaverNewsPubDate(picked.item.pubDate);
file.overlays[idx] = {
  id: seedId,
  sourceLine: formatNaverNewsSourceLine(picked.item),
  source: {
    kind: "naver-news",
    url: picked.item.originallink || picked.item.link,
    pubDate,
  },
  eventPeriod: resolveOdreNoteEventPeriod(
    seedId,
    picked.item.title,
    picked.item.description,
    pubDate,
    seed.eventPeriod,
  ),
};
fs.writeFileSync("src/data/imported/odre-notes.json", `${JSON.stringify(file, null, 2)}\n`);
console.log("Updated overlay for", seedId);
