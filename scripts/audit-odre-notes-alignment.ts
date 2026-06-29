/**
 * 오드레 노트 — 시드 본문 vs overlay 뉴스 정합성 감사
 * 실행: npm run audit:notes
 */
import fs from "node:fs";
import path from "node:path";
import { ODRE_NOTE_SEEDS, getOdreNotes, type OdreNote } from "../src/data/odreNotes";
import {
  assessOdreNoteNewsAlignment,
  getOdreNoteCouplingMode,
  meetsMinAlignment,
  scoreOdreNoteBodyAlignment,
  type OdreNoteAlignmentTier,
} from "../src/lib/odreNoteAlignment";
import {
  ODRE_NOTE_NEWS_PROFILES,
  scoreOdreNoteNewsItem,
} from "../src/lib/odreNoteNewsProfileRegistry";
import {
  dedupeNaverNewsItems,
  searchNaverNews,
  type NaverNewsItem,
} from "../src/services/external/naverNewsService";
import odreNotesImported from "../src/data/imported/odre-notes.json";

interface NoteAuditRow {
  id: string;
  title: string;
  tier: OdreNoteAlignmentTier;
  score: number;
  issues: string[];
  newsTitle: string;
  newsDescription: string;
  overlaySourceLine: string;
  newsUrl?: string;
  topAlternatives: Array<{ title: string; score: number }>;
}

function loadEnv() {
  for (const file of [".env", ".env.local"]) {
    const full = path.join(process.cwd(), file);
    if (!fs.existsSync(full)) continue;
    for (const line of fs.readFileSync(full, "utf-8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx < 0) continue;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assessNote(note: OdreNote, news: { title: string; description: string }) {
  const bodyText = [note.lead, ...note.body, ...Object.values(note.travelMemo)].join(" ");
  const result = assessOdreNoteNewsAlignment(note.id, bodyText, news);
  const mode = getOdreNoteCouplingMode(note.tone);
  const issues = [...result.issues];

  if (!meetsMinAlignment(result.tier, mode)) {
    issues.push(`tone ${note.tone}(${mode}) 최소 정합 기준 미달`);
  }

  if (note.source?.pubDate) {
    const ageDays = (Date.now() - new Date(note.source.pubDate).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > 365) issues.push(`뉴스가 1년 이상 오래됨 (${note.source.pubDate})`);
  }

  return { tier: result.tier, score: result.score, issues };
}

async function fetchCandidates(seedId: string): Promise<NaverNewsItem[]> {
  const profile = ODRE_NOTE_NEWS_PROFILES[seedId];
  if (!profile) return [];

  const batches: NaverNewsItem[] = [];
  for (const query of profile.queries) {
    for (const start of [1, 11, 21]) {
      batches.push(...(await searchNaverNews(query, { display: 10, start, sort: "sim" })));
      await sleep(150);
    }
  }
  return dedupeNaverNewsItems(batches);
}

async function main() {
  loadEnv();
  const configured = Boolean(
    process.env.NAVER_NEWS_CLIENT_ID?.trim() && process.env.NAVER_NEWS_CLIENT_SECRET?.trim(),
  );

  const merged = getOdreNotes();
  const rows: NoteAuditRow[] = [];

  for (const seed of ODRE_NOTE_SEEDS) {
    const note = merged.find((n) => n.id === seed.id) ?? seed;
    const overlay = (odreNotesImported.overlays ?? []).find((o) => o.id === seed.id);
    if (!overlay) continue;

    let newsTitle = note.sourceLine;
    let newsDescription = "";
    let topAlternatives: Array<{ title: string; score: number }> = [];

    if (configured) {
      const candidates = await fetchCandidates(seed.id);
      const profile = ODRE_NOTE_NEWS_PROFILES[seed.id];
      const scored = candidates
        .map((item) => ({
          item,
          score: scoreOdreNoteNewsItem(item, profile) + scoreOdreNoteBodyAlignment(seed.id, item),
        }))
        .filter((entry) => entry.score >= 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      topAlternatives = scored.map((entry) => ({
        title: entry.item.title,
        score: entry.score,
      }));

      const currentUrl = overlay?.source?.url;
      const currentItem = currentUrl
        ? candidates.find((c) => c.originallink === currentUrl || c.link === currentUrl)
        : undefined;

      if (currentItem) {
        newsTitle = currentItem.title;
        newsDescription = currentItem.description;
      } else if (scored[0]) {
        newsTitle = scored[0].item.title;
        newsDescription = scored[0].item.description;
      }
    }

    const { tier, score, issues } = assessNote(note, {
      title: newsTitle,
      description: newsDescription,
    });

    rows.push({
      id: seed.id,
      title: seed.title,
      tier,
      score,
      issues,
      newsTitle,
      newsDescription: newsDescription.slice(0, 120),
      overlaySourceLine: note.sourceLine,
      newsUrl: overlay?.source?.url,
      topAlternatives,
    });
  }

  const tierOrder: OdreNoteAlignmentTier[] = ["mismatch", "weak", "partial", "strong"];
  rows.sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  console.log("\n=== ODRÉ Note · 시드 ↔ 뉴스 정합성 감사 ===\n");

  for (const row of rows) {
    const emoji =
      row.tier === "strong" ? "✓" : row.tier === "partial" ? "~" : row.tier === "weak" ? "!" : "✗";
    console.log(`${emoji} [${row.tier.toUpperCase()}] ${row.id}`);
    console.log(`   시드: ${row.title}`);
    console.log(`   overlay: ${row.overlaySourceLine}`);
    console.log(`   뉴스: ${row.newsTitle}`);
    if (row.issues.length) {
      for (const issue of row.issues) console.log(`   ⚠ ${issue}`);
    }
    if (row.topAlternatives.length > 0) {
      console.log("   대안 후보:");
      for (const alt of row.topAlternatives.slice(0, 3)) {
        console.log(`     · (${alt.score}) ${alt.title.slice(0, 64)}`);
      }
    }
    console.log("");
  }

  const summary = {
    strong: rows.filter((r) => r.tier === "strong").length,
    partial: rows.filter((r) => r.tier === "partial").length,
    weak: rows.filter((r) => r.tier === "weak").length,
    mismatch: rows.filter((r) => r.tier === "mismatch").length,
  };
  console.log(
    `요약: strong ${summary.strong} · partial ${summary.partial} · weak ${summary.weak} · mismatch ${summary.mismatch} / ${rows.length}`,
  );

  const hasProblems = summary.weak + summary.mismatch > 0;
  process.exit(hasProblems ? 2 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
