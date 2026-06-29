import type { NaverNewsItem } from "@/services/external/naverNewsService";
import { scoreOdreNoteBodyAlignment } from "@/lib/odreNoteAlignment";

/** 오드레 노트 뉴스 스크랩 시작일 — env `ODRE_NOTE_NEWS_SINCE` 설정 시에만 적용 */
export const ODRE_NOTE_NEWS_SINCE_DEFAULT = "2026-06-01";
const EXCLUDED_NEWS_KEYWORDS = [
  "당선",
  "당선인",
  "선거",
  "국회",
  "국회의원",
  "의원",
  "여당",
  "야당",
  "정당",
  "정치",
  "후보",
  "출마",
  "투표",
  "개표",
  "대통령",
  "장관",
  "도지사",
  "군수",
  "구청장",
  "시장 당선",
  "시장당선",
  "민주당",
  "국민의힘",
  "더불어",
  "새누리",
  "여론조사",
  "[사설]",
  "사설]",
  "참변",
  "사망",
  "익사",
  "실종",
] as const;

/** 관광 카드와 무관한 사건·단속·범죄 */
const NEGATIVE_NEWS_KEYWORDS = [
  "경찰",
  "단속",
  "교통비상",
  "음주운전",
  "체포",
  "구속",
  "수사",
  "피의자",
  "재판",
  "bhc",
  "치킨",
  "쿠킹클래스",
] as const;

/** 지역 앵커 없이 전국/플랫폼 프로모만 있는 제목 — 시드와 무관 */
const GENERIC_NEWS_WITHOUT_LOCAL_ANCHOR = [
  "쿠팡",
  "네이버페이",
  "카카오페이",
  "문체부·한국관광공사",
  "국내 여름 여행 할인",
  "전국 투어",
] as const;

export interface OdreNoteNewsMatchProfile {
  /** 네이버 검색 쿼리 — 순서대로 호출 후 결과 병합 */
  queries: readonly string[];
  /** 제목·요약에 최소 1개 필수 (지역·주제 앵커) */
  anchorKeywords: readonly string[];
  /** 추가 가점 */
  bonusKeywords?: readonly string[];
  /** 이 점수 미만이면 overlay 생략(시드 sourceLine 유지) */
  minScore?: number;
  /** true면 제목에 anchorKeywords 1개 이상 필수 */
  requireTitleAnchor?: boolean;
}

/** 시드 id → 검색·매칭 프로필 (본문·placeKeywords와 정합) — 수동 튜닝 8건 */
export const ODRE_NOTE_NEWS_PROFILES_CORE: Record<string, OdreNoteNewsMatchProfile> = {
  "note-mukho-alley": {
    queries: ["동해 묵호 논골담길", "동해 망상해변 관광", "동해시 묵호항"],
    anchorKeywords: ["묵호", "논골", "망상", "동해", "천곡"],
    bonusKeywords: ["항구", "해변", "등대", "골목", "관광"],
    minScore: 6,
  },
  "note-jeongseon-festival": {
    queries: ["정선 가리왕산 봄나물축제", "정선 아라리촌 축제", "정선 시장 축제"],
    anchorKeywords: ["정선", "가리왕", "아라리", "봄나물"],
    bonusKeywords: ["축제", "나물", "시장", "아리랑"],
    minScore: 6,
  },
  "note-goseong-north-sea": {
    queries: ["고성 DMZ 관광", "고성 해변 평화", "고성 북쪽 바다"],
    anchorKeywords: ["고성", "DMZ", "분단", "평화"],
    bonusKeywords: ["해변", "바다", "북쪽", "관광", "해안"],
    minScore: 6,
  },
  "note-pyeongchang-summer": {
    queries: ["평창 대관령 여름 관광", "평창 여름 휴양", "대관령 양떼목장 여름"],
    anchorKeywords: ["평창", "대관령", "강릉대관령"],
    bonusKeywords: ["여름", "산간", "휴양", "한우", "드라이브", "숲"],
    minScore: 6,
    requireTitleAnchor: true,
  },
  "note-sokcho-goseong-comma": {
    queries: ["속초 고성 해안 드라이브", "설악 속초 고성 관광", "동해안 드라이브 속초"],
    anchorKeywords: ["속초", "고성", "설악", "동해안"],
    bonusKeywords: ["해수욕", "해변", "해안", "드라이브", "관광"],
    minScore: 6,
  },
  "note-benefit-light-touch": {
    queries: ["혜택받GO 강원여행", "강원혜택이지 방문", "강원 방문의 해 혜택"],
    anchorKeywords: ["혜택받", "강원여행", "강원혜택", "강원 방문", "강원패스", "숙박세일", "혜택"],
    bonusKeywords: ["방문", "상품권", "강원", "이벤트"],
    minScore: 6,
    requireTitleAnchor: true,
  },
  "note-samcheok-coastline": {
    queries: ["삼척 해상케이블카", "삼척 장호 해변", "삼척 용화 환선굴"],
    anchorKeywords: ["삼척", "장호", "용화", "환선", "케이블"],
    bonusKeywords: ["해안", "해변", "에메랄드", "근덕", "바다"],
    minScore: 6,
  },
  "note-gangneung-coffee": {
    queries: ["강릉 커피축제", "강릉커피축제 일정", "강릉 로스터리 카페"],
    anchorKeywords: ["강릉", "커피", "로스터", "카페"],
    bonusKeywords: ["축제", "원두", "안목", "순례", "개막"],
    minScore: 6,
  },
};

function normalizeNewsText(title: string, description?: string): string {
  return `${title} ${description ?? ""}`.toLowerCase();
}

export function isExcludedOdreNoteNewsTitle(title: string): boolean {
  const normalized = title.trim();
  if (!normalized) return true;

  return EXCLUDED_NEWS_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isGenericWithoutLocalAnchor(text: string, anchorHits: number): boolean {
  if (anchorHits > 0) return false;
  return GENERIC_NEWS_WITHOUT_LOCAL_ANCHOR.some((phrase) => text.includes(phrase.toLowerCase()));
}

export function scoreOdreNoteNewsItem(
  item: Pick<NaverNewsItem, "title" | "description">,
  profile: OdreNoteNewsMatchProfile,
): number {
  if (isExcludedOdreNoteNewsTitle(item.title)) return -1;

  const titleLower = item.title.toLowerCase();
  if (profile.requireTitleAnchor) {
    const titleHasAnchor = profile.anchorKeywords.some((keyword) =>
      titleLower.includes(keyword.toLowerCase()),
    );
    if (!titleHasAnchor) return -1;
  }

  const text = normalizeNewsText(item.title, item.description);
  const anchorHits = profile.anchorKeywords.filter((keyword) =>
    text.includes(keyword.toLowerCase()),
  ).length;

  if (anchorHits === 0 || isGenericWithoutLocalAnchor(text, anchorHits)) return -1;

  let score = anchorHits * 4;

  for (const keyword of profile.bonusKeywords ?? []) {
    if (text.includes(keyword.toLowerCase())) score += 2;
  }

  for (const keyword of NEGATIVE_NEWS_KEYWORDS) {
    if (text.includes(keyword.toLowerCase())) score -= 12;
  }

  if (score < 0) return -1;

  if (profile.anchorKeywords.some((keyword) => titleLower.includes(keyword.toLowerCase()))) {
    score += 3;
  }

  return score;
}

export function filterEligibleOdreNoteNews<T extends Pick<NaverNewsItem, "title" | "description">>(
  items: T[],
): T[] {
  return items.filter((item) => !isExcludedOdreNoteNewsTitle(item.title));
}

function recencyBonus(pubDate?: string): number {
  if (!pubDate?.trim()) return 0;
  const parsed = new Date(pubDate);
  if (Number.isNaN(parsed.getTime())) return 0;
  const ageDays = (Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 120) return 5;
  if (ageDays <= 365) return 1;
  return -4;
}

export function pickBestOdreNoteNewsItem<T extends Pick<NaverNewsItem, "title" | "description" | "pubDate">>(
  items: T[],
  profile: OdreNoteNewsMatchProfile,
  seedId?: string,
): { item: T; score: number } | undefined {
  const minScore = profile.minScore ?? 6;
  let best: T | undefined;
  let bestScore = minScore - 1;

  for (const item of items) {
    let score = scoreOdreNoteNewsItem(item, profile);
    if (score < 0) continue;
    if (seedId) score += scoreOdreNoteBodyAlignment(seedId, item);
    score += recencyBonus(item.pubDate);

    if (score > bestScore) {
      bestScore = score;
      best = item;
    } else if (score === bestScore && best && item.pubDate && best.pubDate) {
      const itemDate = new Date(item.pubDate).getTime();
      const bestDate = new Date(best.pubDate).getTime();
      if (itemDate > bestDate) best = item;
    }
  }

  if (!best) return undefined;
  return { item: best, score: bestScore };
}

/** 병합된 sourceLine이 시드 주제와 최소 1개 앵컈 공유하는지 */
export function isSourceLineRelevantToProfile(
  sourceLine: string,
  profile: OdreNoteNewsMatchProfile,
): boolean {
  const text = sourceLine.toLowerCase();
  if (profile.anchorKeywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
    return true;
  }

  // 혜택·강원 전역 칼럼 — '강원'+'혜택|방문|여행|패스' 조합
  if (profile.anchorKeywords.some((k) => ["혜택", "강원"].includes(k))) {
    const hasGangwon = text.includes("강원");
    const hasTheme = ["혜택", "방문", "여행", "패스", "상품권"].some((w) => text.includes(w));
    return hasGangwon && hasTheme;
  }

  return false;
}

export { EXCLUDED_NEWS_KEYWORDS };
