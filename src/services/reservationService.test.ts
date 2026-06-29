import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { confirmReservation } from "@/services/reservationService";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";

describe("confirmReservation", () => {
  it("rejects when travelers exceed remaining capacity", () => {
    const place = getCatalogPlaceById("hwanseon-cave");
    const slot = place?.availableSlots[0];
    if (!place || !slot) return;

    const remaining = slot.capacity - slot.reservedCount;
    const result = confirmReservation(
      {
        placeId: place.id,
        slotId: slot.id,
        travelers: remaining + 50,
        payment: { amount: 1000, method: "card" },
      },
      { existingReservations: [] },
    );

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /좌석|마감/);
    }
  });

  it("rejects duplicate place reservation", () => {
    const place = getCatalogPlaceById("hwanseon-cave");
    const slot = place?.availableSlots.find(
      (item) => item.capacity - item.reservedCount >= 1,
    );
    if (!place || !slot) return;

    const first = confirmReservation(
      {
        placeId: place.id,
        slotId: slot.id,
        travelers: 1,
        payment: { amount: 1000, method: "card" },
      },
      { existingReservations: [] },
    );
    assert.equal(first.ok, true);
    if (!first.ok) return;

    const second = confirmReservation(
      {
        placeId: place.id,
        slotId: slot.id,
        travelers: 1,
        payment: { amount: 1000, method: "card" },
      },
      { existingReservations: [first.reservation] },
    );

    assert.equal(second.ok, false);
    if (!second.ok) {
      assert.match(second.error, /이미 예약/);
    }
  });
});
