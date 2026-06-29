import type { LucideIcon } from "lucide-react";
import { Footprints, Map, Sparkles, Store, Trees } from "lucide-react";
import { isZoneCatalogExecutable } from "@/lib/gangwonZoneAvailability";
import type {
  SeasonId,
  TravelPurposeId,
  TravelZoneId,
  TripTheme,
} from "@/types/travel";

export type { SeasonId };

export interface RegionalPillar {
  id: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}

export interface SeasonTheme {
  id: SeasonId;
  label: string;
  hint: string;
}

export const regionalPillars: RegionalPillar[] = [
  { id: "nature-road", label: "네이처로드", shortLabel: "드라이브", icon: Map },
  { id: "leisure", label: "트레일·레저", shortLabel: "액티비티", icon: Footprints },
  { id: "zones", label: "권역 테마", shortLabel: "권역", icon: Trees },
  { id: "local", label: "로컬 상권", shortLabel: "로컬", icon: Store },
  { id: "execution", label: "실행·인증", shortLabel: "예약·QR", icon: Sparkles },
];

export const seasonThemes: SeasonTheme[] = [
  { id: "spring", label: "봄", hint: "벚꽃·호수·산책" },
  { id: "summer", label: "여름", hint: "동해안·서핑·계곡" },
  { id: "autumn", label: "가을", hint: "단풍·드라이브·시장" },
  { id: "winter", label: "겨울", hint: "스키·눈꽃·온천" },
];

export const gangwonPassTeaser = {
  id: "pass-east-sea",
  name: "동해안 혜택 연동",
  subtitle: "강원패스·강원상품권 일정 연동",
  benefits: ["전망대·체험 할인", "로컬 카페 쿠폰", "제휴 예약 연동"],
  priceHint: "무료 · 공식 혜택 연동",
};

/** Demo default aligned with defaultPreferences travel date (June). */
export const defaultSeasonId: SeasonId = "summer";

export interface TravelZoneOption {
  id: TravelZoneId;
  label: string;
  intent: string;
  cities: string;
  available: boolean;
  gradient: string;
  /** 권역 대표 이미지 (GW 카탈로그·zone-hero-images.json) */
  imageUrl?: string;
}

const travelZoneDefinitions: Omit<TravelZoneOption, "available">[] = [
  {
    id: "samcheok-donghae",
    label: "삼척·동해",
    intent: "동해안·동굴·드라이브",
    cities: "삼척 · 동해",
    gradient: "from-pine-deep via-pine to-mist",
  },
  {
    id: "gangneung-yangyang",
    label: "강릉·양양",
    intent: "바다·카페·서핑",
    cities: "강릉 · 양양",
    gradient: "from-ink via-pine-deep to-mist",
  },
  {
    id: "sokcho-goseong",
    label: "속초·고성",
    intent: "해변·감성·DMZ 인근",
    cities: "속초 · 고성",
    gradient: "from-pine-deep to-sand",
  },
  {
    id: "pyeongchang-jeongseon",
    label: "평창·정선",
    intent: "산악·힐링·스키",
    cities: "평창 · 횡성",
    gradient: "from-pine-deep via-stone-warm/30 to-mist",
  },
  {
    id: "yeongwol-jeongseon",
    label: "영월·정선",
    intent: "레저·동강·액티비티",
    cities: "영월 · 정선 · 태백",
    gradient: "from-ink to-pine",
  },
  {
    id: "cheorwon-dmz",
    label: "철원·접경",
    intent: "역사·DMZ·평화",
    cities: "철원 · 화천 · 인제",
    gradient: "from-ink via-pine-deep to-ivory",
  },
  {
    id: "wonju-chuncheon",
    label: "원주·춘천",
    intent: "미식·호수·시장",
    cities: "원주 · 춘천",
    gradient: "from-pine to-sand",
  },
];

export const travelZones: TravelZoneOption[] = travelZoneDefinitions.map((zone) => ({
  ...zone,
  /** @deprecated 런타임에는 `isTravelZoneAvailable(zone.id)` 사용 */
  available: true,
}));

export { isTravelZoneAvailable } from "@/lib/gangwonZoneAvailability";

export function getTravelZones(): TravelZoneOption[] {
  return travelZoneDefinitions.map((zone) => ({
    ...zone,
    available: isZoneCatalogExecutable(zone.id),
  }));
}

export const travelPurposeOptions: Array<{
  id: TravelPurposeId;
  label: string;
  description: string;
  suggestedTheme: TripTheme;
}> = [
  {
    id: "drive",
    label: "드라이브",
    description: "네이처로드·해안 도로 중심",
    suggestedTheme: "nature",
  },
  {
    id: "leisure",
    label: "레저·트레일",
    description: "체험·트레킹·액티비티",
    suggestedTheme: "activity",
  },
  {
    id: "coast",
    label: "바다·감성",
    description: "항구·전망·카페",
    suggestedTheme: "nature",
  },
  {
    id: "mountain",
    label: "산악·힐링",
    description: "느린 산책·휴식",
    suggestedTheme: "rest",
  },
  {
    id: "food",
    label: "미식·시장",
    description: "로컬 식사·전통시장",
    suggestedTheme: "culture",
  },
  {
    id: "workation",
    label: "워케이션",
    description: "장기 체류·여유 일정",
    suggestedTheme: "rest",
  },
];

/** 일정·AI 플래닝 위저드용 — 장기 체류 워케이션 제외 */
export const itineraryTravelPurposeOptions = travelPurposeOptions.filter(
  (option) => option.id !== "workation",
);

export const purposeThemeMap: Record<TravelPurposeId, TripTheme> = Object.fromEntries(
  travelPurposeOptions.map((o) => [o.id, o.suggestedTheme]),
) as Record<TravelPurposeId, TripTheme>;

export const seasonThemeBias: Record<SeasonId, TripTheme> = {
  spring: "rest",
  summer: "nature",
  autumn: "culture",
  winter: "rest",
};

export const stampMilestones = [
  { count: 3, reward: "로컬 카페 ₩3,000 쿠폰" },
  { count: 5, reward: "강원 굿즈 추첨 응모" },
  { count: 7, reward: "프리미엄 패스 10% 할인" },
] as const;

export function getTravelZone(id: TravelZoneId) {
  return getTravelZones().find((zone) => zone.id === id);
}
