import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createLodgingPlanForDuration,
  emptyLodgingPlan,
  resolveDayLodgingDepots,
} from "@/lib/tripLodgingPlan";
import type { TripLodgingDepot, TripLodgingPlan } from "@/types/travel";

function depot(id: string, name: string): TripLodgingDepot {
  return {
    id,
    name,
    coordinates: { lat: 37.4 + id.length * 0.01, lng: 129.1 },
    source: "manual_geocode",
  };
}

describe("resolveDayLodgingDepots", () => {
  const plan: TripLodgingPlan = {
    mode: "per_night",
    nights: [
      { nightIndex: 1, depot: depot("a", "호텔A") },
      { nightIndex: 2, depot: depot("b", "호텔B") },
    ],
  };

  it("2박3일 A→B: Day2 start=A end=B, Day3 start=B end=B", () => {
    const d2 = resolveDayLodgingDepots(2, plan, "two-nights");
    assert.equal(d2.start?.id, "a");
    assert.equal(d2.end?.id, "b");
    assert.equal(d2.interHotelTransfer, true);

    const d3 = resolveDayLodgingDepots(3, plan, "two-nights");
    assert.equal(d3.start?.id, "b");
    assert.equal(d3.end?.id, "b");
    assert.equal(d3.interHotelTransfer, false);
  });

  it("Day1 uses first night for both start and end", () => {
    const d1 = resolveDayLodgingDepots(1, plan, "two-nights");
    assert.equal(d1.start?.id, "a");
    assert.equal(d1.end?.id, "a");
    assert.equal(d1.interHotelTransfer, false);
  });
});

describe("createLodgingPlanForDuration", () => {
  it("당일치기는 이전 single 숙소를 유지하지 않는다", () => {
    const previous = {
      mode: "single" as const,
      defaultDepot: depot("old", "이전 숙소"),
      nights: [],
    };
    const next = createLodgingPlanForDuration("day-trip", previous);
    assert.deepEqual(next, emptyLodgingPlan());
  });
});
