import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { rankRecommendations } from "@/services/recommendation/recommendationRanker";
import type { RecommendationCandidate } from "@/services/recommendation/candidateGenerator";
import type { TripPreferences } from "@/types/travel";

const preferences: TripPreferences = {
  zoneId: "gangneung-yangyang",
  travelDate: "2026-06-15",
  travelers: 2,
  duration: "two-nights",
  themes: ["nature", "rest"],
  transportation: "car",
  companion: "couple",
  pace: "balanced",
  season: "summer",
  travelPurpose: "coast",
};

describe("rankRecommendations", () => {
  it("badge와 점수를 계산해 내림차순 정렬한다", () => {
    const candidates: RecommendationCandidate[] = [
      {
        zoneBucket: "gangneung",
        place: {
          id: "a",
          name: "안목해변",
          category: "sea",
          region: "gangneung-yangyang",
          description: "",
          signature: "",
          tags: ["nature"],
          operatingHours: "09:00-20:00",
          estimatedDuration: "90분",
          distanceNote: "",
          recommendationReason: "",
          gradient: "from-pine to-mist",
          coordinates: { lat: 37.77, lng: 128.95 },
          reservationRequired: false,
          partner: true,
          qrAvailable: false,
          availableSlots: [],
        },
      },
      {
        zoneBucket: "gangneung",
        place: {
          id: "b",
          name: "실내 전시관",
          category: "experience",
          region: "gangneung-yangyang",
          description: "",
          signature: "",
          tags: ["culture"],
          operatingHours: "10:00-18:00",
          estimatedDuration: "60분",
          distanceNote: "",
          recommendationReason: "",
          gradient: "from-pine to-mist",
          coordinates: { lat: 37.75, lng: 128.9 },
          reservationRequired: false,
          partner: false,
          qrAvailable: false,
          availableSlots: [],
        },
      },
    ];

    const ranked = rankRecommendations(candidates, preferences);
    assert.equal(ranked.length, 2);
    assert.ok(ranked[0].score >= ranked[1].score);
    assert.ok(ranked[0].badges.length > 0);
  });
});
