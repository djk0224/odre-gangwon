import type { CareAlert, Region, TripPreferences } from "@/types/travel";

export const mvpRegion: Region = {
  id: "samcheok-donghae",
  name: "삼척·동해",
  englishName: "Samcheok · Donghae",
  headline: "동해안의 굴·항구·케이블카를 한 흐름으로 실행하는 여행",
  description:
    "예약이 필요한 동굴과 케이블카, 항구 산책, 로컬 식사를 시간순으로 엮고 혼잡·QR·당일 케어까지 이어지는 MVP 권역입니다.",
  mood: "coastal execution",
  tags: ["동해안", "예약", "혼잡", "QR", "당일케어"],
  gradient: "from-pine-deep via-pine to-mist",
  coordinates: { lat: 37.449, lng: 129.165 },
};

export const defaultPreferences: TripPreferences = {
  travelDate: "2026-06-14",
  travelers: 2,
  duration: "day-trip",
  themes: ["nature", "culture"],
  transportation: "car",
  companion: "couple",
  pace: "balanced",
  season: "summer",
  travelPurpose: "coast",
  zoneId: "samcheok-donghae",
};

export const themeOptions = [
  { id: "culture" as const, label: "문화", description: "전시·시장·로컬 문화" },
  { id: "activity" as const, label: "액티비티", description: "케이블카·레저·액션" },
  { id: "history" as const, label: "역사", description: "유적·동굴·기념" },
  { id: "experience" as const, label: "체험", description: "만들기·체험 마을" },
  { id: "nature" as const, label: "자연", description: "바다·산책·전망" },
  { id: "rest" as const, label: "휴식", description: "느린 동선·카페" },
] as const;

export const transportationOptions = [
  { id: "car" as const, label: "차량", description: "이동 시간을 줄이고 예약 시간을 지킵니다." },
  {
    id: "public-transit" as const,
    label: "대중교통",
    description: "버스·기차 연계를 고려한 동선으로 구성합니다.",
  },
];

export const companionOptions = [
  { id: "solo" as const, label: "혼자" },
  { id: "couple" as const, label: "연인" },
  { id: "friends" as const, label: "친구" },
  { id: "family" as const, label: "가족" },
  { id: "parents" as const, label: "부모님과" },
];

export const paceOptions = [
  { id: "relaxed" as const, label: "여유", description: "체류 시간을 늘리고 이동을 줄입니다." },
  { id: "balanced" as const, label: "균형", description: "대표 장소와 식사를 고르게 배치합니다." },
  { id: "packed" as const, label: "알찬", description: "핵심 장소를 촘촘히 연결합니다." },
];

export const durationOptions = [
  { id: "day-trip" as const, label: "당일치기" },
  { id: "one-night" as const, label: "1박 2일" },
  { id: "two-nights" as const, label: "2박 3일" },
  { id: "three-nights" as const, label: "3박 4일" },
];

export const defaultCareAlerts: CareAlert[] = [
  {
    id: "care-departure",
    type: "departure",
    title: "오늘 출발 준비",
    message: "09:20까지 삼척 시내로 이동하면 첫 예약 시간에 여유 있게 도착할 수 있습니다.",
    actionLabel: "이동 시간 보기",
    priority: "medium",
  },
];
