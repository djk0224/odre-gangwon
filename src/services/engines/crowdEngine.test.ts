import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { estimateSlotCrowd, pickRecommendedSlot } from "@/services/engines/crowdEngine";
import type { EngineContext } from "@/services/engines/engineContext";
import type { ReservationSlot } from "@/types/travel";

function mockContext(placeAffinity: Record<string, number>): EngineContext {
  return {
    behaviorProfile: { placeAffinity },
    anchorPlaceId: null,
    preferences: {
      zoneId: "samcheok-donghae",
      startDate: "2026-06-01",
      duration: "1박2일",
      travelers: 2,
      theme: "sea",
      transportation: "car",
      companions: "couple",
      pace: "balanced",
      season: "summer",
    },
  } as EngineContext;
}

describe("crowdEngine place affinity", () => {
  const slot: ReservationSlot = {
    id: "hwanseon-cave-1400",
    placeId: "hwanseon-cave",
    time: "14:00",
    label: "14:00 입장",
    capacity: 80,
    reservedCount: 40,
    crowdLevel: "moderate",
    expectedWait: "약 10분",
  };

  it("uses placeId for behavior affinity in estimateSlotCrowd", () => {
    const neutral = estimateSlotCrowd(slot, mockContext({}));
    const fromPlace = estimateSlotCrowd(slot, mockContext({ "hwanseon-cave": 40 }));
    const unrelatedPlace = estimateSlotCrowd(
      slot,
      mockContext({ "samcheok-cablecar": 40 }),
    );

    assert.ok((fromPlace.factors.slotOccupancy ?? 0) > (neutral.factors.slotOccupancy ?? 0));
    assert.equal(
      unrelatedPlace.factors.slotOccupancy,
      neutral.factors.slotOccupancy,
    );
  });

  it("prefers lower occupancy slot when place affinity is neutral", () => {
    const slots: ReservationSlot[] = [
      { ...slot, id: "a", reservedCount: 70, crowdLevel: "high" },
      {
        ...slot,
        id: "b",
        time: "15:00",
        reservedCount: 10,
        crowdLevel: "low",
      },
    ];

    const picked = pickRecommendedSlot(slots, mockContext({}));
    assert.equal(picked.id, "b");
  });
});
