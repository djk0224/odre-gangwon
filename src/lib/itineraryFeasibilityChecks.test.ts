import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectScheduleFeasibilityIssues,
  parseOperatingHoursWindow,
} from "@/lib/itineraryFeasibilityChecks";
import type { FeasibilityIssue, Itinerary, TripPreferences } from "@/types/travel";

const preferences: TripPreferences = {
  zoneId: "samcheok-donghae",
  startDate: "2026-06-01",
  duration: "1박2일",
  travelers: 2,
  theme: "sea",
  transportation: "public-transit",
  companions: "couple",
  pace: "packed",
  season: "summer",
};

function issue(
  code: string,
  message: string,
  severity: FeasibilityIssue["severity"] = "warning",
): FeasibilityIssue {
  return { id: code, code, message, severity };
}

describe("itineraryFeasibilityChecks", () => {
  it("parses operating hours window", () => {
    const window = parseOperatingHoursWindow("09:00 - 17:00");
    assert.deepEqual(window, { openMin: 9 * 60, closeMin: 17 * 60 });
  });

  it("warns on transit last train for late packed schedule", () => {
    const itinerary = {
      reservationPlaceIds: [],
      stops: Array.from({ length: 8 }).map((_, index) => ({
        id: `stop-${index}`,
        order: index + 1,
        day: 1 as const,
        placeId: "hwanseon-cave",
        placeName: "환선굴",
        category: "cave" as const,
        duration: "2시간 30분",
        note: "",
        travelMinutesToNext: 50,
        coordinates: { lat: 0, lng: 0 },
        reservationRequired: false,
        partner: false,
      })),
    } as Itinerary;

    const issues = collectScheduleFeasibilityIssues(itinerary, preferences, issue);
    assert.ok(issues.some((item) => item.code === "transit_last_train"));
  });
});
