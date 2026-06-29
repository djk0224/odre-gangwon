import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isDiningCategory, isDiningPlace } from "@/lib/itineraryMeals";
import type { Place } from "@/types/travel";

const sample = {
  id: "sample",
  name: "샘플",
  region: "samcheok-donghae",
  description: "",
  coordinates: { lat: 37.4, lng: 129.1 },
  estimatedDuration: "1시간",
  gradient: "from-pine to-mist",
} as Place;

describe("isDiningPlace", () => {
  it("시장은 식당이 아니라 관광지로 취급한다", () => {
    assert.equal(isDiningCategory("market"), false);
    assert.equal(isDiningPlace({ ...sample, category: "market" }), false);
  });

  it("음식점·카페만 식사 정류장이다", () => {
    assert.equal(isDiningCategory("restaurant"), true);
    assert.equal(isDiningCategory("cafe"), true);
    assert.equal(isDiningPlace({ ...sample, category: "restaurant" }), true);
    assert.equal(isDiningPlace({ ...sample, category: "cafe" }), true);
  });
});
