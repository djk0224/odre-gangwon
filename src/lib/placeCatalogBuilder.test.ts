import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrichMissingPlaceImages } from "@/lib/placeCatalogBuilder";
import type { Place } from "@/types/travel";

const basePlace: Place = {
  id: "test-1",
  name: "테스트 장소",
  category: "experience",
  region: "gangneung-yangyang",
  description: "",
  signature: "",
  tags: [],
  operatingHours: "09:00-18:00",
  estimatedDuration: "1시간",
  distanceNote: "",
  recommendationReason: "",
  gradient: "from-pine to-mist",
  coordinates: { lat: 37.75, lng: 128.9 },
  reservationRequired: false,
  partner: false,
  qrAvailable: false,
  availableSlots: [],
};

describe("enrichMissingPlaceImages", () => {
  it("권역 대표 이미지로 imageUrl이 없는 장소를 보강한다", () => {
    const withPhoto: Place = {
      ...basePlace,
      id: "with-photo",
      name: "해변 전망대",
      imageUrl: "https://example.com/beach.jpg",
    };
    const withoutPhoto: Place = { ...basePlace, id: "no-photo" };
    const enriched = enrichMissingPlaceImages([withPhoto, withoutPhoto]);
    const target = enriched.find((place) => place.id === "no-photo");
    assert.ok(target?.imageUrl);
    assert.equal(target.imageUrl, "https://example.com/beach.jpg");
  });
});
