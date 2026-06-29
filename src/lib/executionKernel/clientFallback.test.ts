import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultPreferences } from "@/data/mockTravelData";
import { buildItineraryClientFallback } from "@/lib/executionKernel/clientFallback";

describe("buildItineraryClientFallback", () => {
  it("builds itinerary from ordered place ids without server kernel", async () => {
    const result = await buildItineraryClientFallback({
      preferences: defaultPreferences,
      orderedPlaceIds: ["hwanseon-cave", "samcheok-cablecar"],
      preserveOrder: true,
    });

    assert.ok(result.itinerary.stops.length >= 2);
    assert.equal(result.provider, "rules");
    assert.equal(result.itinerary.routingSource, "haversine");
  });

  it("builds itinerary from preferences when ordered ids are missing", async () => {
    const result = await buildItineraryClientFallback({
      preferences: defaultPreferences,
    });

    assert.ok(result.itinerary.stops.length >= 1);
    assert.equal(result.provider, "rules");
  });
});
