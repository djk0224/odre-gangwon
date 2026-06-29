import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { recalculateItineraryMeta } from "@/services/itineraryEditService";
import type { Itinerary, TripPreferences } from "@/types/travel";

const preferences: TripPreferences = {
  zoneId: "samcheok-donghae",
  startDate: "2026-06-01",
  duration: "1박2일",
  travelers: 2,
  theme: "sea",
  transportation: "car",
  companions: "couple",
  pace: "balanced",
  season: "summer",
};

describe("recalculateItineraryMeta", () => {
  it("preserves aiExplanation when preserveNarrative is set", async () => {
    const itinerary = {
      id: "it-1",
      aiExplanation: "AI가 만든 설명",
      alternatives: ["대안 A"],
      stops: [],
      days: [],
      movingTime: "",
      totalTravelMinutes: 0,
    } as Itinerary;

    const next = await recalculateItineraryMeta(itinerary, preferences, {
      skipTravelEnrich: true,
      preserveNarrative: true,
    });

    assert.equal(next.aiExplanation, "AI가 만든 설명");
    assert.deepEqual(next.alternatives, ["대안 A"]);
  });

  it("overwrites aiExplanation on edit recalc by default", async () => {
    const itinerary = {
      id: "it-1",
      aiExplanation: "AI가 만든 설명",
      alternatives: [],
      stops: [],
      days: [],
      movingTime: "",
      totalTravelMinutes: 0,
    } as Itinerary;

    const next = await recalculateItineraryMeta(itinerary, preferences, {
      skipTravelEnrich: true,
    });

    assert.match(next.aiExplanation, /편집한 방문 순서/);
  });
});
