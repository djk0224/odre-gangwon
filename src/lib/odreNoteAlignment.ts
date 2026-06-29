import type { NaverNewsItem } from "@/services/external/naverNewsService";
import {
  getOdreNoteSeedDriftKeywords,
  getOdreNoteSeedTopicKeywords,
} from "@/lib/odreNoteSeedTopicRegistry";
import type { OdreNoteTone } from "@/lib/odreNoteTemplates";
import { getOdreNoteTemplateForTone, type OdreNoteCouplingMode } from "@/lib/odreNoteTemplates";

/** 시드 본문·메모가 기대하는 주제 (뉴스와 공유되어야 할 키워드) — CORE 8건 수동 */
export const ODRE_NOTE_SEED_TOPIC_KEYWORDS: Record<string, readonly string[]> = {
  "note-mukho-alley": ["묵호", "논골", "망상", "동해", "항구", "골목", "해변"],
  "note-jeongseon-festival": ["정선", "축제", "가리왕", "아라리", "시장", "나물"],
  "note-goseong-north-sea": ["고성", "dmz", "평화", "북쪽", "해변", "바다", "분단"],
  "note-pyeongchang-summer": ["평창", "대관령", "여름", "산", "휴양", "드라이브", "양떼"],
  "note-sokcho-goseong-comma": ["속초", "고성", "해수욕", "해변", "해안", "드라이브", "기온", "쉼"],
  "note-benefit-light-touch": ["혜택", "패스", "상품권", "방문", "강원여행", "숙박", "혜택받"],
  "note-samcheok-coastline": ["삼척", "케이블", "장호", "용화", "환선", "해안", "동굴"],
  "note-gangneung-coffee": ["강릉", "커피", "로스터", "카페", "축제", "안목", "시장"],
};

/** 뉴스에 있으면 시드 여행 글과 어긋나는 축 — 매칭 감점 */
export const ODRE_NOTE_SEED_DRIFT_KEYWORDS: Record<string, readonly string[]> = {
  "note-sokcho-goseong-comma": ["호텔", "플렉스", "리조트", "패키지", "고속도로", "예타"],
  "note-benefit-light-touch": ["158만", "전년 대비", "증가율", "통계"],
  "note-pyeongchang-summer": ["클래식"],
  "note-gangneung-coffee": ["로컬푸드", "문상윤", "원산지"],
  "note-samcheok-coastline": ["가볼만한곳", "top", "랭킹"],
  "note-dmz-peace-trail": ["산림의 날", "세계 산림", "경기"],
};

export type OdreNoteAlignmentTier = "strong" | "partial" | "weak" | "mismatch";

export type { OdreNoteCouplingMode } from "@/lib/odreNoteTemplates";

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ");
}

function countKeywordHits(text: string, keywords: readonly string[]): number {
  const normalized = normalize(text);
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase())).length;
}

/** 본문 정합 가/감점 — pickBest에 가산 */
export function scoreOdreNoteBodyAlignment(
  seedId: string,
  item: Pick<NaverNewsItem, "title" | "description">,
): number {
  const themes = getOdreNoteSeedTopicKeywords(seedId);
  const drift = getOdreNoteSeedDriftKeywords(seedId);
  if (themes.length === 0) return 0;

  const text = `${item.title} ${item.description ?? ""}`;
  let score = countKeywordHits(text, themes) * 3;
  score -= countKeywordHits(text, drift) * 8;

  return score;
}

export function assessOdreNoteNewsAlignment(
  seedId: string,
  noteText: string,
  news: Pick<NaverNewsItem, "title" | "description">,
): { tier: OdreNoteAlignmentTier; score: number; issues: string[] } {
  const themes = getOdreNoteSeedTopicKeywords(seedId);
  const drift = getOdreNoteSeedDriftKeywords(seedId);
  const newsText = `${news.title} ${news.description ?? ""}`;

  const bodyHits = countKeywordHits(noteText, themes);
  const newsHits = countKeywordHits(newsText, themes);
  const driftHits = countKeywordHits(newsText, drift);

  const issues: string[] = [];
  let score = newsHits * 10 + Math.min(bodyHits, newsHits) * 5;
  score -= driftHits * 15;

  if (newsHits === 0) issues.push("뉴스에 시드 핵심 키워드 없음");
  if (driftHits > 0) issues.push(`시드와 다른 뉴스 축: ${drift.join(", ")}`);

  let tier: OdreNoteAlignmentTier;
  if (score >= 35 && driftHits === 0) tier = "strong";
  else if (score >= 18) tier = "partial";
  else if (score >= 0) tier = "weak";
  else tier = "mismatch";

  return { tier, score, issues };
}

export function getOdreNoteCouplingMode(tone: OdreNoteTone): OdreNoteCouplingMode {
  return getOdreNoteTemplateForTone(tone).coupling;
}

export const ODRE_NOTE_MIN_ALIGNMENT: Record<OdreNoteCouplingMode, OdreNoteAlignmentTier> = {
  tight: "partial",
  context: "weak",
  loose: "weak",
};

const TIER_RANK: Record<OdreNoteAlignmentTier, number> = {
  mismatch: 0,
  weak: 1,
  partial: 2,
  strong: 3,
};

export function meetsMinAlignment(
  tier: OdreNoteAlignmentTier,
  mode: OdreNoteCouplingMode,
): boolean {
  return TIER_RANK[tier] >= TIER_RANK[ODRE_NOTE_MIN_ALIGNMENT[mode]];
}
