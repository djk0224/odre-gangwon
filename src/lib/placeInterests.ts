import type { Place, PlaceCategory, TripTheme } from "@/types/travel";

const CATEGORY_INTERESTS: Record<PlaceCategory, TripTheme[]> = {
  cave: ["history", "nature", "experience"],
  sea: ["nature", "rest"],
  observatory: ["nature", "activity"],
  "cable-car": ["activity"],
  market: ["culture", "experience"],
  trail: ["nature", "rest"],
  restaurant: ["culture", "experience"],
  cafe: ["rest", "culture"],
  experience: ["experience", "culture", "activity"],
};

const TAG_INTEREST_HINTS: Array<{ pattern: RegExp; themes: TripTheme[] }> = [
  { pattern: /동굴|유적|박물|기념/, themes: ["history"] },
  { pattern: /케이블|레저|서핑|래프팅/, themes: ["activity"] },
  { pattern: /카페|힐링/, themes: ["rest"] },
  { pattern: /시장|미식|맛/, themes: ["culture", "experience"] },
];

/** 장소 탐색·추천용 관심 카테고리 (문화·액티비티·역사·체험·자연·휴식) */
export function getPlaceInterestCategories(place: Place): TripTheme[] {
  const base = CATEGORY_INTERESTS[place.category] ?? ["culture"];
  const fromTags = new Set<TripTheme>(base);

  const tagText = [...(place.tags ?? []), place.name, place.description].join(" ");
  for (const hint of TAG_INTEREST_HINTS) {
    if (hint.pattern.test(tagText)) {
      hint.themes.forEach((theme) => fromTags.add(theme));
    }
  }

  return [...fromTags];
}

export function placeMatchesInterestFilter(
  place: Place,
  selectedThemes: TripTheme[],
): boolean {
  if (selectedThemes.length === 0) return true;
  const interests = getPlaceInterestCategories(place);
  return selectedThemes.some((theme) => interests.includes(theme));
}
