import type { FeasibilityIssue } from "@/types/travel";

/** 여행자 UI에서 숨길 개발·내부 검증 코드 */
const TRAVELER_HIDDEN_CODES = new Set(["routing_haversine"]);

export type FeasibilityDisplayItem =
  | { kind: "single"; issue: FeasibilityIssue }
  | {
      kind: "group";
      id: string;
      severity: FeasibilityIssue["severity"];
      summary: string;
      details: string[];
    };

function extractPlacePrefix(message: string): string {
  const match = message.match(/^(.+?)(?:은\(는\)| 방문| 식사| 결제| QR| 예약)/);
  return match?.[1]?.trim() ?? message.slice(0, 24);
}

function groupByPrefix(
  issues: FeasibilityIssue[],
  prefix: string,
): FeasibilityIssue[] {
  return issues.filter((item) => item.code.startsWith(prefix));
}

export function filterTravelerFeasibilityIssues(
  issues: FeasibilityIssue[],
): FeasibilityIssue[] {
  return issues.filter((item) => !TRAVELER_HIDDEN_CODES.has(item.code));
}

export function groupFeasibilityIssuesForDisplay(
  issues: FeasibilityIssue[],
): FeasibilityDisplayItem[] {
  const visible = filterTravelerFeasibilityIssues(issues);
  const result: FeasibilityDisplayItem[] = [];

  const singles = visible.filter((item) => {
    if (item.code.startsWith("meal_window_")) return false;
    if (item.code.startsWith("lodging_depot_missing_")) return false;
    if (item.code.startsWith("hours_early_")) return false;
    if (item.code.startsWith("hours_late_")) return false;
    if (item.code.startsWith("qr_pending_")) return false;
    return true;
  });

  for (const issue of singles) {
    result.push({ kind: "single", issue });
  }

  const mealIssues = groupByPrefix(visible, "meal_window_");
  if (mealIssues.length > 0) {
    const names = mealIssues.map((item) => extractPlacePrefix(item.message));
    result.push({
      kind: "group",
      id: "group-meal-window",
      severity: "warning",
      summary:
        mealIssues.length === 1
          ? `${names[0]}이(가) 점심·저녁 시간 밖에 배치되어 있습니다.`
          : `식당 ${mealIssues.length}곳이 점심·저녁 시간 밖에 배치되어 있습니다.`,
      details: names,
    });
  }

  const lodgingIssues = groupByPrefix(visible, "lodging_depot_missing_");
  if (lodgingIssues.length > 0) {
    const days = lodgingIssues
      .map((item) => {
        const match = item.code.match(/lodging_depot_missing_(\d+)/);
        return match ? `Day ${match[1]}` : null;
      })
      .filter((day): day is string => day !== null);
    result.push({
      kind: "group",
      id: "group-lodging-depot",
      severity: "warning",
      summary:
        lodgingIssues.length === 1
          ? `${days[0]} 숙소 기준점이 없어 숙소 동선이 일부 생략됩니다.`
          : `${days.join(" · ")} 숙소 기준점이 없어 숙소 동선이 일부 생략됩니다.`,
      details: lodgingIssues.map((item) => item.message),
    });
  }

  const hourIssues = [
    ...groupByPrefix(visible, "hours_early_"),
    ...groupByPrefix(visible, "hours_late_"),
  ];
  if (hourIssues.length > 0) {
    const names = hourIssues.map((item) => extractPlacePrefix(item.message));
    result.push({
      kind: "group",
      id: "group-operating-hours",
      severity: "warning",
      summary:
        hourIssues.length === 1
          ? hourIssues[0].message
          : `운영시간과 맞지 않을 수 있는 방문 ${hourIssues.length}곳이 있습니다.`,
      details: hourIssues.map((item) => item.message),
    });
  }

  const qrPending = groupByPrefix(visible, "qr_pending_");
  if (qrPending.length > 1) {
    result.push({
      kind: "group",
      id: "group-qr-pending",
      severity: "warning",
      summary: `QR 티켓 미발급 ${qrPending.length}건 — 예약 탭에서 확인하세요.`,
      details: qrPending.map((item) => item.message),
    });
  }

  const severityRank = (severity: FeasibilityIssue["severity"]) =>
    severity === "error" ? 0 : 1;

  result.sort((a, b) => {
    const aSeverity = a.kind === "single" ? a.issue.severity : a.severity;
    const bSeverity = b.kind === "single" ? b.issue.severity : b.severity;
    return severityRank(aSeverity) - severityRank(bSeverity);
  });

  return result;
}

export function summarizeFeasibilityForCollapsed(
  items: FeasibilityDisplayItem[],
): string {
  const errorCount = items.filter(
    (item) =>
      item.kind === "single"
        ? item.issue.severity === "error"
        : item.severity === "error",
  ).length;
  const warningCount = items.length - errorCount;

  if (errorCount > 0 && warningCount > 0) {
    return `확인 필요 ${errorCount}건 · 참고 ${warningCount}건`;
  }
  if (errorCount > 0) {
    return `확인 필요 ${errorCount}건`;
  }
  if (warningCount > 0) {
    return `참고 ${warningCount}건`;
  }
  return "검증 완료";
}
