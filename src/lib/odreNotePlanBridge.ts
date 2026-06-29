import type { OdreNote, OdreNoteTravelMemo } from "@/data/odreNotes";
import type { OdreNotePlanHint } from "@/data/odreNotePlanHints";
import { getOdreNotePlanHint } from "@/data/odreNotePlanHints";
import { partnerPlaceProfiles } from "@/data/partnerPlaceProfiles";
import { placeGeocodeQueries } from "@/data/placeGeocodeQueries";
import { purposeThemeMap } from "@/data/mockRegionalFraming";
import { enrichPreferencesFromRegionalContext } from "@/lib/regionalPreferences";
import {
  findCatalogPlaceByNameHint,
  getCatalogPlaceById,
  getCatalogPlaces,
} from "@/services/placeGeocodeService";
import { normalizePlaceName } from "@/lib/tourPlaceMapper";
import type {
  Place,
  TravelPurposeId,
  TravelZoneId,
  TripPace,
  TripPreferences,
  TripTheme,
} from "@/types/travel";

/** UI에 노출하지 않는 실행 컨텍스트 — 일정 생성·장소 선호에만 사용 */
export interface OdreNotePlanContext {
  noteId: string;
  noteTitle: string;
  zoneId: TravelZoneId;
  /** bestTiming·pairWith에서 해석한 방문 순서 */
  orderedPlaceIds: string[];
  preserveOrder: boolean;
  /** B안 「이 글로 걸을 거리」 */
  planHint: OdreNotePlanHint;
  /** 노트에서 해석 — 위저드에서 변경 불가 */
  lockedTravelPurpose: TravelPurposeId;
  lockedThemes: TripTheme[];
}

export interface OdreNotePlanBridgeResult {
  context: OdreNotePlanContext;
  preferences: TripPreferences;
  placeSelections: Array<{ placeId: string; intent: "must_go" }>;
}

function normalizeHint(text: string): string {
  return normalizePlaceName(text).toLowerCase();
}

/** travelMemo·placeKeywords에서 장소 힌트 문자열 추출 */
export function extractOdreNotePlaceHints(
  memo: OdreNoteTravelMemo,
  placeKeywords: readonly string[] = [],
): string[] {
  const hints: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string) => {
    const cleaned = raw
      .replace(/^(평일|주말|공휴일)\s*(오전|오후|저녁|밤)?\s*,?\s*/u, "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\s*(순|코스|동선|이동)\s*$/u, "")
      .trim();
    if (cleaned.length < 2) return;
    const key = normalizeHint(cleaned);
    if (seen.has(key)) return;
    seen.add(key);
    hints.push(cleaned);
  };

  if (memo.bestTiming) {
    const parts = memo.bestTiming.split(/[,，]/).map((part) => part.trim());
    const routePart = parts.find((part) => /→|->/.test(part)) ?? parts[parts.length - 1] ?? memo.bestTiming;
    for (const segment of routePart.split(/→|->|·|\+/)) {
      push(segment);
    }
  }

  if (memo.pairWith) {
    for (const segment of memo.pairWith.split(/→|->|·|\+|,/)) {
      push(segment);
    }
  }

  for (const keyword of placeKeywords) {
    push(keyword);
  }

  return hints;
}

function matchPartnerPlace(hint: string, zones: TravelZoneId[]): Place | undefined {
  const key = normalizeHint(hint);
  for (const profile of partnerPlaceProfiles) {
    if (zones.length > 0 && !zones.includes(profile.region)) continue;
    const matched = profile.matchNames.some((name) => {
      const n = normalizeHint(name);
      return key.includes(n) || n.includes(key);
    });
    if (!matched) continue;
    const place = placeFromPartnerOrGeocodeId(profile.id);
    if (place) return place;
  }
  return undefined;
}

function placeFromPartnerOrGeocodeId(placeId: string): Place | undefined {
  const fromCatalog = getCatalogPlaceById(placeId);
  if (fromCatalog) return fromCatalog;

  const profile = partnerPlaceProfiles.find((entry) => entry.id === placeId);
  if (profile) {
    return {
      id: profile.id,
      name: profile.matchNames[0],
      category: profile.patch.category ?? "experience",
      region: profile.region,
      description: profile.patch.description ?? "",
      signature: profile.patch.signature ?? "",
      tags: profile.patch.tags ?? [],
      operatingHours: profile.patch.operatingHours ?? "상시",
      estimatedDuration: profile.patch.estimatedDuration ?? "1시간",
      distanceNote: "",
      recommendationReason: profile.patch.recommendationReason ?? "",
      gradient: "from-pine-deep via-pine to-mist",
      coordinates: profile.patch.coordinates ?? { lat: 37.4, lng: 128.5 },
      reservationRequired: profile.patch.reservationRequired ?? false,
      partner: profile.patch.partner ?? false,
      qrAvailable: profile.patch.qrAvailable ?? false,
      availableSlots: profile.patch.availableSlots ?? [],
    };
  }

  const query = placeGeocodeQueries[placeId as keyof typeof placeGeocodeQueries];
  if (!query) return undefined;

  return {
    id: placeId,
    name: query,
    category: "trail",
    region: "samcheok-donghae",
    description: query,
    signature: "",
    tags: [],
    operatingHours: "상시",
    estimatedDuration: "1시간",
    distanceNote: "",
    recommendationReason: "",
    gradient: "from-pine-deep via-pine to-mist",
    coordinates: { lat: 37.43, lng: 129.16 },
    reservationRequired: false,
    partner: false,
    qrAvailable: false,
    availableSlots: [],
  };
}

function matchGeocodeQuery(hint: string, zones: TravelZoneId[]): Place | undefined {
  const key = normalizeHint(hint);
  for (const [placeId, query] of Object.entries(placeGeocodeQueries)) {
    const place = placeFromPartnerOrGeocodeId(placeId);
    if (!place) continue;
    if (zones.length > 0 && !zones.includes(place.region)) continue;
    const q = normalizeHint(query);
    if (key.includes(q) || q.includes(key)) return place;
    for (const token of q.split(/\s+/)) {
      if (token.length >= 2 && (key.includes(token) || token.includes(key))) return place;
    }
  }
  return undefined;
}

function scoreCatalogMatch(hint: string, place: Place): number {
  const key = normalizeHint(hint);
  const name = normalizeHint(place.name);
  if (!key || key.length < 2) return 0;
  if (name.includes(key) || key.includes(name)) return 100;
  let score = 0;
  for (const tag of place.tags) {
    const t = normalizeHint(tag);
    if (key.includes(t) || t.includes(key)) score = Math.max(score, 85);
  }
  if (place.description && normalizeHint(place.description).includes(key)) {
    score = Math.max(score, 70);
  }
  return score;
}

export function resolvePlaceFromOdreNoteHint(
  hint: string,
  zones: TravelZoneId[],
): Place | undefined {
  const trimmed = hint.trim();
  if (trimmed.length < 2) return undefined;

  const partner = matchPartnerPlace(trimmed, zones);
  if (partner) return partner;

  const geocode = matchGeocodeQuery(trimmed, zones);
  if (geocode) return geocode;

  for (const zone of zones) {
    const byName = findCatalogPlaceByNameHint(trimmed, zone);
    if (byName) return byName;
  }

  const pool =
    zones.length > 0
      ? getCatalogPlaces().filter((place) => zones.includes(place.region))
      : getCatalogPlaces();

  let best: Place | undefined;
  let bestScore = 0;
  for (const place of pool) {
    const score = scoreCatalogMatch(trimmed, place);
    if (score > bestScore) {
      bestScore = score;
      best = place;
    }
  }
  return bestScore >= 70 ? best : undefined;
}

export function resolveOdreNotePlaceIds(note: OdreNote): string[] {
  const zones = note.zones.length > 0 ? note.zones : ([note.zones[0]] as TravelZoneId[]);
  const hints = extractOdreNotePlaceHints(note.travelMemo, note.placeKeywords ?? []);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const hint of hints) {
    const place = resolvePlaceFromOdreNoteHint(hint, zones);
    if (!place || seen.has(place.id)) continue;
    seen.add(place.id);
    ids.push(place.id);
  }

  return ids;
}

function derivePace(memo: OdreNoteTravelMemo): TripPace | undefined {
  const text = `${memo.travelStyle ?? ""} ${memo.bestTiming ?? ""}`;
  if (/느린|여유|천천|쉼|휴식/.test(text)) return "relaxed";
  if (/빡빡|짧게|당일|많이/.test(text)) return "packed";
  return undefined;
}

const ITINERARY_TRAVEL_PURPOSES: TravelPurposeId[] = [
  "drive",
  "leisure",
  "coast",
  "mountain",
  "food",
];

const PURPOSE_KEYWORDS: Record<TravelPurposeId, readonly string[]> = {
  drive: ["드라이브", "네이처로드", "도로", "자차", "해안도로", "코스", "이동"],
  leisure: ["트레일", "트레킹", "레일바이크", "서핑", "레저", "액티비티", "걷기", "축제", "체험"],
  coast: ["바다", "해변", "항구", "등대", "해안", "해수욕", "항", "동해", "전망"],
  mountain: ["산", "설악", "대관령", "숲", "고원", "알펜", "목장", "계곡"],
  food: ["커피", "시장", "카페", "로스터", "맛", "나물", "국수", "순대", "미식", "식사"],
  workation: ["워케이션", "장기체류", "체류"],
};

const THEME_KEYWORDS: Record<TripTheme, readonly string[]> = {
  culture: ["축제", "시장", "커피", "아라리", "전통", "골목", "문화", "국수"],
  activity: ["케이블카", "서핑", "레일바이크", "트레킹", "레저", "액티비티", "목장"],
  history: ["dmz", "분단", "평화", "역사", "유적", "전망대", "통일"],
  experience: ["동굴", "체험", "뗏목", "박물관", "레일"],
  nature: ["바다", "산", "해변", "숲", "드라이브", "해안", "동해", "설악"],
  rest: ["느린", "쉼", "골목", "휴식", "여유", "카페", "조용", "체류"],
};

function collectNotePlanningText(note: OdreNote): string {
  return [
    note.title,
    note.lead,
    ...note.body,
    ...(note.placeKeywords ?? []),
    ...Object.values(note.travelMemo).filter(Boolean),
  ]
    .join(" ")
    .toLowerCase();
}

function countPlanningKeywordHits(text: string, keywords: readonly string[]): number {
  return keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
}

function filterPurposeBoost(note: OdreNote): Partial<Record<TravelPurposeId, number>> {
  const boosts: Partial<Record<TravelPurposeId, number>> = {};
  if (note.filters.includes("light-route")) boosts.drive = (boosts.drive ?? 0) + 4;
  if (note.filters.includes("sea")) boosts.coast = (boosts.coast ?? 0) + 5;
  if (note.filters.includes("mountain")) boosts.mountain = (boosts.mountain ?? 0) + 5;
  if (note.filters.includes("festival")) {
    boosts.leisure = (boosts.leisure ?? 0) + 3;
    boosts.food = (boosts.food ?? 0) + 2;
  }
  if (note.filters.includes("quiet-zone")) boosts.coast = (boosts.coast ?? 0) + 2;
  return boosts;
}

/** 글·필터·키워드 기반 여행 목적 */
export function deriveTravelPurposeFromNote(note: OdreNote): TravelPurposeId {
  const text = collectNotePlanningText(note);
  const boosts = filterPurposeBoost(note);

  let best: TravelPurposeId = "coast";
  let bestScore = -1;

  for (const purpose of ITINERARY_TRAVEL_PURPOSES) {
    const score =
      countPlanningKeywordHits(text, PURPOSE_KEYWORDS[purpose]) * 2 + (boosts[purpose] ?? 0);
    if (score > bestScore) {
      bestScore = score;
      best = purpose;
    }
  }

  return best;
}

function filterThemeBoost(note: OdreNote): Partial<Record<TripTheme, number>> {
  const boosts: Partial<Record<TripTheme, number>> = {};
  if (note.filters.includes("sea")) boosts.nature = (boosts.nature ?? 0) + 3;
  if (note.filters.includes("mountain")) boosts.nature = (boosts.nature ?? 0) + 2;
  if (note.filters.includes("festival")) boosts.culture = (boosts.culture ?? 0) + 4;
  if (note.filters.includes("quiet-zone") || note.filters.includes("light-route")) {
    boosts.rest = (boosts.rest ?? 0) + 3;
  }
  if (note.tone === "scene") boosts.rest = (boosts.rest ?? 0) + 1;
  if (note.tone === "news-hook") boosts.culture = (boosts.culture ?? 0) + 1;
  return boosts;
}

/** 글·목적 기반 관심 카테고리 (1~2개) */
export function deriveThemesFromNote(
  note: OdreNote,
  travelPurpose: TravelPurposeId,
): TripTheme[] {
  const text = collectNotePlanningText(note);
  const boosts = filterThemeBoost(note);
  const purposeTheme = purposeThemeMap[travelPurpose];

  const ranked = (Object.keys(THEME_KEYWORDS) as TripTheme[])
    .map((theme) => ({
      theme,
      score: countPlanningKeywordHits(text, THEME_KEYWORDS[theme]) * 2 + (boosts[theme] ?? 0),
    }))
    .sort((a, b) => b.score - a.score);

  const picked = ranked.filter((entry) => entry.score > 0).slice(0, 2).map((entry) => entry.theme);

  if (picked.length === 0) {
    return [purposeTheme];
  }

  if (!picked.includes(purposeTheme)) {
    return picked.length >= 2 ? [purposeTheme, picked[0]] : [picked[0], purposeTheme];
  }

  return picked;
}

function deriveTransportation(memo: OdreNoteTravelMemo): TripPreferences["transportation"] | undefined {
  const text = memo.travelStyle ?? "";
  if (/대중교통|버스|기차|KTX/.test(text)) return "public-transit";
  if (/드라이브|자차|차량/.test(text)) return "car";
  return undefined;
}

export function buildOdreNotePlanBridge(
  note: OdreNote,
  basePreferences: TripPreferences,
): OdreNotePlanBridgeResult {
  const zoneId = note.zones[0] ?? basePreferences.zoneId;
  const orderedPlaceIds = resolveOdreNotePlaceIds(note);
  const routeHints = extractOdreNotePlaceHints(note.travelMemo, []);
  const preserveOrder = routeHints.length >= 2 && orderedPlaceIds.length >= 2;
  const planHint =
    getOdreNotePlanHint(note.id, note.lead) ?? {
      lines: [note.lead, ""] as [string, string],
    };

  const travelPurpose = deriveTravelPurposeFromNote(note);
  const themes = deriveThemesFromNote(note, travelPurpose);

  const preferences = enrichPreferencesFromRegionalContext({
    ...basePreferences,
    zoneId,
    travelPurpose,
    ...(note.season ? { season: note.season } : {}),
    themes,
    ...(derivePace(note.travelMemo) ? { pace: derivePace(note.travelMemo) } : {}),
    ...(deriveTransportation(note.travelMemo)
      ? { transportation: deriveTransportation(note.travelMemo) }
      : {}),
  });

  return {
    context: {
      noteId: note.id,
      noteTitle: note.title,
      zoneId,
      orderedPlaceIds,
      preserveOrder,
      planHint,
      lockedTravelPurpose: travelPurpose,
      lockedThemes: themes,
    },
    preferences,
    placeSelections: orderedPlaceIds.map((placeId) => ({ placeId, intent: "must_go" as const })),
  };
}
