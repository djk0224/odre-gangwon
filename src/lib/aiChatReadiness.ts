import { defaultPreferences } from "@/data/mockTravelData";
import type { AiChatSlots } from "@/services/ai/types";
import type { TripPreferences } from "@/types/travel";
import { tripThemesEqual } from "@/lib/tripThemes";

export type { AiChatSlots };

export type AiChatSlotKey =
  | "duration"
  | "companion"
  | "transportation"
  | "themes"
  | "travelDate"
  | "season";

export const REQUIRED_CHAT_SLOTS: AiChatSlotKey[] = [
  "duration",
  "companion",
  "transportation",
  "themes",
];

/** 날짜 또는 계절 중 하나는 있어야 함 */
export const DATE_OR_SEASON_SLOTS: AiChatSlotKey[] = ["travelDate", "season"];

export function isDefaultTripProfile(preferences: TripPreferences): boolean {
  return (
    preferences.travelDate === defaultPreferences.travelDate &&
    preferences.travelers === defaultPreferences.travelers &&
    preferences.duration === defaultPreferences.duration &&
    tripThemesEqual(preferences.themes, defaultPreferences.themes) &&
    preferences.transportation === defaultPreferences.transportation &&
    preferences.companion === defaultPreferences.companion &&
    preferences.pace === defaultPreferences.pace &&
    preferences.season === defaultPreferences.season &&
    preferences.travelPurpose === defaultPreferences.travelPurpose &&
    preferences.zoneId === defaultPreferences.zoneId
  );
}

export function getMissingSlots(slots: AiChatSlots): AiChatSlotKey[] {
  const missing: AiChatSlotKey[] = [];

  for (const key of REQUIRED_CHAT_SLOTS) {
    if (key === "themes") {
      if (!slots.themes?.length) missing.push(key);
      continue;
    }
    if (!slots[key]) missing.push(key);
  }

  if (!slots.travelDate && !slots.season) {
    missing.push("travelDate");
  }

  return missing;
}

export function getNextMissingSlot(missing: AiChatSlotKey[]): AiChatSlotKey | null {
  const order: AiChatSlotKey[] = [
    "duration",
    "companion",
    "transportation",
    "themes",
    "travelDate",
  ];
  return order.find((key) => missing.includes(key)) ?? null;
}

export const SLOT_QUESTIONS: Record<AiChatSlotKey, string> = {
  duration: "며칠 일정인가요? 당일치기와 1박 2일 중 골라 주세요.",
  companion: "누구와 함께 가시나요?",
  transportation: "이동 수단은 차량인가요, 대중교통인가요?",
  themes: "관심 카테고리를 골라 주세요. (문화·액티비티·역사·체험·자연·휴식, 복수 선택 가능)",
  travelDate: "언제 떠나시나요? 날짜나 계절(봄·여름·가을·겨울)을 알려 주세요.",
  season: "여행 시기(계절)를 알려 주세요.",
};

export const SLOT_LABELS: Record<AiChatSlotKey, string> = {
  duration: "일정",
  companion: "동행",
  transportation: "이동",
  themes: "카테고리",
  travelDate: "날짜",
  season: "계절",
};
