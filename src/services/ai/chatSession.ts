import {
  companionOptions,
  durationOptions,
  themeOptions,
  transportationOptions,
} from "@/data/mockTravelData";
import {
  getMissingSlots,
  getNextMissingSlot,
  isDefaultTripProfile,
  REQUIRED_CHAT_SLOTS,
  SLOT_LABELS,
  SLOT_QUESTIONS,
  type AiChatSlotKey,
} from "@/lib/aiChatReadiness";
import { detectTravelZoneFromText } from "@/lib/chatZoneDetection";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { getSeasonFromDate } from "@/lib/regionalPreferences";
import type {
  AiChatMessage,
  AiChatSession,
  AiChatSlots,
  AiQuickReply,
} from "@/services/ai/types";
import { defaultPreferences } from "@/data/mockTravelData";
import { enrichPreferencesFromRegionalContext } from "@/lib/regionalPreferences";
import type {
  CompanionType,
  SeasonId,
  Transportation,
  TravelDuration,
  TripPreferences,
  TripTheme,
} from "@/types/travel";

export type AiChatIntent = "plan" | "refine" | "info" | "confirm_go";

import { createInitialChatSession } from "@/lib/aiChatSessionDefaults";

export { createInitialChatSession };

/** 「6코스」·맛집 추천 같은 정보 질문은 plan으로 오인하지 않음 — 「추천」 단독은 제외 */
const PLAN_KEYWORDS =
  /일정|플랜|짜|만들|계획|여행지|루트|동선|1박|당일|맞춤|코스\s*짜|일정\s*짜/i;
const REFINE_KEYWORDS =
  /바꿔|변경|수정|대신|빼|넣|실내|야외|둘째|첫째|덜|더|느리|빠르/i;
const CONFIRM_KEYWORDS = /^(네|응|좋아|그래|확인|진행|일정\s*만들|짜\s*줘|만들어)/i;

const STRONG_PLAN_REQUEST =
  /일정\s*(추천|만들|짜)|맞춤\s*일정|코스\s*(추천|짜|만들)|플랜\s*짜/i;

export function classifyInfoQuery(
  message: string,
): "travel_date" | "weather" | "nature_road" | "lodging" | "dining" | "general" | null {
  const text = message.trim();
  if (STRONG_PLAN_REQUEST.test(text)) return null;

  if (/숙소|펜션|호텔|숙박|머물|게스트하우스|리조트/.test(text) && !/맛|식당|횟/.test(text)) {
    return "lodging";
  }
  if (/맛집|식당|횟|카페|음식|먹을|미식|레스토랑|횟집|한정식/.test(text)) {
    return "dining";
  }

  if (/날씨|기온|비\s*올|우산|맑을|춥|덥|강수/.test(text)) return "weather";
  if (/언제|몇\s*일|날짜|출발일|가는지|떠나|일정\s*언제/.test(text)) {
    return "travel_date";
  }
  if (/네이처|드라이브길|\d\s*코스|6코스|5코스|바다\s*드라이브/.test(text)) {
    return "nature_road";
  }
  if (/뭐야|무엇|알려|설명|어디|어떻게|궁금|뭔지/.test(text)) return "general";

  return null;
}

export function isLikelySlotAnswer(message: string): boolean {
  const text = message.trim();
  return /^(당일치기|1박\s*2일|연인|커플|혼자|친구|가족|부모님|차량|자차|대중교통|바다·항구|동굴·전망|로컬\s*미식|액티비티|휴식|봄|여름|가을|겨울)$/.test(
    text,
  );
}

export function detectIntent(
  message: string,
  history: AiChatMessage[],
  session: AiChatSession,
): AiChatIntent {
  const text = message.trim();

  if (CONFIRM_KEYWORDS.test(text) && session.phase === "confirm") {
    return "confirm_go";
  }

  if (session.phase === "propose" && REFINE_KEYWORDS.test(text)) {
    return "refine";
  }

  if (session.lastProposedPlaceIds.length > 0 && REFINE_KEYWORDS.test(text)) {
    return "refine";
  }

  if (isLikelySlotAnswer(text)) {
    return "plan";
  }

  if (classifyInfoQuery(text)) {
    return "info";
  }

  if (PLAN_KEYWORDS.test(text) && !/\d\s*코스|네이처|드라이브길/.test(text)) {
    return "plan";
  }

  const hasPlanHistory = history.some(
    (m) => m.role === "assistant" && /1일차|2일차|일정/.test(m.content),
  );
  if (hasPlanHistory && REFINE_KEYWORDS.test(text)) {
    return "refine";
  }

  return "info";
}

/** 이전 user 발화에서 슬롯 힌트 누적 (멀티턴 메모리) */
export function mergeSlotsFromHistory(history: AiChatMessage[]): Partial<AiChatSlots> {
  const patch: Partial<AiChatSlots> = {};
  for (const message of history) {
    if (message.role !== "user") continue;
    Object.assign(patch, mergeSlotsFromMessage(message.content));
  }
  return patch;
}

export function mergeSlotsFromMessage(text: string): Partial<AiChatSlots> {
  const patch: Partial<AiChatSlots> = {};
  const lower = text.toLowerCase();

  if (/3박\s*4일|3박4일|나흘/.test(text)) patch.duration = "three-nights";
  else if (/2박\s*3일|2박3일|사흘/.test(text)) patch.duration = "two-nights";
  else if (/1박|1박2일|하룻밤|이틀/.test(text)) patch.duration = "one-night";
  if (/당일|당일치기|하루/.test(text) && !/박/.test(text)) patch.duration = "day-trip";

  if (/커플|연인|둘이|2인/.test(text)) patch.companion = "couple";
  if (/혼자|솔로|나홀로/.test(text)) patch.companion = "solo";
  if (/친구/.test(text)) patch.companion = "friends";
  if (/가족|아이/.test(text)) patch.companion = "family";
  if (/부모|효도/.test(text)) patch.companion = "parents";

  if (/대중교통|버스|기차|KTX|열차/.test(text)) patch.transportation = "public-transit";
  if (/자차|차량|렌트|운전/.test(text)) patch.transportation = "car";

  const detectedThemes: TripTheme[] = [];
  if (/동굴|전망|역사|유적/.test(text)) detectedThemes.push("history");
  if (/바다|항구|해안|겨울\s*바다|자연/.test(text)) detectedThemes.push("nature");
  if (/맛집|미식|횟집|식당|시장|문화/.test(text)) detectedThemes.push("culture");
  if (/액티|케이블|레저/.test(text)) detectedThemes.push("activity");
  if (/체험|만들기|마을/.test(text)) detectedThemes.push("experience");
  if (/휴식|힐링|느긋|카페/.test(text)) detectedThemes.push("rest");
  if (detectedThemes.length > 0) {
    patch.themes = [...new Set(detectedThemes)];
  }

  if (/봄/.test(text)) patch.season = "spring";
  if (/여름/.test(text) && !/겨울/.test(text)) patch.season = "summer";
  if (/가을/.test(text)) patch.season = "autumn";
  if (/겨울/.test(text)) patch.season = "winter";

  const isoDate = text.match(/20\d{2}-\d{2}-\d{2}/);
  if (isoDate) {
    patch.travelDate = isoDate[0];
    patch.season = getSeasonFromDate(isoDate[0]);
  }

  const koreanDate = text.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (koreanDate && !patch.travelDate) {
    const year = new Date().getFullYear();
    const month = String(koreanDate[1]).padStart(2, "0");
    const day = String(koreanDate[2]).padStart(2, "0");
    const travelDate = `${year}-${month}-${day}`;
    patch.travelDate = travelDate;
    patch.season = getSeasonFromDate(travelDate);
  }

  const detectedZone = detectTravelZoneFromText(text);
  if (detectedZone) patch.zoneId = detectedZone;

  const numMatch = text.match(/(\d+)\s*명/);
  if (numMatch) patch.travelers = Number.parseInt(numMatch[1], 10);

  if (lower.includes("three-nights") || lower.includes("3-night")) {
    patch.duration = "three-nights";
  }
  if (lower.includes("two-nights") || lower.includes("2-night")) {
    patch.duration = "two-nights";
  }
  if (lower.includes("one-night")) patch.duration = "one-night";
  if (lower.includes("day-trip")) patch.duration = "day-trip";

  return patch;
}

export function applySlotPatch(
  session: AiChatSession,
  patch: Partial<AiChatSlots>,
): AiChatSession {
  const slots = { ...session.slots, ...patch };
  if (slots.travelDate && !slots.season) {
    slots.season = getSeasonFromDate(slots.travelDate);
  }
  return { ...session, slots };
}

export function mergeTripStoreIntoSlots(
  slots: AiChatSlots,
  storePrefs: TripPreferences,
  trustStore: boolean,
): AiChatSlots {
  if (!trustStore) return slots;

  return {
    duration: slots.duration ?? storePrefs.duration,
    companion: slots.companion ?? storePrefs.companion,
    transportation: slots.transportation ?? storePrefs.transportation,
    themes: slots.themes?.length ? slots.themes : storePrefs.themes,
    travelDate: slots.travelDate ?? storePrefs.travelDate,
    season: slots.season ?? storePrefs.season,
    travelers: slots.travelers ?? storePrefs.travelers,
    pace: slots.pace ?? storePrefs.pace,
    zoneId: slots.zoneId ?? storePrefs.zoneId,
  };
}

export function formatSlotsSummary(slots: AiChatSlots): string {
  const parts: string[] = [];

  if (slots.duration) {
    const label = durationOptions.find((o) => o.id === slots.duration)?.label;
    if (label) parts.push(label);
  }
  if (slots.companion) {
    const label = companionOptions.find((o) => o.id === slots.companion)?.label;
    if (label) parts.push(label);
  }
  if (slots.transportation) {
    const label = transportationOptions.find((o) => o.id === slots.transportation)?.label;
    if (label) parts.push(label);
  }
  if (slots.themes?.length) {
    const labels = slots.themes
      .map((theme) => themeOptions.find((o) => o.id === theme)?.label)
      .filter(Boolean);
    if (labels.length > 0) parts.push(labels.join(" · "));
  }
  if (slots.travelDate) parts.push(slots.travelDate);
  else if (slots.season) {
    const seasonLabels: Record<SeasonId, string> = {
      spring: "봄",
      summer: "여름",
      autumn: "가을",
      winter: "겨울",
    };
    parts.push(seasonLabels[slots.season]);
  }

  return parts.length > 0 ? parts.join(" · ") : "조건을 아직 모르고 있어요";
}

function quickRepliesForSlot(slot: AiChatSlotKey): AiQuickReply[] {
  switch (slot) {
    case "duration":
      return durationOptions.map((o) => ({
        id: `duration-${o.id}`,
        label: o.label,
        slotPatch: { duration: o.id },
      }));
    case "companion":
      return companionOptions.map((o) => ({
        id: `companion-${o.id}`,
        label: o.label,
        slotPatch: { companion: o.id },
      }));
    case "transportation":
      return transportationOptions.map((o) => ({
        id: `transport-${o.id}`,
        label: o.label,
        slotPatch: { transportation: o.id },
      }));
    case "themes":
      return themeOptions.map((o) => ({
        id: `theme-${o.id}`,
        label: o.label,
        slotPatch: { themes: [o.id] },
      }));
    case "travelDate":
    case "season":
      return [
        { id: "season-winter", label: "겨울", slotPatch: { season: "winter" } },
        { id: "season-spring", label: "봄", slotPatch: { season: "spring" } },
        { id: "season-summer", label: "여름", slotPatch: { season: "summer" } },
        { id: "season-autumn", label: "가을", slotPatch: { season: "autumn" } },
      ];
    default:
      return [];
  }
}

export function buildClarifyQuickReplies(
  missing: AiChatSlotKey[],
  nextSlot: AiChatSlotKey | null,
): AiQuickReply[] {
  if (!nextSlot) return [];
  return quickRepliesForSlot(nextSlot);
}

export function buildConfirmQuickReplies(): AiQuickReply[] {
  return [
    { id: "confirm-go", label: "네, 일정 짜줘", action: "confirm_go" },
    { id: "confirm-edit", label: "조건 수정", action: "reset_confirm" },
  ];
}

export function buildClarifyBlocks(
  session: AiChatSession,
  missing: AiChatSlotKey[],
): { headline: string; tips: string[] } {
  const next = getNextMissingSlot(missing);
  const summary = formatSlotsSummary(session.slots);

  if (next) {
    return {
      headline: "맞춤 일정을 위해 몇 가지만 확인할게요.",
      tips: [
        `지금까지: ${summary}`,
        SLOT_QUESTIONS[next],
      ],
    };
  }

  return {
    headline: "조건을 조금만 더 알려 주세요.",
    tips: [SLOT_QUESTIONS.travelDate],
  };
}

export function buildConfirmBlocks(session: AiChatSession): {
  headline: string;
  tips: string[];
} {
  const summary = formatSlotsSummary(session.slots);
  const zoneLabel =
    (session.slots.zoneId && travelZoneShortLabels[session.slots.zoneId]) ||
    "선택하신 권역";
  return {
    headline: "이 조건으로 실행 일정을 만들까요?",
    tips: [
      summary,
      `확인해 주시면 ${zoneLabel} 맞춤 코스를 제안할게요.`,
    ],
  };
}

export function sessionToTripPreferences(
  slots: AiChatSlots,
  fallback: TripPreferences = defaultPreferences,
): TripPreferences {
  const travelDate = slots.travelDate ?? fallback.travelDate;
  const season = slots.season ?? getSeasonFromDate(travelDate);

  return enrichPreferencesFromRegionalContext({
    travelDate,
    travelers: slots.travelers ?? fallback.travelers,
    duration: (slots.duration ?? fallback.duration) as TravelDuration,
    themes: slots.themes?.length ? slots.themes : fallback.themes,
    transportation: (slots.transportation ?? fallback.transportation) as Transportation,
    companion: (slots.companion ?? fallback.companion) as CompanionType,
    pace: slots.pace ?? fallback.pace,
    season,
    travelPurpose: fallback.travelPurpose,
    zoneId: slots.zoneId ?? fallback.zoneId,
  });
}

export function advanceSessionAfterMessage(
  session: AiChatSession,
  message: string,
  storePrefs: TripPreferences,
  intent: AiChatIntent,
): AiChatSession {
  let next = applySlotPatch(session, mergeSlotsFromMessage(message));

  const trustStore =
    intent !== "info" && intent !== "plan" && !isDefaultTripProfile(storePrefs);
  next = {
    ...next,
    slots: mergeTripStoreIntoSlots(next.slots, storePrefs, trustStore),
  };

  if (intent === "confirm_go") {
    return { ...next, mode: "planning", confirmed: true, phase: "propose" };
  }

  const missing = getMissingSlots(next.slots);

  if (intent === "plan") {
    if (missing.length > 0) {
      const nextSlot = getNextMissingSlot(missing);
      const asked = nextSlot && !next.askedSlots.includes(nextSlot)
        ? [...next.askedSlots, nextSlot]
        : next.askedSlots;
      return {
        ...next,
        mode: "planning",
        phase: "clarify",
        confirmed: false,
        askedSlots: asked,
      };
    }
    if (!next.confirmed) {
      return { ...next, mode: "planning", phase: "confirm", confirmed: false };
    }
    return { ...next, mode: "planning", phase: "propose" };
  }

  if (intent === "refine") {
    return { ...next, phase: "refine", confirmed: true };
  }

  if (intent === "info") {
    const preservePhase =
      session.phase === "clarify" ||
      session.phase === "confirm" ||
      session.phase === "propose";
    return { ...next, phase: preservePhase ? session.phase : "info" };
  }

  return { ...next, phase: "info" };
}

export { REQUIRED_CHAT_SLOTS, SLOT_LABELS, getMissingSlots, getNextMissingSlot };
