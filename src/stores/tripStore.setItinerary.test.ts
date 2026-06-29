import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import type { Itinerary, ReservationRecord } from "@/types/travel";

function minimalItinerary(placeIds: string[]): Itinerary {
  return {
    id: `it-${Date.now()}`,
    region: "samcheok-donghae",
    title: "test",
    summary: "test",
    totalDuration: "6h",
    movingTime: "1h",
    aiExplanation: "test",
    stops: placeIds.map((placeId, index) => ({
      id: `stop-${placeId}`,
      order: index + 1,
      day: 1,
      placeId,
      placeName: placeId,
      category: "attraction",
      duration: "1h",
      note: "test",
      coordinates: { lat: 37.4, lng: 129.1 },
      reservationRequired: true,
      partner: true,
    })),
    timeline: [],
    alternatives: [],
    reservationPlaceIds: placeIds,
  };
}

describe("setItinerary reservation preservation", () => {
  it("keeps reservations when committing a new itinerary with overlapping places", async () => {
    const { useTripStore } = await import("@/stores/tripStore");
    const placeId = "hwanseon-cave";
    const reservation: ReservationRecord = {
      id: "res-test-1",
      placeId,
      placeName: "환선굴",
      slotId: "slot-1",
      slotLabel: "10:00",
      travelers: 2,
      confirmedAt: new Date().toISOString(),
      crowdLevel: "low",
      expectedWait: "10분",
      executionStatus: "qr_issued",
      payment: { amount: 1000, method: "card", paidAt: new Date().toISOString() },
    };

    useTripStore.setState({
      preferences: defaultPreferences,
      itinerary: undefined,
      activeItineraryCommitted: false,
      reservations: [reservation],
      qrTickets: [
        {
          id: "qr-1",
          reservationId: reservation.id,
          placeId,
          placeName: "환선굴",
          slotLabel: "10:00",
          reservationNumber: "ODRE-TEST",
          checkInStatus: "ready",
          issuedAt: new Date().toISOString(),
        },
      ],
      selectedSlotByPlace: { [placeId]: "slot-1" },
    });

    const next = minimalItinerary([placeId, "samcheok-cablecar"]);
    useTripStore.getState().setItinerary(next);

    const state = useTripStore.getState();
    assert.equal(state.reservations.length, 1);
    assert.equal(state.reservations[0]?.placeId, placeId);
    assert.equal(state.qrTickets.length, 1);
    assert.equal(state.activeItineraryCommitted, true);
  });
});
