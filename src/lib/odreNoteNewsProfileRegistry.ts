import type { OdreNote } from "@/data/odreNotes";
import { ODRE_NOTE_SEEDS } from "@/data/odreNotes";
import {
  ODRE_NOTE_NEWS_PROFILES_CORE,
  type OdreNoteNewsMatchProfile,
} from "@/lib/odreNoteNewsPolicy";

function profileFromSeed(seed: OdreNote): OdreNoteNewsMatchProfile {
  const keywords = seed.placeKeywords?.length
    ? seed.placeKeywords
    : seed.zones.flatMap((zone) => zone.split("-").slice(0, 2));

  const queries = keywords.slice(0, 3).map((keyword) => `${keyword} 강원 관광`);
  if (queries.length === 0) {
    queries.push("강원 관광");
  }

  return {
    queries,
    anchorKeywords: keywords.slice(0, 6),
    bonusKeywords: ["관광", "여행", "축제", "해변", "산"],
    minScore: 6,
  };
}

/** 확장 시드 — 자동 프로필보다 우선하는 수동 튜닝 */
export const ODRE_NOTE_NEWS_PROFILES_EXTENDED: Record<string, OdreNoteNewsMatchProfile> = {
  "note-cheorwon-rose-festival": {
    queries: ["철원 장미축제", "한탄강 장미축제", "철원 DMZ 봄"],
    anchorKeywords: ["철원", "장미", "한탄"],
    bonusKeywords: ["축제", "유채", "dmz"],
    minScore: 6,
    requireTitleAnchor: true,
  },
  "note-yeongwol-cave": {
    queries: ["영월 고씨동굴", "영월 동굴", "고씨동굴"],
    anchorKeywords: ["영월", "고씨", "동굴"],
    bonusKeywords: ["탐방", "관광", "체험"],
    minScore: 6,
    requireTitleAnchor: true,
  },
  "note-gangwon-autumn-drive": {
    queries: ["강원 단풍 드라이브", "강원 가을 관광", "강원 단풍 명소"],
    anchorKeywords: ["단풍", "가을", "드라이브", "강원"],
    bonusKeywords: ["관광", "여행", "산"],
    minScore: 6,
    requireTitleAnchor: true,
  },
  "note-dmz-peace-trail": {
    queries: ["DMZ 평화의 길", "고성 평화 트레일", "강원 DMZ 걷기"],
    anchorKeywords: ["평화의 길", "평화", "트레일", "dmz", "고성"],
    bonusKeywords: ["행사", "트레킹", "양양", "걷기"],
    minScore: 8,
    requireTitleAnchor: true,
  },
  "note-donghae-lavender": {
    queries: ["무릉별유천지 라벤더", "동해 라벤더축제", "무릉 라벤더"],
    anchorKeywords: ["무릉", "라벤더", "동해", "별유천지"],
    bonusKeywords: ["축제", "야간", "관광", "청옥호"],
    minScore: 6,
    requireTitleAnchor: true,
  },
  "note-gangneung-dano": {
    queries: ["강릉단오제", "강릉 단오제", "창포물대전"],
    anchorKeywords: ["강릉", "단오", "단오제", "창포"],
    bonusKeywords: ["축제", "유네스코", "길놀이", "문화유산"],
    minScore: 6,
    requireTitleAnchor: true,
  },
};

/** CORE 8건 + 확장 시드 placeKeywords 자동 프로필 */
export function buildOdreNoteNewsProfiles(
  seeds: OdreNote[] = ODRE_NOTE_SEEDS,
): Record<string, OdreNoteNewsMatchProfile> {
  const profiles: Record<string, OdreNoteNewsMatchProfile> = {
    ...ODRE_NOTE_NEWS_PROFILES_CORE,
    ...ODRE_NOTE_NEWS_PROFILES_EXTENDED,
  };

  for (const seed of seeds) {
    if (!profiles[seed.id]) {
      profiles[seed.id] = profileFromSeed(seed);
    }
  }

  return profiles;
}

export const ODRE_NOTE_NEWS_PROFILES = buildOdreNoteNewsProfiles();

export {
  pickBestOdreNoteNewsItem,
  scoreOdreNoteNewsItem,
} from "@/lib/odreNoteNewsPolicy";
