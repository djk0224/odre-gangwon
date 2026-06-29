import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getCatalogPlaceCountByZone,
  isFullCatalogLoaded,
  loadFullGangwonCatalog,
} from "@/lib/catalogRuntime";
import { EXECUTABLE_ZONE_MIN_PLACES } from "@/lib/gangwonZoneAvailability";

describe("catalogRuntime", () => {
  it("full catalog load unlocks all Gangwon zones for execution", async () => {
    await loadFullGangwonCatalog();
    assert.equal(isFullCatalogLoaded(), true);

    const gangneungCount = getCatalogPlaceCountByZone("gangneung-yangyang");
    const pyeongchangCount = getCatalogPlaceCountByZone("pyeongchang-jeongseon");

    assert.ok(
      gangneungCount >= EXECUTABLE_ZONE_MIN_PLACES,
      `gangneung-yangyang expected >= ${EXECUTABLE_ZONE_MIN_PLACES}, got ${gangneungCount}`,
    );
    assert.ok(
      pyeongchangCount >= EXECUTABLE_ZONE_MIN_PLACES,
      `pyeongchang-jeongseon expected >= ${EXECUTABLE_ZONE_MIN_PLACES}, got ${pyeongchangCount}`,
    );
  });
});
