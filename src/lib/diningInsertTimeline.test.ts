import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findBestMealInsertIndex,
  MEAL_TARGET_MINUTES,
} from "@/lib/diningInsertTimeline";
import type { Place, TripPreferences } from "@/types/travel";

const preferences: TripPreferences = {
  zoneId: "samcheok-donghae",
  startDate: "2026-06-01",
  duration: "1박2일",
  travelers: 2,
  theme: "sea",
  transportation: "car",
  companions: "couple",
  pace: "normal",
  season: "summer",
};

function place(id: string, lat: number, lng: number, duration = "1시간"): Place {
  return {
    id,
    name: id,
    region: "samcheok-donghae",
    category: "attraction",
    description: "",
    estimatedDuration: duration,
    operatingHours: "09:00 - 18:00",
    coordinates: { lat, lng },
    gradient: "from-pine to-mist",
    tags: [],
    signature: "",
    distanceNote: "",
    reservationRequired: false,
    partner: false,
  };
}

describe("diningInsertTimeline", () => {
  it("prefers a middle insert index near lunch target", () => {
    const morning = place("morning", 37.45, 129.16, "2시간");
    const afternoon = place("afternoon", 37.46, 129.17, "2시간");
    const evening = place("evening", 37.47, 129.18, "2시간");
    const dining = {
      ...place("lunch", 37.455, 129.165, "1시간"),
      category: "restaurant" as const,
    };

    const insertAt = findBestMealInsertIndex(
      [morning.id, afternoon.id, evening.id],
      dining,
      MEAL_TARGET_MINUTES.middle,
      preferences,
      { lat: 37.44, lng: 129.15 },
    );

    assert.ok(insertAt >= 0 && insertAt <= 3);
  });
});
