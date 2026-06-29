import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getDiningSlotRolesForDay,
  getDiningSlotsForDay,
  getMaxAttractionStopsForDay,
  getMaxAttractionStopsForTrip,
  resolveTripDayPosition,
} from "@/lib/travelDuration";
import type { TripPreferences } from "@/types/travel";

const base: TripPreferences = {
  zoneId: "samcheok-donghae",
  travelDate: "2026-06-15",
  travelers: 2,
  duration: "two-nights",
  themes: ["nature"],
  transportation: "car",
  companion: "couple",
  pace: "balanced",
  season: "summer",
  travelPurpose: "coast",
};

describe("travelDuration pace caps", () => {
  it("당일치기 관광지 상한은 여유2·균형3·알찬3", () => {
    assert.equal(getMaxAttractionStopsForDay(1, "relaxed", "day-trip"), 2);
    assert.equal(getMaxAttractionStopsForDay(1, "balanced", "day-trip"), 3);
    assert.equal(getMaxAttractionStopsForDay(1, "packed", "day-trip"), 3);
    assert.equal(getMaxAttractionStopsForTrip({ ...base, duration: "day-trip", pace: "balanced" }), 3);
  });

  it("첫날(1박2일 Day1) 식사 슬롯은 점심·저녁", () => {
    assert.deepEqual(getDiningSlotRolesForDay(1, "one-night"), ["middle", "end"]);
    assert.deepEqual(getDiningSlotRolesForDay(2, "one-night"), ["start", "middle"]);
  });

  it("2박3일 중간 Day는 3끼", () => {
    assert.deepEqual(getDiningSlotRolesForDay(1, "two-nights"), ["middle", "end"]);
    assert.deepEqual(getDiningSlotRolesForDay(2, "two-nights"), ["start", "middle", "end"]);
    assert.deepEqual(getDiningSlotRolesForDay(3, "two-nights"), ["start", "middle"]);
  });

  it("당일치기 식사 슬롯은 점심·저녁(middle/end)", () => {
    assert.deepEqual(getDiningSlotRolesForDay(1, "day-trip"), ["middle", "end"]);
    assert.equal(getDiningSlotsForDay(1, "day-trip"), 2);
  });

  it("첫날·중간·마지막 관광지 상한을 페이스별로 적용한다 (숙박)", () => {
    assert.equal(getMaxAttractionStopsForDay(1, "relaxed", "two-nights"), 2);
    assert.equal(getMaxAttractionStopsForDay(2, "relaxed", "two-nights"), 2);
    assert.equal(getMaxAttractionStopsForDay(3, "relaxed", "two-nights"), 1);

    assert.equal(getMaxAttractionStopsForDay(1, "balanced", "two-nights"), 2);
    assert.equal(getMaxAttractionStopsForDay(2, "balanced", "two-nights"), 3);
    assert.equal(getMaxAttractionStopsForDay(3, "balanced", "two-nights"), 2);

    assert.equal(getMaxAttractionStopsForDay(1, "packed", "two-nights"), 3);
    assert.equal(getMaxAttractionStopsForDay(2, "packed", "two-nights"), 4);
    assert.equal(getMaxAttractionStopsForDay(3, "packed", "two-nights"), 2);
  });

  it("당일치기는 day-trip 전용 규칙을 쓰고 last 포지션이 아니다", () => {
    assert.equal(resolveTripDayPosition(1, "day-trip"), "last");
  });

  it("1박2일은 첫날·마지막날만 있다", () => {
    assert.equal(getMaxAttractionStopsForTrip({ ...base, duration: "one-night", pace: "balanced" }), 4);
    assert.equal(getMaxAttractionStopsForTrip({ ...base, duration: "one-night", pace: "packed" }), 5);
  });

  it("2박3일 균형 총 관광지 상한은 2+3+2=7", () => {
    assert.equal(getMaxAttractionStopsForTrip({ ...base, pace: "balanced" }), 7);
  });

  it("3박4일 알찬 총 관광지 상한은 3+4+4+2=13", () => {
    assert.equal(
      getMaxAttractionStopsForTrip({ ...base, duration: "three-nights", pace: "packed" }),
      13,
    );
  });

  it("식사 슬롯 수는 Day 역할에 맞게 계산한다", () => {
    assert.equal(getDiningSlotsForDay(1, "one-night"), 2);
    assert.equal(getDiningSlotsForDay(2, "one-night"), 2);
    assert.equal(getDiningSlotsForDay(2, "two-nights"), 3);
    assert.equal(getDiningSlotsForDay(1, "day-trip"), 2);
  });
});
