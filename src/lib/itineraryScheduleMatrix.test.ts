import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import { GANGWON_TRAVEL_ZONE_IDS } from "@/lib/gangwonZoneAvailability";
import { scheduleItineraryFromPlaceIds } from "@/lib/itineraryDayPlanner";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { applySameLodgingToAllNights } from "@/lib/tripLodgingPlan";
import { generateItineraryDeterministic } from "@/services/ai/itinerary";
import { buildItineraryFromPlaceIds } from "@/services/itineraryService";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import {
  getDayCountForDuration,
  getMaxAttractionStopsForDay,
  getMaxAttractionStopsForTrip,
} from "@/lib/travelDuration";
import type {
  TravelDuration,
  TravelZoneId,
  TripPace,
  TripPreferences,
} from "@/types/travel";

const DURATIONS: TravelDuration[] = ["day-trip", "one-night", "two-nights", "three-nights"];
const PACES: TripPace[] = ["relaxed", "balanced", "packed"];

function zoneAttractionIds(zoneId: TravelZoneId, limit?: number): string[] {
  const ids = getCatalogPlaces()
    .filter(
      (place) =>
        place.region === zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    )
    .map((place) => place.id);
  return limit === undefined ? ids : ids.slice(0, limit);
}

function countSliceAttractions(placeIds: string[]): number {
  return placeIds.filter((id) => {
    const place = getCatalogPlaceById(id);
    return place && !isDiningPlace(place) && !isLodgingPlace(place);
  }).length;
}

function expectedCaps(preferences: Pick<TripPreferences, "duration" | "pace">): number[] {
  const dayCount = getDayCountForDuration(preferences.duration);
  return Array.from({ length: dayCount }, (_, index) =>
    getMaxAttractionStopsForDay(index + 1, preferences.pace, preferences.duration),
  );
}

function assertAttractionCapsWithinBudget(
  slices: { placeIds: string[] }[],
  preferences: Pick<TripPreferences, "duration" | "pace">,
  inputAttractionCount: number,
) {
  const caps = expectedCaps(preferences);
  assert.equal(slices.length, caps.length);

  let scheduledAttractions = 0;
  for (let dayIndex = 0; dayIndex < slices.length; dayIndex += 1) {
    const count = countSliceAttractions(slices[dayIndex].placeIds);
    scheduledAttractions += count;
    assert.ok(
      count <= caps[dayIndex],
      `Day ${dayIndex + 1}: ${count} attractions exceeds cap ${caps[dayIndex]}`,
    );
  }

  assert.equal(
    scheduledAttractions,
    Math.min(inputAttractionCount, getMaxAttractionStopsForTrip(preferences)),
    "scheduled attraction count should match input up to trip cap",
  );
}

function assertExactCapsWhenFull(
  slices: { placeIds: string[] }[],
  preferences: Pick<TripPreferences, "duration" | "pace">,
) {
  const caps = expectedCaps(preferences);
  assert.deepEqual(
    slices.map((slice) => countSliceAttractions(slice.placeIds)),
    caps,
    "full trip pool should fill each day to its attraction cap",
  );
}

function preferencesFor(
  zoneId: TravelZoneId,
  duration: TravelDuration,
  pace: TripPace = "balanced",
): TripPreferences {
  return {
    ...defaultPreferences,
    zoneId,
    duration,
    pace,
    transportation: "car",
  };
}

describe("itinerary schedule matrix — all zones × durations", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    for (const duration of DURATIONS) {
      it(`${zoneId} · ${duration} · balanced: cap+geo split and depot schedule`, async () => {
        const preferences = preferencesFor(zoneId, duration, "balanced");
        const pool = zoneAttractionIds(zoneId);
        const tripCap = getMaxAttractionStopsForTrip(preferences);
        assert.ok(
          pool.length >= tripCap,
          `${zoneId}: need at least ${tripCap} attractions, got ${pool.length}`,
        );

        const tourIds = pool.slice(0, tripCap);
        const context = buildEngineContextFromTripStore({
          preferences,
          savedPlaceIds: [],
          recentPlaceIds: [],
          itineraryAnchorPlaceId: null,
        });

        const plan = await scheduleItineraryFromPlaceIds(tourIds, preferences, context, {
          skipMealInjection: true,
          routeProfile: "fast",
        });

        assert.equal(plan.slices.length, getDayCountForDuration(duration));
        assertExactCapsWhenFull(plan.slices, preferences);
        assert.ok(plan.dayLodgingMeta?.[1], "day 1 should record depot legs from zone gateway");
      });
    }
  }
});

describe("itinerary schedule matrix — all zones × paces (2박3일)", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    for (const pace of PACES) {
      it(`${zoneId} · two-nights · ${pace}: Day caps match pace rules`, async () => {
        const preferences = preferencesFor(zoneId, "two-nights", pace);
        const tripCap = getMaxAttractionStopsForTrip(preferences);
        const tourIds = zoneAttractionIds(zoneId, tripCap);
        assert.equal(tourIds.length, tripCap);

        const context = buildEngineContextFromTripStore({
          preferences,
          savedPlaceIds: [],
          recentPlaceIds: [],
          itineraryAnchorPlaceId: null,
        });

        const plan = await scheduleItineraryFromPlaceIds(tourIds, preferences, context, {
          skipMealInjection: true,
          routeProfile: "fast",
        });

        assertExactCapsWhenFull(plan.slices, preferences);
      });
    }
  }
});

describe("itinerary schedule matrix — partial selection build (all zones)", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    it(`${zoneId} · 5곳 선택 · 2박3일: backfill 후 Day3 관광 포함`, async () => {
      const preferences = preferencesFor(zoneId, "two-nights", "balanced");
      const pool = zoneAttractionIds(zoneId, 5);
      assert.equal(pool.length, 5);

      const context = buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds: [],
        recentPlaceIds: [],
        itineraryAnchorPlaceId: null,
        selectedPlaceState: Object.fromEntries(
          pool.map((id, index) => [
            id,
            { intent: "interested" as const, updatedAt: `2026-06-16T0${index}:00:00Z` },
          ]),
        ),
      });

      const itinerary = await buildItineraryFromPlaceIds(pool, preferences, undefined, context, null, {
        routeProfile: "fast",
      });

      const day3Attractions = itinerary.stops.filter((stop) => {
        if (stop.day !== 3) return false;
        const place = getCatalogPlaceById(stop.placeId);
        return place && !isDiningPlace(place) && !isLodgingPlace(place);
      });

      assert.ok(
        day3Attractions.length >= 1,
        `${zoneId}: Day3 should include at least one attraction after backfill`,
      );
      assert.ok(
        countSliceAttractions(
          itinerary.stops.map((stop) => stop.placeId),
        ) >= getMaxAttractionStopsForTrip(preferences),
        `${zoneId}: should reach trip attraction cap after backfill`,
      );
    });
  }
});

describe("itinerary schedule matrix — lodging depot (all zones)", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    it(`${zoneId} · 1박2일 · 숙소 depot 왕복`, async () => {
      const preferences = preferencesFor(zoneId, "one-night", "balanced");
      const lodging = getCatalogPlaces().find(
        (place) => place.region === zoneId && isLodgingPlace(place),
      );
      assert.ok(lodging, `${zoneId}: expected lodging catalog entry`);

      const lodgingPlan = applySameLodgingToAllNights(
        { mode: "off", nights: [] },
        {
          id: lodging.id,
          name: lodging.name,
          coordinates: lodging.coordinates,
          source: "manual_geocode",
        },
        preferences.duration,
      );

      const tourIds = zoneAttractionIds(zoneId, getMaxAttractionStopsForTrip(preferences));
      const context = buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds: [],
        recentPlaceIds: [],
        itineraryAnchorPlaceId: null,
        lodgingPlan,
      });

      const plan = await scheduleItineraryFromPlaceIds(tourIds, preferences, context, {
        lodgingPlan,
        skipMealInjection: true,
        routeProfile: "fast",
      });

      assert.equal(plan.slices.length, 2);
      for (const day of [1, 2] as const) {
        const meta = plan.dayLodgingMeta?.[day];
        assert.ok(meta, `${zoneId} Day${day}: missing lodging depot meta`);
        assert.ok(meta.departMinutes >= 0);
        assert.ok(meta.returnMinutes >= 0);
      }
    });
  }
});

describe("itinerary schedule matrix — kernel auto-fill (multi-duration)", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  const kernelDurations: TravelDuration[] = ["one-night", "two-nights", "three-nights"];

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    for (const duration of kernelDurations) {
      it(`${zoneId} · ${duration} · 빈 선택 kernel fill`, async () => {
        const preferences = preferencesFor(zoneId, duration, "balanced");
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

        assert.equal(itinerary.region, zoneId);
        const dayCount = getDayCountForDuration(duration);
        const tripCap = getMaxAttractionStopsForTrip(preferences);
        const daysPresent = new Set(itinerary.stops.map((stop) => stop.day));

        const minDaysExpected =
          duration === "three-nights" ? dayCount : Math.min(dayCount, 2);
        assert.ok(
          daysPresent.size >= minDaysExpected,
          `${zoneId}: expected stops on ${minDaysExpected}+ days, got ${[...daysPresent].join(",")}`,
        );

        const attractionCount = itinerary.stops.filter((stop) => {
          const place = getCatalogPlaceById(stop.placeId);
          return place && !isDiningPlace(place) && !isLodgingPlace(place);
        }).length;

        const minAttractionsExpected =
          duration === "three-nights"
            ? Math.min(8, tripCap)
            : Math.min(3, tripCap);
        assert.ok(
          attractionCount >= minAttractionsExpected,
          `${zoneId}: kernel should fill meaningful attractions (${attractionCount}/${tripCap})`,
        );

        if (duration === "three-nights") {
          assert.ok(
            daysPresent.has(4),
            `${zoneId}: Day4 귀가일에도 정류장이 있어야 합니다`,
          );
          for (let day = 1; day <= dayCount; day += 1) {
            const dayAttractions = itinerary.stops.filter((stop) => {
              if (stop.day !== day) return false;
              const place = getCatalogPlaceById(stop.placeId);
              return place && !isDiningPlace(place) && !isLodgingPlace(place);
            });
            assert.ok(
              dayAttractions.length >= 1,
              `${zoneId}: Day${day} should include at least one attraction`,
            );
            assert.ok(
              dayAttractions.length <= getMaxAttractionStopsForDay(day, "balanced", duration),
              `${zoneId}: Day${day} exceeds balanced cap (${dayAttractions.length})`,
            );
          }
        }
      });
    }
  }
});

describe("itinerary schedule matrix — meal injection smoke", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    it(`${zoneId} · 2박3일 · 식사 삽입 후에도 Day별 관광 상한 유지`, async () => {
      const preferences = preferencesFor(zoneId, "two-nights", "balanced");
      const tourIds = zoneAttractionIds(zoneId, getMaxAttractionStopsForTrip(preferences));
      const context = buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds: [],
        recentPlaceIds: [],
        itineraryAnchorPlaceId: null,
      });

      const plan = await scheduleItineraryFromPlaceIds(tourIds, preferences, context, {
        routeProfile: "fast",
      });

      assertAttractionCapsWithinBudget(plan.slices, preferences, tourIds.length);

      const diningStops = plan.orderedPlaceIds.filter((id) => {
        const place = getCatalogPlaceById(id);
        return place && isDiningPlace(place);
      });
      assert.ok(
        diningStops.length >= getDayCountForDuration(preferences.duration),
        `${zoneId}: expected dining stops across days`,
      );
    });
  }
});
