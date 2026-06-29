import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import { GANGWON_TRAVEL_ZONE_IDS } from "@/lib/gangwonZoneAvailability";
import { isLodgingPlace } from "@/lib/placeLodging";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { generateItineraryDeterministic } from "@/services/ai/itinerary";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import {
  buildRouteDiningPlan,
  resolveOrderedPlaceIdsForGeneration,
} from "@/services/recommendation/routeDiningPlanner";
import type { TravelDuration, TravelZoneId, TripPreferences } from "@/types/travel";

const EMPTY_SELECTION_DURATIONS: TravelDuration[] = [
  "day-trip",
  "one-night",
  "two-nights",
  "three-nights",
];

function countAttractionStops(stops: { placeId: string }[]): number {
  return stops.filter((stop) => {
    const place = getCatalogPlaces().find((item) => item.id === stop.placeId);
    return place && !isDiningPlace(place) && !isLodgingPlace(place);
  }).length;
}

describe("empty-selection kernel auto-fill (all zones)", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    for (const duration of EMPTY_SELECTION_DURATIONS) {
      it(`${zoneId} · ${duration} · no selection fills a reasonable itinerary`, async () => {
        const preferences: TripPreferences = {
          ...defaultPreferences,
          zoneId,
          duration,
        };
        const selectedPlaceState = {};
        const diningPlan = buildRouteDiningPlan({ preferences, selectedPlaceState });
        assert.equal(diningPlan.tourPlaceIds.length, 0);
        assert.equal(
          resolveOrderedPlaceIdsForGeneration({ preferences, selectedPlaceState }).length,
          0,
        );

        const engineContext = buildEngineContextFromTripStore({
          preferences,
          savedPlaceIds: [],
          recentPlaceIds: [],
          itineraryAnchorPlaceId: null,
          selectedPlaceState,
        });
        const { itinerary } = await generateItineraryDeterministic(preferences, {
          engineContext,
          routeProfile: duration === "day-trip" ? undefined : "fast",
        });

        assert.equal(itinerary.region, zoneId);
        const minStops = duration === "three-nights" ? 4 : 2;
        const minAttractions = duration === "three-nights" ? 6 : 2;
        assert.ok(
          itinerary.stops.length >= minStops,
          `${zoneId} ${duration}: expected at least ${minStops} stops, got ${itinerary.stops.length}`,
        );
        assert.ok(
          countAttractionStops(itinerary.stops) >= minAttractions,
          `${zoneId} ${duration}: expected at least ${minAttractions} attraction stops`,
        );
      });
    }
  }

  it("lodging-only selection falls back to kernel fill instead of dining-only route", async () => {
    const preferences: TripPreferences = {
      ...defaultPreferences,
      zoneId: "samcheok-donghae",
      duration: "day-trip",
    };
    const lodging = getCatalogPlaces().find(
      (place) => place.region === preferences.zoneId && isLodgingPlace(place),
    );
    assert.ok(lodging, "expected a lodging catalog entry in samcheok-donghae");

    const selectedPlaceState = {
      [lodging.id]: { intent: "must_go" as const, updatedAt: "2026-05-27T01:00:00.000Z" },
    };
    const diningPlan = buildRouteDiningPlan({ preferences, selectedPlaceState });
    assert.equal(diningPlan.tourPlaceIds.length, 0);

    const ordered = resolveOrderedPlaceIdsForGeneration({ preferences, selectedPlaceState });
    assert.equal(ordered.length, 0);

    const engineContext = buildEngineContextFromTripStore({
      preferences,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: null,
      selectedPlaceState,
    });
    const { itinerary } = await generateItineraryDeterministic(preferences, {
      engineContext,
      orderedPlaceIds: ordered,
      preserveOrder: true,
    });

    assert.ok(itinerary.stops.length >= 2);
    assert.ok(countAttractionStops(itinerary.stops) >= 2);
  });
});
