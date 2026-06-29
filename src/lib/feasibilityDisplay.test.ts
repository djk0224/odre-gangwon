import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  filterTravelerFeasibilityIssues,
  groupFeasibilityIssuesForDisplay,
} from "@/lib/feasibilityDisplay";
import type { FeasibilityIssue } from "@/types/travel";

function issue(
  code: string,
  message: string,
  severity: FeasibilityIssue["severity"] = "warning",
): FeasibilityIssue {
  return { id: code, code, message, severity };
}

describe("feasibilityDisplay", () => {
  it("hides developer routing hint from traveler UI", () => {
    const filtered = filterTravelerFeasibilityIssues([
      issue(
        "routing_haversine",
        "이동 시간은 직선 추정입니다. Kakao REST 키를 설정하면 실경로 기반으로 정확해집니다.",
      ),
      issue("reservation_pending", "제휴 입장 예약이 1건 남았습니다."),
    ]);
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0]?.code, "reservation_pending");
  });

  it("groups repetitive meal-window warnings", () => {
    const grouped = groupFeasibilityIssuesForDisplay([
      issue("meal_window_a", "산야 식사 시간대(점심·저녁) 밖에 배치되어 있어 현장 대기가 길어질 수 있습니다."),
      issue("meal_window_b", "굴뚝촌 식사 시간대(점심·저녁) 밖에 배치되어 있어 현장 대기가 길어질 수 있습니다."),
      issue("reservation_pending", "제휴 입장 예약이 1건 남았습니다."),
    ]);

    const mealGroup = grouped.find(
      (item) => item.kind === "group" && item.id === "group-meal-window",
    );
    assert.ok(mealGroup && mealGroup.kind === "group");
    assert.match(mealGroup.summary, /식당 2곳/);
    assert.deepEqual(mealGroup.details, ["산야", "굴뚝촌"]);
  });

  it("groups lodging depot warnings by day", () => {
    const grouped = groupFeasibilityIssuesForDisplay([
      issue(
        "lodging_depot_missing_2",
        "Day 2 숙소 기준점이 비어 있어 숙소 기반 동선이 일부 생략됩니다.",
      ),
      issue(
        "lodging_depot_missing_3",
        "Day 3 숙소 기준점이 비어 있어 숙소 기반 동선이 일부 생략됩니다.",
      ),
    ]);

    const lodgingGroup = grouped.find(
      (item) => item.kind === "group" && item.id === "group-lodging-depot",
    );
    assert.ok(lodgingGroup && lodgingGroup.kind === "group");
    assert.match(lodgingGroup.summary, /Day 2 · Day 3/);
  });
});
