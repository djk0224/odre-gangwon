import { isCaveVisitDiscouraged } from "@/lib/caveVisitConditions";
import { resolveDayScheduleBudget } from "@/lib/itineraryDayPlanner";
import { parseEstimatedDurationMinutes } from "@/services/itineraryEditService";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import { countItineraryReservationProgress } from "@/services/reservationService";
import {
  collectReservationExecutionIssues,
  collectScheduleFeasibilityIssues,
  isDataLabFeasibilityCode,
} from "@/lib/itineraryFeasibilityChecks";
import type {
  FeasibilityIssue,
  Itinerary,
  QRTicket,
  ReservationRecord,
  TripPreferences,
} from "@/types/travel";
import type { ExecutionSignals, RoutingSource } from "@/lib/executionKernel/types";
import type { AiProvider } from "@/services/ai/types";

function issue(
  code: string,
  message: string,
  severity: FeasibilityIssue["severity"] = "warning",
): FeasibilityIssue {
  return { id: `feas-${code}`, code, message, severity };
}

export function verifyItineraryFeasibility(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options?: {
    reservations?: ReservationRecord[];
    qrTickets?: QRTicket[];
    weatherSummary?: string | null;
    routingSource?: RoutingSource;
    selectionWarnings?: string[];
  },
): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];

  for (const warning of options?.selectionWarnings ?? []) {
    issues.push(issue("selection", warning, "warning"));
  }

  if (options?.routingSource === "haversine") {
    issues.push(
      issue(
        "routing_haversine",
        "이동 시간은 직선 추정입니다. Kakao REST 키를 설정하면 실경로 기반으로 정확해집니다.",
        "warning",
      ),
    );
  }

  const budget = resolveDayScheduleBudget(preferences.pace);
  const minutesByDay = new Map<number, number>();

  for (const stop of itinerary.stops) {
    const place = getCatalogPlaceById(stop.placeId);
    const stay = place ? parseEstimatedDurationMinutes(place.estimatedDuration) : 60;
    const travel = stop.travelMinutesToNext ?? 0;
    const day = stop.day;
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + stay + travel + 10);

    if (
      place &&
      isCaveVisitDiscouraged({
        season: preferences.season,
        weatherSummary: options?.weatherSummary,
      }) &&
      place.category === "cave"
    ) {
      issues.push(
        issue(
          "cave_weather",
          `${place.name}은(는) 겨울·강수 시 비추천입니다. 일정에서 제외하거나 실내·해안 대안을 검토하세요.`,
          "warning",
        ),
      );
    }
  }

  for (const [day, minutes] of minutesByDay) {
    if (minutes > budget.maxActiveMinutes) {
      issues.push(
        issue(
          "day_overload",
          `${day}일차 활동 시간이 약 ${minutes}분으로, 선택한 페이스 상한(${budget.maxActiveMinutes}분)을 넘을 수 있습니다.`,
          "warning",
        ),
      );
    }
  }

  const progress = countItineraryReservationProgress(
    itinerary,
    options?.reservations ?? [],
  );
  if (progress.pending > 0) {
    issues.push(
      issue(
        "reservation_pending",
        `제휴 입장 예약이 ${progress.pending}건 남았습니다. 예약 탭에서 슬롯을 확정하세요.`,
        "warning",
      ),
    );
  }

  issues.push(
    ...collectScheduleFeasibilityIssues(itinerary, preferences, issue),
    ...collectReservationExecutionIssues(
      itinerary,
      options?.reservations ?? [],
      options?.qrTickets ?? [],
      issue,
    ),
  );

  if (itinerary.stops.length === 0) {
    issues.push(issue("empty_itinerary", "방문 장소가 없습니다.", "error"));
  }

  return issues;
}

export function resolveExecutionProvider(
  base: AiProvider,
  issues: FeasibilityIssue[],
): AiProvider {
  if (base === "rules" || base === "ai+verified") return base;
  const hasError = issues.some((item) => item.severity === "error");
  if (hasError) return base;
  return "ai+verified";
}

/** 클라이언트 예약·QR 변경 후 커널 DataLab 이슈는 유지하고 실행 검증만 갱신 */
export function refreshClientItineraryFeasibility(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options?: {
    reservations?: ReservationRecord[];
    qrTickets?: QRTicket[];
    weatherSummary?: string | null;
  },
): Itinerary {
  const preserved = (itinerary.feasibilityIssues ?? []).filter((item) =>
    isDataLabFeasibilityCode(item.code),
  );
  const core = verifyItineraryFeasibility(itinerary, preferences, {
    reservations: options?.reservations,
    qrTickets: options?.qrTickets,
    weatherSummary: options?.weatherSummary,
    routingSource: itinerary.routingSource === "kakao" ? "kakao" : "haversine",
  });

  const seen = new Set<string>();
  const merged: FeasibilityIssue[] = [];
  for (const item of [...core, ...preserved]) {
    const key = `${item.code}:${item.message}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return { ...itinerary, feasibilityIssues: merged };
}

export function attachFeasibilityToItinerary(
  itinerary: Itinerary,
  issues: FeasibilityIssue[],
  signals: ExecutionSignals,
): Itinerary {
  return {
    ...itinerary,
    feasibilityIssues: issues,
    routingSource: signals.routingSource,
    executionDataMode: signals.dataMode,
  };
}
