import assert from "node:assert/strict";
import { before, describe, it } from "node:test";
import { getReservationOffers } from "@/data/mockReservationOffers";
import { getCatalogPlaceCountByZone, loadFullGangwonCatalog } from "@/data/placeCatalog";

before(async () => {
  await loadFullGangwonCatalog();
});

describe("mockReservationOffers zone scoping", () => {
  it("builds dining offers for non-MVP zones from catalog", () => {
    const gangneung = getReservationOffers("dining", "gangneung-yangyang");
    assert.ok(gangneung.length > 0, "gangneung-yangyang dining offers should exist");
    assert.ok(
      gangneung.every((offer) => offer.zoneId === "gangneung-yangyang"),
      "all dining offers should match zone",
    );
  });

  it("builds activity offers for non-MVP zones from catalog", () => {
    const sokcho = getReservationOffers("activity", "sokcho-goseong");
    assert.ok(sokcho.length > 0, "sokcho-goseong activity offers should exist");
    assert.ok(
      sokcho.every((offer) => !offer.zoneId || offer.zoneId === "sokcho-goseong"),
      "activity offers should be zone-scoped",
    );
  });

  it("keeps transport offers zone-scoped with stable count", () => {
    const transport = getReservationOffers("transport", "wonju-chuncheon");
    assert.equal(transport.length, 2);
    assert.ok(transport.every((offer) => offer.zoneId === "wonju-chuncheon"));
  });
});

describe("placeCatalog gangwon coverage", () => {
  it("has executable catalog counts for all travel zones", () => {
    const zones = [
      "samcheok-donghae",
      "gangneung-yangyang",
      "sokcho-goseong",
      "pyeongchang-jeongseon",
      "yeongwol-jeongseon",
      "cheorwon-dmz",
      "wonju-chuncheon",
    ] as const;

    for (const zoneId of zones) {
      assert.ok(
        getCatalogPlaceCountByZone(zoneId) >= 30,
        `${zoneId} should have enough catalog places`,
      );
    }
  });
});
