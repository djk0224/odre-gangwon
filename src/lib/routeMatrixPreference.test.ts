import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resolveRouteMatrixOptions } from "@/lib/routeMatrixPreference";

describe("resolveRouteMatrixOptions", () => {
  it("fast profile always uses haversine", () => {
    const opts = resolveRouteMatrixOptions(4, "visit-order", "fast");
    assert.equal(opts.mode, "haversine");
    assert.equal(opts.preferHaversine, true);
  });

  it("falls back to haversine without Kakao key", () => {
    const opts = resolveRouteMatrixOptions(4, "visit-order", "accurate");
    assert.equal(opts.mode, "haversine");
    assert.equal(opts.preferHaversine, true);
  });

  it("uses smaller threshold for day-local than visit-order when Kakao is configured", () => {
    const visit = resolveRouteMatrixOptions(8, "visit-order");
    const dayLocal = resolveRouteMatrixOptions(8, "day-local");

    assert.equal(visit.mode, dayLocal.mode);
    if (visit.mode === "kakao-road") {
      assert.equal(visit.preferHaversine, false);
      assert.equal(dayLocal.preferHaversine, false);
    }
  });
});
