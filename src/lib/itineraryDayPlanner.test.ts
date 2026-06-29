import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import {
  findGeographicTimeDaySplit,
  scheduleItineraryFromPlaceIds,
  splitPlaceIdsByCapsAndGeography,
  splitPlaceIdsByDayCaps,
} from "@/lib/itineraryDayPlanner";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import { getMaxAttractionStopsForDay } from "@/lib/travelDuration";
import { applySameLodgingToAllNights } from "@/lib/tripLodgingPlan";
import type { TripPreferences } from "@/types/travel";

describe("splitPlaceIdsByDayCaps", () => {
  const preferences = {
    duration: "two-nights" as const,
    pace: "balanced" as const,
    transportation: "car" as const,
  };
  const placeIds = ["a", "b", "c", "d", "e", "f", "g"];

  it("2박3일 균형은 Day1·2·3 관광 상한 2+3+2로 분배한다", () => {
    const chunks = splitPlaceIdsByDayCaps(placeIds, preferences);
    assert.equal(chunks.length, 3);
    assert.deepEqual(
      chunks.map((chunk) => chunk.length),
      [
        getMaxAttractionStopsForDay(1, "balanced", "two-nights"),
        getMaxAttractionStopsForDay(2, "balanced", "two-nights"),
        getMaxAttractionStopsForDay(3, "balanced", "two-nights"),
      ],
    );
    assert.deepEqual(chunks.flat(), placeIds);
  });

  it("식당이 섞여 있어도 관광지 상한만 카운트한다", async () => {
    await loadFullGangwonCatalog();
    const zonePlaces = getCatalogPlaces().filter(
      (place) => place.region === "gangneung-yangyang",
    );
    const tours = zonePlaces
      .filter((place) => !isDiningPlace(place) && !isLodgingPlace(place))
      .slice(0, 5)
      .map((place) => place.id);
    const dining = zonePlaces
      .filter((place) => isDiningPlace(place))
      .slice(0, 5)
      .map((place) => place.id);
    const mixed: string[] = [];
    for (let i = 0; i < tours.length; i += 1) {
      mixed.push(tours[i]);
      if (dining[i]) mixed.push(dining[i]);
    }

    const chunks = splitPlaceIdsByDayCaps(mixed, preferences);
    const attractionCounts = chunks.map(
      (chunk) =>
        chunk.filter((id) => {
          const place = getCatalogPlaceById(id);
          return place && !isDiningPlace(place);
        }).length,
    );
    assert.deepEqual(attractionCounts, [2, 3, 0]);
  });
});

describe("splitPlaceIdsByCapsAndGeography", () => {
  before(async () => {
    await loadFullGangwonCatalog();
  });

  const preferences: Pick<TripPreferences, "duration" | "pace" | "transportation"> = {
    duration: "two-nights",
    pace: "balanced",
    transportation: "car",
  };

  it("2박3일 balanced: cap split respects 2+3+2", () => {
    const zonePlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === "gangneung-yangyang" &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const ordered = zonePlaces.slice(0, 7).map((place) => place.id);
    const legMinutes = ordered.slice(0, -1).map((_, index) => {
      const from = getCatalogPlaceById(ordered[index]);
      const to = getCatalogPlaceById(ordered[index + 1]);
      if (!from || !to) return 20;
      const latDiff = Math.abs(from.coordinates.lat - to.coordinates.lat);
      const lngDiff = Math.abs(from.coordinates.lng - to.coordinates.lng);
      return 15 + (latDiff + lngDiff) * 80;
    });

    const chunks = splitPlaceIdsByCapsAndGeography(ordered, preferences, legMinutes);
    assert.equal(chunks.length, 3);
    assert.deepEqual(
      chunks.map((chunk) => chunk.length),
      [
        getMaxAttractionStopsForDay(1, "balanced", "two-nights"),
        getMaxAttractionStopsForDay(2, "balanced", "two-nights"),
        getMaxAttractionStopsForDay(3, "balanced", "two-nights"),
      ],
    );
    assert.deepEqual(chunks.flat(), ordered);
  });

  it("geographic split prefers distant boundary along route order", () => {
    const zonePlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === "gangneung-yangyang" &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    assert.ok(zonePlaces.length >= 3);

    const anchor = zonePlaces[0];
    const distances = zonePlaces.slice(1).map((place) => ({
      place,
      dist:
        Math.abs(place.coordinates.lat - anchor.coordinates.lat) +
        Math.abs(place.coordinates.lng - anchor.coordinates.lng),
    }));
    distances.sort((a, b) => a.dist - b.dist);
    const near = distances[0].place;
    const far = distances[distances.length - 1].place;

    const placeIds = [anchor.id, near.id, far.id];
    const legMinutes = [8, 75];

    const splitInclusive = findGeographicTimeDaySplit(
      placeIds,
      legMinutes,
      { maxActiveMinutes: 540 },
      "car",
    );

    assert.equal(
      splitInclusive,
      1,
      "split should occur before the long leg to the distant place",
    );
  });
});

describe("scheduleItineraryFromPlaceIds lodging depot", () => {
  const preferences: TripPreferences = {
    ...defaultPreferences,
    zoneId: "gangneung-yangyang",
    duration: "two-nights",
    pace: "balanced",
    transportation: "car",
  };

  before(async () => {
    await loadFullGangwonCatalog();
  });

  it("day slices optimized from lodging start/end when plan active", async () => {
    const zonePlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const tourIds = zonePlaces.slice(0, 5).map((place) => place.id);
    const lodging = getCatalogPlaces().find(
      (place) => place.region === preferences.zoneId && isLodgingPlace(place),
    );
    assert.ok(lodging, "expected lodging in gangneung-yangyang");

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

    assert.ok(plan.dayLodgingMeta);
    assert.ok(plan.dayLodgingMeta[1]?.departMinutes !== undefined);
    assert.ok(plan.dayLodgingMeta[1]?.returnMinutes !== undefined);
    assert.equal(plan.slices.length, 3);
  });
});
