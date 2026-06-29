import type { TripPreferences } from "@/types/travel";

/** 피치·시연용 고정 데모 시나리오 (삼척·동해 2인 당일) */
export const pitchDemoPreferences: TripPreferences = {
  travelDate: "2026-06-14",
  travelers: 2,
  duration: "day-trip",
  themes: ["history", "nature"],
  transportation: "car",
  companion: "couple",
  pace: "balanced",
  season: "summer",
  travelPurpose: "coast",
  zoneId: "samcheok-donghae",
};

export const pitchDemoPublicTransitPreferences: TripPreferences = {
  ...pitchDemoPreferences,
  transportation: "public-transit",
};

export const pitchDemoCopy = {
  onboardingTitle: "삼척·동해, 실행까지 이어지는 여행",
  onboardingBody:
    "오드래강원 브랜드 스토리와 삼척·동해 실행 루프 데모입니다. 피치 시나리오로 2분 안에 전체 흐름을 확인할 수 있습니다.",
  homeBannerTitle: "피치 데모 · 삼척·동해 2인 당일",
  homeBannerBody:
    "환선굴 → 케이블카 → 항구 식사 → 예약·QR → 케어(날씨·버스)까지 한 번에 시연합니다.",
  homeCta: "피치 데모 일정 만들기",
  generatingTitle: "AI가 실행 일정을 설계합니다",
  generatingSubtitle: "예약 명소 · 이동 · 로컬 상권 · 당일 케어 포인트를 반영 중입니다.",
  itineraryEyebrow: "Pitch Demo",
  careHeadline: "당일 실행 케어",
  careWeatherNote: "단기·중기 예보를 함께 보고 일정을 조정하세요.",
} as const;

export const PITCH_DEMO_SESSION_KEY = "odre-pitch-demo-started";
