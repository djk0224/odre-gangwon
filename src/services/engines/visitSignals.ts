import { getSeasonFromDate } from "@/lib/regionalPreferences";
import type { MidWeatherSnapshot, WeatherSnapshot } from "@/types/externalData";
import type { ItineraryStop, TripPreferences } from "@/types/travel";

export interface VisitCrowdContext {
  timeLabelByPlaceId: Record<string, string>;
  weatherIndoorShift: boolean;
  weatherSummary: string | null;
}

export function buildVisitCrowdContext(options: {
  preferences?: TripPreferences;
  weatherShort?: WeatherSnapshot | null;
  weatherMid?: MidWeatherSnapshot | null;
  stops?: Pick<ItineraryStop, "placeId" | "timeLabel">[];
}): VisitCrowdContext {
  const { weatherShort, weatherMid, stops = [] } = options;

  const rainy = Boolean(
    weatherShort?.skyLabel.includes("비") ||
      weatherShort?.skyLabel.includes("눈") ||
      weatherMid?.landForecast.includes("비"),
  );

  const weatherSummary = [weatherShort?.skyLabel, weatherMid?.landForecast]
    .filter(Boolean)
    .join(" · ");

  return {
    timeLabelByPlaceId: Object.fromEntries(
      stops.map((stop) => [stop.placeId, stop.timeLabel ?? "12:00"]),
    ),
    weatherIndoorShift: rainy,
    weatherSummary: weatherSummary || null,
  };
}

export function isRainyWeatherContext(context: VisitCrowdContext): boolean {
  return context.weatherIndoorShift;
}

export function resolveSeasonLabel(preferences?: TripPreferences): string {
  if (!preferences?.travelDate) return "summer";
  return preferences.season ?? getSeasonFromDate(preferences.travelDate);
}
