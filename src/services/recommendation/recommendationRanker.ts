import { parseEstimatedDurationMinutes } from "@/services/itineraryEditService";
import type { SelectionIntent, TripPreferences } from "@/types/travel";
import type { RecommendationCandidate } from "@/services/recommendation/candidateGenerator";

export interface RankedRecommendation extends RecommendationCandidate {
  score: number;
  badges: string[];
  emotionLine: string;
}

function hasTheme(preferences: TripPreferences, keyword: string): boolean {
  return preferences.themes.some((theme) => theme.includes(keyword));
}

function inferEmotionLine(name: string): string {
  if (/해변|비치|영금정|전망/.test(name)) return "바람과 풍경을 천천히 즐기기 좋은 장소";
  if (/시장|식당|카페/.test(name)) return "강원 로컬 무드를 가볍게 채우기 좋은 코스";
  if (/관|전시|박물/.test(name)) return "날씨 영향이 적어 일정 안정성이 높은 선택지";
  return "선택한 여행 분위기와 자연스럽게 어울리는 장소";
}

function buildBadges(
  preferences: TripPreferences,
  durationMinutes: number,
  intent?: SelectionIntent,
): string[] {
  const badges: string[] = [];
  if (hasTheme(preferences, "nature")) badges.push("자연테마");
  if (hasTheme(preferences, "rest")) badges.push("여유추천");
  if (durationMinutes <= 90) badges.push("짧게들르기");
  if (preferences.transportation === "public-transit") badges.push("대중교통고려");
  if (intent === "must_go") badges.push("꼭갈래요");
  return badges.slice(0, 3);
}

export function rankRecommendations(
  candidates: RecommendationCandidate[],
  preferences: TripPreferences,
  selectedIntents: Record<string, SelectionIntent> = {},
): RankedRecommendation[] {
  return candidates
    .map((candidate) => {
      const stayMinutes = parseEstimatedDurationMinutes(candidate.place.estimatedDuration);
      const themeFit = candidate.place.tags.some((tag) =>
        preferences.themes.some((theme) => tag.includes(theme)),
      )
        ? 0.35
        : 0.15;
      const paceFit =
        preferences.pace === "relaxed" ? (stayMinutes <= 100 ? 0.2 : 0.1) : 0.15;
      const reservationFit = candidate.place.reservationRequired ? 0.1 : 0.2;
      const partnerFit = candidate.place.partner ? 0.15 : 0.05;
      const score = themeFit + paceFit + reservationFit + partnerFit;
      return {
        ...candidate,
        score,
        badges: buildBadges(preferences, stayMinutes, selectedIntents[candidate.place.id]),
        emotionLine: inferEmotionLine(candidate.place.name),
      };
    })
    .sort((a, b) => b.score - a.score);
}
