import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import {
  fetchMidWeatherForecast,
  fetchShortWeatherForecast,
} from "@/services/externalDataClient";
import type { AiGenerationContext } from "@/services/ai/types";
import type { Place, TripPreferences } from "@/types/travel";

/** LLM 일정 프롬프트 상한 — 권역 전체(100+)를 넣으면 응답·타임아웃이 길어짐 */
const AI_ITINERARY_CATALOG_LIMIT = 64;

function pickPlacesForItineraryAi(zoneId?: TripPreferences["zoneId"]): Place[] {
  const zonePlaces = getCatalogPlaces().filter(
    (place) => (zoneId ? place.region === zoneId : true) && !isLodgingPlace(place),
  );
  if (zonePlaces.length <= AI_ITINERARY_CATALOG_LIMIT) {
    return zonePlaces;
  }

  const score = (place: Place) => {
    let value = 0;
    if (place.partner && place.reservationRequired && place.qrAvailable) value += 120;
    else if (place.partner && place.reservationRequired) value += 90;
    else if (place.partner) value += 50;
    if (!isDiningPlace(place) && !isLodgingPlace(place)) value += 12;
    return value;
  };

  return [...zonePlaces]
    .sort((a, b) => score(b) - score(a))
    .slice(0, AI_ITINERARY_CATALOG_LIMIT);
}

export function buildPlaceCatalogForAi(zoneId?: TripPreferences["zoneId"]) {
  return pickPlacesForItineraryAi(zoneId).map((place) => ({
      id: place.id,
      name: place.name,
      category: place.category,
      description: place.description,
      tags: place.tags,
      reservationRequired: place.reservationRequired,
      partner: place.partner,
      duration: place.estimatedDuration,
      signature: place.signature,
    }));
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<null>((resolve) => {
        timer = setTimeout(() => resolve(null), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function buildWeatherSummaryForAi(): Promise<string | null> {
  try {
    const [shortForecast, midForecast] = await Promise.all([
      withTimeout(fetchShortWeatherForecast(), 6_000),
      withTimeout(fetchMidWeatherForecast(), 6_000),
    ]);
    if (!shortForecast && !midForecast) return null;
    const parts: string[] = [];
    if (shortForecast) {
      parts.push(
        `단기 ${shortForecast.temperatureC ?? "—"}°C ${shortForecast.skyLabel}${
          shortForecast.precipitationMm != null ? ` · 강수 ${shortForecast.precipitationMm}mm` : ""
        }`,
      );
    }
    if (midForecast?.landForecast) {
      parts.push(`중기 ${midForecast.landForecast}`);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  } catch {
    return null;
  }
}

export function buildPreferencesPrompt(ctx: AiGenerationContext) {
  const anchor = ctx.anchorPlaceId ? getCatalogPlaceById(ctx.anchorPlaceId) : undefined;
  return {
    preferences: ctx.preferences,
    anchorPlace: anchor
      ? { id: anchor.id, name: anchor.name, category: anchor.category }
      : null,
    weatherSummary: ctx.weatherSummary ?? null,
  };
}
