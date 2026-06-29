/**
 * 오드레 노트 손글 시드 품질 검증
 * 실행: npm run verify:notes
 *
 * refresh:notes 후에도 시드 TS 원본·overlays 병합 결과를 검사합니다.
 */
import { ODRE_NOTE_SEEDS, ODRE_NOTE_SEED_COUNT, getOdreNotes, type OdreNote, type OdreNoteTone } from "../src/data/odreNotes";
import {
  isExcludedOdreNoteNewsTitle,
  isSourceLineRelevantToProfile,
  ODRE_NOTE_NEWS_PROFILES_CORE,
} from "../src/lib/odreNoteNewsPolicy";
import { ODRE_NOTE_NEWS_PROFILES } from "../src/lib/odreNoteNewsProfileRegistry";
import {
  assessOdreNoteNewsAlignment,
  getOdreNoteCouplingMode,
  meetsMinAlignment,
} from "../src/lib/odreNoteAlignment";
import { getOdreNoteSeedTopicKeywords } from "../src/lib/odreNoteSeedTopicRegistry";
import { getOdreNoteTemplateForTone } from "../src/lib/odreNoteTemplates";
import { getOdreNotePlanHint, ODRE_NOTE_PLAN_HINTS } from "../src/data/odreNotePlanHints";

function isOverlaySourceLineRelevant(
  seedId: string,
  sourceLine: string,
  profile: (typeof ODRE_NOTE_NEWS_PROFILES)[string],
): boolean {
  const text = sourceLine.toLowerCase();
  const topics = getOdreNoteSeedTopicKeywords(seedId);
  if (topics.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return true;
  }
  return isSourceLineRelevantToProfile(sourceLine, profile);
}
import { isNaverNewsOnOrAfter } from "../src/services/external/naverNewsService";
import odreNotesImported from "../src/data/imported/odre-notes.json";

const SCRAPE_SINCE = (odreNotesImported as { scrapeSince?: string | null }).scrapeSince ?? undefined;

const HANJA_RE = /[\u4e00-\u9fff]/;
const FORMAL_LEAD_RE = /(습니다|입니다|됩니다|하세요|주세요|드립니다)[.?!]?$/;
const FORBIDDEN_PHRASES = [
  "지도上",
  "하맥사",
  "공사장",
  "B2G",
  "분산",
  "캠페인",
  "dispersion",
  "숨은 보석",
  "힐링 명소",
  "다채로운 매력",
];
const FORBIDDEN_LEAD_ENDINGS = ["습니다", "입니다", "됩니다", "하세요"];

const TONE_BODY_RULES: Record<
  OdreNoteTone,
  { minChars: number; maxChars: number; minParagraphs: number; maxParagraphs: number }
> = {
  "news-hook": { minChars: 350, maxChars: 950, minParagraphs: 4, maxParagraphs: 5 },
  scene: { minChars: 450, maxChars: 1400, minParagraphs: 5, maxParagraphs: 7 },
  "myth-flip": { minChars: 350, maxChars: 1100, minParagraphs: 4, maxParagraphs: 6 },
  traveler: { minChars: 350, maxChars: 1000, minParagraphs: 4, maxParagraphs: 6 },
  "local-context": { minChars: 450, maxChars: 1500, minParagraphs: 5, maxParagraphs: 7 },
  column: { minChars: 250, maxChars: 800, minParagraphs: 3, maxParagraphs: 5 },
};

function collectTextFields(note: OdreNote): Array<{ field: string; text: string }> {
  const fields: Array<{ field: string; text: string }> = [
    { field: "title", text: note.title },
    { field: "lead", text: note.lead },
    { field: "sourceLine", text: note.sourceLine },
  ];

  note.body.forEach((paragraph, index) => {
    fields.push({ field: `body[${index}]`, text: paragraph });
  });

  if (note.benefitNote) {
    fields.push({ field: "benefitNote", text: note.benefitNote });
  }

  for (const [key, value] of Object.entries(note.travelMemo)) {
    if (value) fields.push({ field: `travelMemo.${key}`, text: value });
  }

  return fields;
}

function fail(errors: string[], message: string) {
  errors.push(message);
}

function verifyNote(note: OdreNote, errors: string[]) {
  const prefix = `[${note.id}]`;

  if (note.title.length < 8 || note.title.length > 32) {
    fail(errors, `${prefix} title length ${note.title.length} (expect 8~32)`);
  }

  if (note.lead.length < 30 || note.lead.length > 90) {
    fail(errors, `${prefix} lead length ${note.lead.length} (expect 30~90)`);
  }

  if (FORMAL_LEAD_RE.test(note.lead.trim())) {
    fail(errors, `${prefix} lead uses formal ending (use 해라체: -다/-한다)`);
  }

  for (const ending of FORBIDDEN_LEAD_ENDINGS) {
    if (note.lead.includes(ending)) {
      fail(errors, `${prefix} lead contains formal phrase "${ending}"`);
    }
  }

  if (note.sourceLine.length < 12 || note.sourceLine.length > 48) {
    fail(errors, `${prefix} sourceLine length ${note.sourceLine.length} (expect 12~48)`);
  }

  const rules = TONE_BODY_RULES[note.tone];
  const bodyText = note.body.join("");
  if (note.body.length < rules.minParagraphs || note.body.length > rules.maxParagraphs) {
    fail(
      errors,
      `${prefix} body paragraphs ${note.body.length} (tone ${note.tone}: ${rules.minParagraphs}~${rules.maxParagraphs})`,
    );
  }
  if (bodyText.length < rules.minChars || bodyText.length > rules.maxChars) {
    fail(
      errors,
      `${prefix} body chars ${bodyText.length} (tone ${note.tone}: ${rules.minChars}~${rules.maxChars})`,
    );
  }

  for (const { field, text } of collectTextFields(note)) {
    if (HANJA_RE.test(text)) {
      fail(errors, `${prefix} ${field} contains Hanja/CJK: "${text.match(HANJA_RE)?.[0]}"`);
    }
    for (const phrase of FORBIDDEN_PHRASES) {
      if (text.includes(phrase)) {
        fail(errors, `${prefix} ${field} contains forbidden phrase "${phrase}"`);
      }
    }
  }
}

function main() {
  const errors: string[] = [];

  if (ODRE_NOTE_SEEDS.length !== ODRE_NOTE_SEED_COUNT) {
    fail(errors, `expected ${ODRE_NOTE_SEED_COUNT} seeds, got ${ODRE_NOTE_SEEDS.length}`);
  }

  if (Object.keys(ODRE_NOTE_PLAN_HINTS).length !== ODRE_NOTE_SEED_COUNT) {
    fail(
      errors,
      `planHint count ${Object.keys(ODRE_NOTE_PLAN_HINTS).length} !== ${ODRE_NOTE_SEED_COUNT}`,
    );
  }

  const ids = new Set<string>();
  for (const note of ODRE_NOTE_SEEDS) {
    if (ids.has(note.id)) fail(errors, `duplicate seed id ${note.id}`);
    ids.add(note.id);
    verifyNote(note, errors);
    const planHint = getOdreNotePlanHint(note.id);
    if (!planHint?.lines[0]?.trim() || !planHint.lines[1]?.trim()) {
      fail(errors, `[${note.id}] planHint missing or needs 2 prose lines (odreNotePlanHints.ts)`);
    }
    if (note.filters.includes("festival") && !note.eventPeriod) {
      fail(errors, `[${note.id}] festival seed missing eventPeriod (행사 기간)`);
    }
  }

  for (const note of getOdreNotes()) {
    if (isExcludedOdreNoteNewsTitle(note.sourceLine)) {
      fail(errors, `[${note.id}] sourceLine excluded (political/editorial): "${note.sourceLine}"`);
    }

    const hasOverlay = (odreNotesImported.overlays ?? []).some((overlay) => overlay.id === note.id);
    if (!hasOverlay) continue;

    const profile = ODRE_NOTE_NEWS_PROFILES[note.id];
    if (profile && !isOverlaySourceLineRelevant(note.id, note.sourceLine, profile)) {
      fail(
        errors,
        `[${note.id}] sourceLine not relevant to seed topic: "${note.sourceLine}"`,
      );
    }

    if (SCRAPE_SINCE && note.source?.pubDate && !isNaverNewsOnOrAfter(note.source.pubDate, SCRAPE_SINCE)) {
      fail(
        errors,
        `[${note.id}] overlay pubDate ${note.source.pubDate} is before scrape floor ${SCRAPE_SINCE}`,
      );
    }

    if (note.filters.includes("festival") && !note.eventPeriod) {
      fail(errors, `[${note.id}] festival note missing eventPeriod after merge`);
    }

    if (!hasOverlay) continue;

    const bodyText = [note.lead, ...note.body, ...Object.values(note.travelMemo)].join(" ");
    const alignment = assessOdreNoteNewsAlignment(note.id, bodyText, {
      title: note.sourceLine,
      description: "",
    });
    const coupling = getOdreNoteCouplingMode(note.tone);
    const template = getOdreNoteTemplateForTone(note.tone);
    if (template.requireOverlay && !meetsMinAlignment(alignment.tier, coupling)) {
      fail(
        errors,
        `[${note.id}] overlay alignment ${alignment.tier} below ${coupling} (${alignment.issues.join("; ")})`,
      );
    }
  }

  if (errors.length > 0) {
    console.error("verify:notes FAILED\n");
    for (const error of errors) {
      console.error(`  ✗ ${error}`);
    }
    process.exit(1);
  }

  console.log(
    `verify:notes OK — ${ODRE_NOTE_SEEDS.length} seeds${SCRAPE_SINCE ? `, scrape since ${SCRAPE_SINCE}` : ""}`,
  );
}

main();
