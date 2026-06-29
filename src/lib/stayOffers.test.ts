import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterStayOffersByZone,
  getStayOffersForZone,
  resolveStayOfferZone,
} from "@/lib/stayOffers";
import { getReservationOffers } from "@/data/mockReservationOffers";

describe("stayOffers", () => {
  it("filters legacy mock stays to samcheok-donghae only", () => {
    const all = getReservationOffers("stay");
    const samcheok = filterStayOffersByZone(all, "samcheok-donghae");
    const gangneung = filterStayOffersByZone(all, "gangneung-yangyang");

    assert.ok(samcheok.some((offer) => offer.id === "stay-samcheok-bay"));
    assert.equal(gangneung.some((offer) => offer.id === "stay-samcheok-bay"), false);
  });

  it("provides zone-specific fallback stays when catalog is sparse", () => {
    const gangneung = getStayOffersForZone("gangneung-yangyang", 4);
    assert.ok(gangneung.length >= 2);
    assert.ok(gangneung.every((offer) => resolveStayOfferZone(offer) === "gangneung-yangyang"));
    assert.equal(
      gangneung.some((offer) => offer.id === "stay-samcheok-bay" || offer.id === "stay-donghae-harbor"),
      false,
    );
  });

  it("includes hand-crafted samcheok stays for samcheok-donghae", () => {
    const offers = getStayOffersForZone("samcheok-donghae", 6);
    assert.ok(offers.some((offer) => offer.id === "stay-samcheok-bay"));
    assert.ok(offers.some((offer) => offer.id === "stay-donghae-harbor"));
  });
});
