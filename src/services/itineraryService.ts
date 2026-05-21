import { itineraryExamples } from "@/data/mockTravelData";
import type { Itinerary, Place, RegionId, TripPreferences } from "@/types/travel";

export async function generateItinerary(
  regionId: RegionId,
  selectedPlaces: Place[],
  preferences?: TripPreferences,
): Promise<Itinerary> {
  // TODO: Replace this mock branch with OpenAI/Gemini itinerary generation in the API integration phase.
  void preferences;

  const template =
    itineraryExamples.find((itinerary) => itinerary.region === regionId) ?? itineraryExamples[0];

  if (selectedPlaces.length === 0) {
    return template;
  }

  return {
    ...template,
    title: `${selectedPlaces[0].name}에서 시작하는 ${template.title}`,
    stops: selectedPlaces.map((place, index) => ({
      id: `generated-stop-${place.id}`,
      order: index + 1,
      placeName: place.name,
      category: place.category,
      timeLabel: `${10 + index}:00`,
      duration: place.estimatedDuration,
      note: place.recommendationReason,
      coordinates: place.coordinates,
    })),
    timeline: selectedPlaces.map((place, index) => ({
      id: `generated-timeline-${place.id}`,
      time: `${10 + index}:00`,
      title: place.name,
      description: place.recommendationReason,
      duration: place.estimatedDuration,
    })),
  };
}
