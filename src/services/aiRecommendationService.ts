import {
  attractions,
  cafes,
  defaultPreferences,
  regions,
  restaurants,
} from "@/data/mockTravelData";
import type {
  PlaceRecommendations,
  Region,
  RegionId,
  TripPreferences,
} from "@/types/travel";

function rankRegions(preferences: TripPreferences): Region[] {
  const preferred = preferences.regionPreference;

  return [...regions]
    .map((region) => ({
      ...region,
      matchScore: preferred === region.id ? Math.min(region.matchScore + 4, 99) : region.matchScore,
    }))
    .sort((a, b) => b.matchScore - a.matchScore);
}

export async function generateRegionRecommendations(
  preferences: TripPreferences = defaultPreferences,
): Promise<Region[]> {
  // TODO: Replace this mock branch with OpenAI/Gemini provider calls in the API integration phase.
  return rankRegions(preferences);
}

export async function generatePlaceRecommendations(
  regionId: RegionId,
  preferences: TripPreferences = defaultPreferences,
): Promise<PlaceRecommendations> {
  // TODO: Replace this mock branch with OpenAI/Gemini provider calls in the API integration phase.
  void preferences;

  const regionAttractions = attractions.filter((place) => place.region === regionId);
  const regionRestaurants = restaurants.filter((place) => place.region === regionId);
  const regionCafes = cafes.filter((place) => place.region === regionId);

  return {
    attractions: regionAttractions,
    restaurants: regionRestaurants,
    cafes: regionCafes,
    explanation:
      "선택한 지역의 이동 거리를 줄이고, 장소의 분위기와 식사 흐름이 자연스럽게 이어지도록 구성했습니다.",
  };
}
