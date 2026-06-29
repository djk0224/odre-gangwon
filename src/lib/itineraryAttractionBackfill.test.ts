import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import {
  backfillAttractionPlaceIds,
  countAttractionDeficitByDay,
} from "@/lib/itineraryAttractionBackfill";
import { splitPlaceIdsByDayCaps } from "@/lib/itineraryDayPlanner";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { getMaxAttractionStopsForDay, getMaxAttractionStopsForTrip } from "@/lib/travelDuration";
import { buildItineraryFromPlaceIds } from "@/services/itineraryService";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import {
  orderTourPlaceIdsForItinerary,
} from "@/services/recommendation/routeDiningPlanner";
import type { TripPreferences } from "@/types/travel";

describe("backfillAttractionPlaceIds", () => {
  const preferences: TripPreferences = {
    ...defaultPreferences,
    zoneId: "gangneung-yangyang",
    duration: "two-nights",
    pace: "balanced",
  };

  before(async () => {
    await loadFullGangwonCatalog();
  });

  it("5곳 선택 시 2박3일 균형 상한(7곳)과 Day별 2+3+2를 채운다", async () => {
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const selectedPlaceState = Object.fromEntries(
      tourPlaces.slice(0, 5).map((place, index) => [
        place.id,
        { intent: "interested" as const, updatedAt: `2026-06-14T0${index}:00:00Z` },
      ]),
    );
    const tourIds = orderTourPlaceIdsForItinerary(selectedPlaceState, preferences);
    assert.equal(tourIds.length, 5);

    const engineContext = buildEngineContextFromTripStore({
      preferences,
      selectedPlaceState,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: null,
    });

    assert.ok(countAttractionDeficitByDay(tourIds, preferences) > 0);

    const backfilled = await backfillAttractionPlaceIds(tourIds, preferences, engineContext);
    assert.equal(backfilled.length, getMaxAttractionStopsForTrip(preferences));

    const chunks = splitPlaceIdsByDayCaps(backfilled, preferences);
    assert.deepEqual(
      chunks.map((chunk) => chunk.length),
      [
        getMaxAttractionStopsForDay(1, "balanced", "two-nights"),
        getMaxAttractionStopsForDay(2, "balanced", "two-nights"),
        getMaxAttractionStopsForDay(3, "balanced", "two-nights"),
      ],
    );
  });

  it("부분 선택 일정 생성 시 Day3에도 관광지가 들어간다", async () => {
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const selectedPlaceState = Object.fromEntries(
      tourPlaces.slice(0, 5).map((place, index) => [
        place.id,
        { intent: "must_go" as const, updatedAt: `2026-06-14T0${index}:00:00Z` },
      ]),
    );
    const engineContext = buildEngineContextFromTripStore({
      preferences,
      selectedPlaceState,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: null,
    });
    const tourIds = orderTourPlaceIdsForItinerary(selectedPlaceState, preferences);

    const itinerary = await buildItineraryFromPlaceIds(
      tourIds,
      preferences,
      undefined,
      engineContext,
      null,
    );

    const day3Attractions = itinerary.stops.filter((stop) => {
      if (stop.day !== 3) return false;
      const place = getCatalogPlaces().find((item) => item.id === stop.placeId);
      return place && !isDiningPlace(place) && !isLodgingPlace(place);
    }).length;

    assert.ok(
      day3Attractions >= getMaxAttractionStopsForDay(3, "balanced", "two-nights"),
      `Day3 attractions expected >= 2, got ${day3Attractions}`,
    );
    assert.match(itinerary.aiExplanation ?? "", /AI가 권역 추천으로 채워/);
  });
});
