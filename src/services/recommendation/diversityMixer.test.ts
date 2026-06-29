import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildRecommendationSections,
  countDuplicatePlaceIdsAcrossSections,
  RECOMMENDATION_ITEMS_PER_SECTION,
} from "@/services/recommendation/diversityMixer";
import type { RankedRecommendation } from "@/services/recommendation/recommendationRanker";

function mockRanked(count: number): RankedRecommendation[] {
  return Array.from({ length: count }, (_, index) => ({
    place: {
      id: `place-${index}`,
      name:
        index % 5 === 0
          ? `해변 전망 ${index}`
          : index % 5 === 1
            ? `로컬 시장 ${index}`
            : index % 5 === 2
              ? `전시관 ${index}`
              : index % 5 === 3
                ? `산책로 ${index}`
                : `체험 공원 ${index}`,
      category: "experience",
      region: "gangneung-yangyang",
      description: "",
      signature: "",
      tags: [],
      operatingHours: "09:00-18:00",
      estimatedDuration: "90분",
      distanceNote: "",
      recommendationReason: "",
      gradient: "from-pine to-mist",
      coordinates: { lat: 37.75 + index * 0.001, lng: 128.9 },
      reservationRequired: false,
      partner: false,
      qrAvailable: false,
      availableSlots: [],
    },
    zoneBucket: index % 3 === 0 ? "gangneung" : index % 3 === 1 ? "yangyang" : "other",
    score: 1 - index * 0.01,
    badges: [],
    emotionLine: "테스트",
  }));
}

describe("buildRecommendationSections", () => {
  it("섹션 간 place id가 겹치지 않는다", () => {
    const sections = buildRecommendationSections(mockRanked(80));
    assert.equal(countDuplicatePlaceIdsAcrossSections(sections), 0);
  });

  it("후보가 충분하면 섹션당 목표 카드 수를 채운다", () => {
    const sections = buildRecommendationSections(mockRanked(80));
    for (const section of sections) {
      assert.ok(section.items.length >= Math.min(4, RECOMMENDATION_ITEMS_PER_SECTION));
    }
  });

  it("더 둘러보기 섹션을 추가하고 기존 섹션과 겹치지 않는다", () => {
    const sections = buildRecommendationSections(mockRanked(120));
    const more = sections.find((section) => section.id === "more");
    assert.ok(more);
    assert.ok(more!.items.length > 0);
    assert.equal(countDuplicatePlaceIdsAcrossSections(sections), 0);
  });

  it("분위기가 다른 대안은 앞 섹션에 없는 장소만 포함한다", () => {
    const sections = buildRecommendationSections(mockRanked(80));
    const hidden = sections.find((section) => section.id === "hidden");
    assert.ok(hidden);
    const priorIds = new Set(
      sections.filter((section) => section.id !== "hidden").flatMap((section) => section.items.map((item) => item.place.id)),
    );
    for (const item of hidden!.items) {
      assert.equal(priorIds.has(item.place.id), false);
    }
  });
});
