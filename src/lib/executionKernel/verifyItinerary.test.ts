import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyItineraryFeasibility } from "@/lib/executionKernel/verifyItinerary";
import type { Itinerary, TripPreferences } from "@/types/travel";

const basePreferences: TripPreferences = {
  zoneId: "samcheok-donghae",
  startDate: "2026-06-01",
  duration: "1박2일",
  travelers: 2,
  theme: "sea",
  transportation: "car",
  companions: "couple",
  pace: "balanced",
  season: "summer",
};

describe("verifyItineraryFeasibility", () => {
  it("flags haversine routing source", () => {
    const itinerary = {
      reservationPlaceIds: [],
      stops: [
        {
          id: "s1",
          day: 1,
          placeId: "hwanseon-cave",
          order: 1,
          travelMinutesToNext: 30,
        },
      ],
    } as Itinerary;

    const issues = verifyItineraryFeasibility(itinerary, basePreferences, {
      routingSource: "haversine",
    });

    assert.ok(issues.some((item) => item.code === "routing_haversine"));
  });
});
