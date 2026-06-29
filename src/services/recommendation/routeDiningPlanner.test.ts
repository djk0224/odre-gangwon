import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRouteDiningPlan,
  optimizeTourPlaceIdsByRoute,
  orderTourPlaceIdsForItinerary,
} from "@/services/recommendation/routeDiningPlanner";
import { estimateLegMinutesBetweenCoords } from "@/lib/itineraryLegMinutes";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import type { TripPreferences } from "@/types/travel";

const preferences: TripPreferences = {
  zoneId: "samcheok-donghae",
  travelDate: "2026-06-15",
  travelers: 2,
  duration: "one-night",
  themes: ["nature"],
  transportation: "car",
  companion: "couple",
  pace: "balanced",
  season: "summer",
  travelPurpose: "coast",
};

describe("buildRouteDiningPlan", () => {
  it("관광지 선택 없으면 식당만 따로 계산하지 않는다", () => {
    const plan = buildRouteDiningPlan({
      preferences: { ...preferences, duration: "day-trip" },
      selectedPlaceState: {},
    });
    assert.equal(plan.tourPlaceIds.length, 0);
    assert.equal(plan.slots.length, 0);
    assert.equal(plan.orderedPlaceIds.length, 0);
  });

  it("숙박·펜션 선택은 관광지로 취급하지 않는다", () => {
    const lodging = getCatalogPlaces().find(
      (place) =>
        place.region === preferences.zoneId &&
        /펜션|캠핑|호텔|리조트|숙박|모텔/i.test(place.name),
    );
    if (!lodging) return;

    const plan = buildRouteDiningPlan({
      preferences: { ...preferences, duration: "day-trip" },
      selectedPlaceState: {
        [lodging.id]: { intent: "must_go", updatedAt: "2026-05-27T01:00:00.000Z" },
      },
    });
    assert.equal(plan.tourPlaceIds.length, 0);
    assert.equal(plan.orderedPlaceIds.length, 0);
  });

  it("당일치기는 middle/end(점심·저녁) 2구간만 계산한다", () => {
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const selectedPlaceState = Object.fromEntries(
      tourPlaces.slice(0, 2).map((place, index) => [
        place.id,
        { intent: "must_go" as const, updatedAt: `2026-05-27T0${index}:00:00.000Z` },
      ]),
    );
    const plan = buildRouteDiningPlan({
      preferences: { ...preferences, duration: "day-trip" },
      selectedPlaceState,
    });
    assert.equal(plan.slots.length, 2);
    assert.deepEqual(
      plan.slots.map((slot) => slot.role),
      ["middle", "end"],
    );
    assert.ok(plan.orderedPlaceIds.length >= plan.tourPlaceIds.length);
  });

  it("1박2일은 첫날 점심·저녁·귀가일 아침·점심", () => {
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const selectedPlaceState = Object.fromEntries(
      tourPlaces.slice(0, 4).map((place, index) => [
        place.id,
        { intent: "must_go" as const, updatedAt: `2026-05-27T0${index}:00:00.000Z` },
      ]),
    );
    const plan = buildRouteDiningPlan({
      preferences,
      selectedPlaceState,
    });
    assert.ok(plan.tourPlaceIds.length >= 2);
    assert.equal(plan.slots.length, 4);
    assert.deepEqual(
      plan.slots.map((slot) => slot.role),
      ["middle", "end", "start", "middle"],
    );
    assert.ok(plan.slots[0].label.includes("점심"));
    assert.ok(plan.slots[1].label.includes("저녁"));
    assert.deepEqual(
      plan.slots.map((slot) => slot.day),
      [1, 1, 2, 2],
    );
  });

  it("2박3일은 관광지가 적어도 Day3 귀가일 식사 슬롯을 만든다", () => {
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === preferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const plan = buildRouteDiningPlan({
      preferences: { ...preferences, duration: "two-nights", pace: "balanced" },
      selectedPlaceState: Object.fromEntries(
        tourPlaces.slice(0, 2).map((place, index) => [
          place.id,
          { intent: "must_go" as const, updatedAt: `2026-05-27T0${index}:00:00.000Z` },
        ]),
      ),
    });
    assert.equal(plan.slots.length, 7);
    assert.deepEqual(
      plan.slots.map((slot) => slot.day),
      [1, 1, 2, 2, 2, 3, 3],
    );
    assert.deepEqual(
      plan.slots.filter((slot) => slot.day === 3).map((slot) => slot.role),
      ["start", "middle"],
    );
    assert.ok(
      plan.slots.some((slot) => slot.day === 3 && slot.label.includes("아침")),
      "귀가일 아침 슬롯 라벨",
    );
  });

  it("must_go가 interested보다 먼저 오도록 tourPlaceIds를 정렬한다", () => {
    const plan = buildRouteDiningPlan({
      preferences,
      selectedPlaceState: {
        b: { intent: "interested", updatedAt: "2026-05-27T02:00:00.000Z" },
        a: { intent: "must_go", updatedAt: "2026-05-27T01:00:00.000Z" },
      },
    });
    if (plan.tourPlaceIds.length >= 2) {
      assert.equal(plan.tourPlaceIds[0], "a");
    }
  });

  it("당일치기 balanced는 개수·시간 예산 상한을 함께 적용한다", () => {
    const dayTripPreferences: TripPreferences = { ...preferences, duration: "day-trip" };
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === dayTripPreferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const selectedPlaceState = Object.fromEntries(
      tourPlaces.slice(0, 12).map((place, index) => [
        place.id,
        { intent: "interested" as const, updatedAt: `2026-05-27T${String(index).padStart(2, "0")}:00:00.000Z` },
      ]),
    );
    const capped = orderTourPlaceIdsForItinerary(selectedPlaceState, dayTripPreferences);
    assert.ok(capped.length >= 2, "최소 2곳은 유지해야 한다");
    assert.ok(capped.length <= 3, "balanced 당일치기 개수 상한 3곳을 넘지 않는다");
  });

  it("must_go는 시간 예산을 넘어도 전부 유지한다", () => {
    const multiDayPreferences: TripPreferences = { ...preferences, duration: "two-nights", pace: "balanced" };
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === multiDayPreferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const mustGoPicks = tourPlaces.slice(0, 5);
    const selectedPlaceState = Object.fromEntries(
      mustGoPicks.map((place, index) => [
        place.id,
        { intent: "must_go" as const, updatedAt: `2026-05-27T${String(index).padStart(2, "0")}:00:00.000Z` },
      ]),
    );
    const ordered = orderTourPlaceIdsForItinerary(selectedPlaceState, multiDayPreferences);
    assert.equal(ordered.length, mustGoPicks.length);
  });

  it("관광지 방문 순서를 이동 시간 기준으로 최적화한다", () => {
    const dayTripPreferences: TripPreferences = { ...preferences, duration: "day-trip" };
    const tourPlaces = getCatalogPlaces().filter(
      (place) =>
        place.region === dayTripPreferences.zoneId &&
        !isDiningPlace(place) &&
        !isLodgingPlace(place),
    );
    const picks = tourPlaces.slice(0, 4);
    if (picks.length < 4) return;

    const reversed = [...picks].reverse().map((place) => place.id);
    const optimized = optimizeTourPlaceIdsByRoute(reversed, dayTripPreferences);
    assert.equal(optimized.length, reversed.length);
    assert.notDeepEqual(optimized, reversed);

    const reversedMinutes = tourLegMinutesForTest(reversed, dayTripPreferences.transportation);
    const optimizedMinutes = tourLegMinutesForTest(optimized, dayTripPreferences.transportation);
    assert.ok(optimizedMinutes <= reversedMinutes);
  });
});

function tourLegMinutesForTest(
  placeIds: string[],
  transportation: TripPreferences["transportation"],
): number {
  let total = 0;
  for (let i = 0; i < placeIds.length - 1; i += 1) {
    const from = getCatalogPlaces().find((place) => place.id === placeIds[i]);
    const to = getCatalogPlaces().find((place) => place.id === placeIds[i + 1]);
    if (!from || !to) continue;
    total += estimateLegMinutesBetweenCoords(from.coordinates, to.coordinates, transportation);
  }
  return total;
}
