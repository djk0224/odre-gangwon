import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveDayRouteAnchors } from "@/lib/lodgingDayAnchors";
import type { TripLodgingPlan, TripPreferences } from "@/types/travel";

const basePreferences: TripPreferences = {
  zoneId: "gangneung-yangyang",
  travelDate: "2026-06-15",
  travelers: 2,
  duration: "two-nights",
  themes: ["nature"],
  transportation: "car",
  companion: "couple",
  pace: "balanced",
  season: "summer",
  travelPurpose: "coast",
  origin: { label: "서울역", coordinates: { lat: 37.5559, lng: 126.9723 } },
  destination: { label: "서울역", coordinates: { lat: 37.5559, lng: 126.9723 } },
};

describe("resolveDayRouteAnchors", () => {
  it("single 숙소 2박3일은 도착/순환/귀가 타입을 반환", () => {
    const plan: TripLodgingPlan = {
      mode: "single",
      defaultDepot: {
        id: "h1",
        name: "강릉 숙소",
        coordinates: { lat: 37.752, lng: 128.875 },
        source: "manual_geocode",
      },
      nights: [
        {
          nightIndex: 1,
          depot: {
            id: "h1",
            name: "강릉 숙소",
            coordinates: { lat: 37.752, lng: 128.875 },
            source: "manual_geocode",
          },
        },
        {
          nightIndex: 2,
          depot: {
            id: "h1",
            name: "강릉 숙소",
            coordinates: { lat: 37.752, lng: 128.875 },
            source: "manual_geocode",
          },
        },
      ],
    };
    assert.equal(resolveDayRouteAnchors(1, basePreferences, plan).dayType, "arrival_to_hotel");
    assert.equal(resolveDayRouteAnchors(2, basePreferences, plan).dayType, "hotel_loop");
    assert.equal(resolveDayRouteAnchors(3, basePreferences, plan).dayType, "departure_from_hotel");
  });
});
