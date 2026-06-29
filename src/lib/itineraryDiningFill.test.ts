import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import { GANGWON_TRAVEL_ZONE_IDS } from "@/lib/gangwonZoneAvailability";
import { scheduleItineraryFromPlaceIds } from "@/lib/itineraryDayPlanner";
import { isDiningCategory, isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { generateItineraryDeterministic } from "@/services/ai/itinerary";
import { buildItineraryFromPlaceIds } from "@/services/itineraryService";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import {
  getDayCountForDuration,
  getDiningSlotRolesForDay,
  getDiningSlotsForDay,
  getMaxAttractionStopsForTrip,
} from "@/lib/travelDuration";
import type { TravelDuration, TravelZoneId, TripPreferences } from "@/types/travel";

const DINING_DURATIONS: TravelDuration[] = [
  "day-trip",
  "one-night",
  "two-nights",
  "three-nights",
];

function preferencesFor(
  zoneId: TravelZoneId,
  duration: TravelDuration,
): TripPreferences {
  return {
    ...defaultPreferences,
    zoneId,
    duration,
    pace: "balanced",
    transportation: "car",
  };
}

function zoneAttractionIds(zoneId: TravelZoneId, limit: number): string[] {
  return getCatalogPlaces()
    .filter(
      (place) =>
        place.region === zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    )
    .slice(0, limit)
    .map((place) => place.id);
}

function expectedDiningSlotsForTrip(duration: TravelDuration): number {
  const dayCount = getDayCountForDuration(duration);
  let total = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    total += getDiningSlotsForDay(day, duration);
  }
  return total;
}

function countDiningByDay(placeIds: string[], day: number, slices: { day: number; placeIds: string[] }[]): number {
  const slice = slices.find((item) => item.day === day);
  if (!slice) return 0;
  return slice.placeIds.filter((id) => {
    const place = getCatalogPlaceById(id);
    return place && isDiningPlace(place);
  }).length;
}

function assertDiningSlotsFilled(
  slices: { day: number; placeIds: string[] }[],
  duration: TravelDuration,
  zoneId: string,
) {
  const dayCount = getDayCountForDuration(duration);
  let totalDining = 0;

  for (let day = 1; day <= dayCount; day += 1) {
    const expected = getDiningSlotsForDay(day, duration);
    const roles = getDiningSlotRolesForDay(day, duration);
    const actual = countDiningByDay([], day, slices);

    assert.equal(
      actual,
      expected,
      `${zoneId} Day${day} (${duration}): expected ${expected} dining [${roles.join(",")}], got ${actual}`,
    );
    totalDining += actual;

    for (const id of slices.find((s) => s.day === day)?.placeIds ?? []) {
      const place = getCatalogPlaceById(id);
      if (place && isDiningPlace(place)) {
        assert.ok(
          isDiningCategory(place.category),
          `${zoneId}: ${place.name} must be restaurant/cafe, got ${place.category}`,
        );
      }
    }
  }

  assert.equal(
    totalDining,
    expectedDiningSlotsForTrip(duration),
    `${zoneId} ${duration}: total dining slots`,
  );
}

describe("itinerary dining fill — scheduleItineraryFromPlaceIds", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    for (const duration of DINING_DURATIONS) {
      it(`${zoneId} · ${duration} · Day별 식사 슬롯 전부 채움`, async () => {
        const preferences = preferencesFor(zoneId, duration);
        const tourIds = zoneAttractionIds(zoneId, getMaxAttractionStopsForTrip(preferences));
        assert.ok(tourIds.length > 0, `${zoneId}: need attractions`);

        const context = buildEngineContextFromTripStore({
          preferences,
          savedPlaceIds: [],
          recentPlaceIds: [],
          itineraryAnchorPlaceId: null,
        });

        const plan = await scheduleItineraryFromPlaceIds(tourIds, preferences, context, {
          routeProfile: "fast",
        });

        assertDiningSlotsFilled(plan.slices, duration, zoneId);
      });
    }
  }
});

describe("itinerary dining fill — kernel & partial selection", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    it(`${zoneId} · 2박3일 · 빈 선택 kernel — 식사 ${expectedDiningSlotsForTrip("two-nights")}슬롯`, async () => {
      const preferences = preferencesFor(zoneId, "two-nights");
      const context = buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds: [],
        recentPlaceIds: [],
        itineraryAnchorPlaceId: null,
        selectedPlaceState: {},
      });

      const { itinerary } = await generateItineraryDeterministic(preferences, {
        engineContext: context,
        routeProfile: "fast",
      });

      const diningStops = itinerary.stops.filter((stop) => {
        const place = getCatalogPlaceById(stop.placeId);
        return place && isDiningPlace(place);
      });

      assert.equal(
        diningStops.length,
        expectedDiningSlotsForTrip("two-nights"),
        `${zoneId}: kernel 2박3일 dining count`,
      );

      for (let day = 1; day <= 3; day += 1) {
        const dayDining = diningStops.filter((stop) => stop.day === day).length;
        assert.equal(
          dayDining,
          getDiningSlotsForDay(day, "two-nights"),
          `${zoneId} Day${day} kernel dining`,
        );
      }
    });

    it(`${zoneId} · 3박4일 · 빈 선택 kernel — 식사 ${expectedDiningSlotsForTrip("three-nights")}슬롯`, async () => {
      const preferences = preferencesFor(zoneId, "three-nights");
      const context = buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds: [],
        recentPlaceIds: [],
        itineraryAnchorPlaceId: null,
        selectedPlaceState: {},
      });

      const { itinerary } = await generateItineraryDeterministic(preferences, {
        engineContext: context,
        routeProfile: "fast",
      });

      const diningStops = itinerary.stops.filter((stop) => {
        const place = getCatalogPlaceById(stop.placeId);
        return place && isDiningPlace(place);
      });

      assert.equal(
        diningStops.length,
        expectedDiningSlotsForTrip("three-nights"),
        `${zoneId}: kernel 3박4일 dining count`,
      );
    });

    it(`${zoneId} · 5곳 선택 · 2박3일 buildItinerary — 식사 슬롯 채움`, async () => {
      const preferences = preferencesFor(zoneId, "two-nights");
      const pool = zoneAttractionIds(zoneId, 5);
      const context = buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds: [],
        recentPlaceIds: [],
        itineraryAnchorPlaceId: null,
      });

      const itinerary = await buildItineraryFromPlaceIds(pool, preferences, undefined, context, null, {
        routeProfile: "fast",
      });

      const diningStops = itinerary.stops.filter((stop) => {
        const place = getCatalogPlaceById(stop.placeId);
        return place && isDiningPlace(place);
      });

      assert.equal(
        diningStops.length,
        expectedDiningSlotsForTrip("two-nights"),
        `${zoneId}: partial selection dining count`,
      );
    });
  }
});

describe("itinerary dining fill — slot role expectations", () => {
  it("2박3일 균형: Day1 점·저, Day2 3끼, Day3 아·점 = 7식", () => {
    assert.equal(getDiningSlotsForDay(1, "two-nights"), 2);
    assert.equal(getDiningSlotsForDay(2, "two-nights"), 3);
    assert.equal(getDiningSlotsForDay(3, "two-nights"), 2);
    assert.equal(expectedDiningSlotsForTrip("two-nights"), 7);
  });

  it("3박4일 균형: 총 10식 (2+3+3+2)", () => {
    assert.equal(getDiningSlotsForDay(1, "three-nights"), 2);
    assert.equal(getDiningSlotsForDay(2, "three-nights"), 3);
    assert.equal(getDiningSlotsForDay(3, "three-nights"), 3);
    assert.equal(getDiningSlotsForDay(4, "three-nights"), 2);
    assert.equal(expectedDiningSlotsForTrip("three-nights"), 10);
  });
});
