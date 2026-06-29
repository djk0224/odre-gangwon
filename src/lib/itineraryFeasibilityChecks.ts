import { parseEstimatedDurationMinutes } from "@/services/itineraryEditService";
import { isDiningCategory } from "@/lib/itineraryMeals";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import { getSlotById } from "@/services/reservationService";
import { syncReservationExecutionStatus } from "@/lib/tripExecutionReservation";
import { isLodgingPlanActive } from "@/lib/tripLodgingPlan";
import type {
  FeasibilityIssue,
  Itinerary,
  ItineraryStop,
  Place,
  QRTicket,
  ReservationRecord,
  TripPace,
  TripPreferences,
} from "@/types/travel";

export function parseOperatingHoursWindow(
  operatingHours: string,
): { openMin: number; closeMin: number } | null {
  const match = operatingHours.match(
    /(\d{1,2}):(\d{2})\s*[-~–]\s*(\d{1,2}):(\d{2})/,
  );
  if (!match) return null;

  const openMin = Number(match[1]) * 60 + Number(match[2]);
  const closeMin = Number(match[3]) * 60 + Number(match[4]);
  if (closeMin <= openMin) return null;
  return { openMin, closeMin };
}

function dayStartMinutes(pace: TripPace): number {
  if (pace === "relaxed") return 9 * 60 + 30;
  if (pace === "packed") return 8 * 60 + 30;
  return 9 * 60;
}

function formatClock(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function estimateStopVisitWindows(
  stops: ItineraryStop[],
  pace: TripPace,
): Map<string, { startMin: number; endMin: number }> {
  const byDay = new Map<number, ItineraryStop[]>();
  for (const stop of stops) {
    const list = byDay.get(stop.day) ?? [];
    list.push(stop);
    byDay.set(stop.day, list);
  }

  const windows = new Map<string, { startMin: number; endMin: number }>();

  for (const dayStops of byDay.values()) {
    const ordered = [...dayStops].sort((a, b) => a.order - b.order);
    let cursor = dayStartMinutes(pace);

    for (let index = 0; index < ordered.length; index += 1) {
      const stop = ordered[index];
      const place = getCatalogPlaceById(stop.placeId);
      const stay = place
        ? parseEstimatedDurationMinutes(place.estimatedDuration)
        : parseEstimatedDurationMinutes(stop.duration);
      const startMin = cursor;
      const endMin = startMin + stay;
      windows.set(stop.id, { startMin, endMin });
      const travel = stop.travelMinutesToNext ?? (index < ordered.length - 1 ? 20 : 0);
      cursor = endMin + travel;
    }
  }

  return windows;
}

export function collectScheduleFeasibilityIssues(
  itinerary: Itinerary,
  preferences: TripPreferences,
  issue: (
    code: string,
    message: string,
    severity?: FeasibilityIssue["severity"],
  ) => FeasibilityIssue,
): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];
  const windows = estimateStopVisitWindows(itinerary.stops, preferences.pace);

  const lunchStart = 11 * 60;
  const lunchEnd = 14 * 60;
  const dinnerStart = 17 * 60;
  const dinnerEnd = 20 * 60 + 30;

  let lastDayEnd = 0;
  const dayTravelMinutes = new Map<number, number>();
  const dayEndMinutes = new Map<number, number>();

  for (const stop of itinerary.stops) {
    const place = getCatalogPlaceById(stop.placeId);
    const window = windows.get(stop.id);
    if (!place || !window) continue;

    lastDayEnd = Math.max(lastDayEnd, window.endMin);
    dayEndMinutes.set(stop.day, Math.max(dayEndMinutes.get(stop.day) ?? 0, window.endMin));
    dayTravelMinutes.set(
      stop.day,
      (dayTravelMinutes.get(stop.day) ?? 0) +
        (stop.travelMinutesToNext ?? 0) +
        (stop.returnToLodgingMinutes ?? 0),
    );

    const hours = parseOperatingHoursWindow(place.operatingHours);
    if (hours) {
      if (window.startMin < hours.openMin) {
        issues.push(
          issue(
            `hours_early_${stop.placeId}`,
            `${place.name}은(는) ${formatClock(hours.openMin)} 개장 전에 도착할 수 있습니다(추정 ${formatClock(window.startMin)}).`,
          ),
        );
      }
      if (window.endMin > hours.closeMin) {
        issues.push(
          issue(
            `hours_late_${stop.placeId}`,
            `${place.name} 방문이 운영 종료(${formatClock(hours.closeMin)}) 이후까지 이어질 수 있습니다.`,
            "warning",
          ),
        );
      }
    }

    if (isDiningCategory(place.category)) {
      const inLunch = window.startMin >= lunchStart && window.startMin <= lunchEnd;
      const inDinner = window.startMin >= dinnerStart && window.startMin <= dinnerEnd;
      if (!inLunch && !inDinner) {
        issues.push(
          issue(
            `meal_window_${stop.placeId}`,
            `${place.name} 식사 시간대(점심·저녁) 밖에 배치되어 있어 현장 대기가 길어질 수 있습니다.`,
          ),
        );
      }
    }
  }

  if (preferences.transportation === "public-transit" && lastDayEnd >= 22 * 60 + 30) {
    issues.push(
      issue(
        "transit_last_train",
        "대중교통 기준으로 일정 종료가 늦습니다. 막차·환승 시간을 확인하세요.",
        "warning",
      ),
    );
  }

  if (isLodgingPlanActive(itinerary.lodgingPlan)) {
    for (const day of [...new Set(itinerary.stops.map((stop) => stop.day))]) {
      const legs = itinerary.dayLodgingLegs?.[day];
      if (!legs?.start || !legs?.end) {
        issues.push(
          issue(
            `lodging_depot_missing_${day}`,
            `Day ${day} 숙소 기준점이 비어 있어 숙소 기반 동선이 일부 생략됩니다.`,
            "warning",
          ),
        );
      }

      const travelMinutes = dayTravelMinutes.get(day) ?? 0;
      if (travelMinutes >= 240) {
        issues.push(
          issue(
            `daily_travel_long_${day}`,
            `Day ${day} 이동 시간이 길어요(약 ${travelMinutes}분). 장소 수를 줄이거나 권역을 나누는 것을 권장합니다.`,
            "warning",
          ),
        );
      }

      const dayEnd = dayEndMinutes.get(day) ?? 0;
      if ((legs?.dayType === "arrival_to_hotel" || legs?.dayType === "hotel_to_hotel") && dayEnd >= 21 * 60) {
        issues.push(
          issue(
            `late_hotel_arrival_${day}`,
            `Day ${day} 숙소 도착이 늦어질 수 있습니다(추정 ${formatClock(dayEnd)}).`,
            "warning",
          ),
        );
      }
    }
  }

  return issues;
}

export function collectReservationExecutionIssues(
  itinerary: Itinerary,
  reservations: ReservationRecord[],
  qrTickets: QRTicket[],
  issue: (
    code: string,
    message: string,
    severity?: FeasibilityIssue["severity"],
  ) => FeasibilityIssue,
): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];
  const ticketByReservation = new Map(
    qrTickets.map((ticket) => [ticket.reservationId, ticket]),
  );

  for (const reservation of reservations) {
    if (!reservation.payment?.paidAt) {
      issues.push(
        issue(
          `payment_pending_${reservation.id}`,
          `${reservation.placeName} 결제 확인이 필요합니다.`,
          "error",
        ),
      );
    }

    const ticket = ticketByReservation.get(reservation.id);
    const status = syncReservationExecutionStatus(reservation, ticket);

    if (status === "confirmed" || status === "slot_selected" || status === "payment_pending") {
      issues.push(
        issue(
          `qr_pending_${reservation.id}`,
          `${reservation.placeName} QR 티켓이 아직 발급되지 않았습니다.`,
        ),
      );
    }

    if (ticket?.checkInStatus === "ready") {
      const slot = getSlotById(reservation.placeId, reservation.slotId);
      if (slot) {
        const remaining = slot.capacity - slot.reservedCount;
        if (reservation.travelers > remaining) {
          issues.push(
            issue(
              `slot_capacity_${reservation.id}`,
              `${reservation.placeName} 선택 슬롯(${reservation.slotLabel}) 잔여 좌석이 부족할 수 있습니다.`,
            ),
          );
        }
      }
    }
  }

  const partnerStopIds = new Set(
    itinerary.stops
      .filter((stop) => stop.partner && stop.reservationRequired)
      .map((stop) => stop.placeId),
  );
  const reservedIds = new Set(reservations.map((item) => item.placeId));

  for (const placeId of partnerStopIds) {
    if (!reservedIds.has(placeId)) continue;
    const reservation = reservations.find((item) => item.placeId === placeId);
    if (!reservation) continue;
    if (!ticketByReservation.has(reservation.id)) {
      issues.push(
        issue(
          `qr_missing_${placeId}`,
          `${reservation.placeName} 예약은 있으나 QR 티켓이 연결되지 않았습니다.`,
          "error",
        ),
      );
    }
  }

  return issues;
}

export function isDataLabFeasibilityCode(code: string): boolean {
  return (
    code === "datalab_snapshot_missing" ||
    code === "zone_demand_high" ||
    code.startsWith("concentration_")
  );
}
