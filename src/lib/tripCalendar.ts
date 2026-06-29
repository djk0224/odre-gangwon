import { getDayCountForDuration } from "@/lib/travelDuration";
import type { TravelDuration } from "@/types/travel";

export type TripCalendarPhase = "before" | "active" | "after";

/** 로컬 달력 기준 YYYY-MM-DD (UTC slice 대신) */
export function getLocalDateIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseTravelDateLocal(isoDate: string): Date {
  return new Date(`${isoDate.slice(0, 10)}T12:00:00`);
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = parseTravelDateLocal(isoDate);
  date.setDate(date.getDate() + days);
  return getLocalDateIso(date);
}

export function getTripEndDateIso(
  travelDate: string,
  duration: TravelDuration,
): string {
  const start = travelDate.slice(0, 10);
  const dayCount = getDayCountForDuration(duration);
  return addDaysToIsoDate(start, Math.max(0, dayCount - 1));
}

export function getTripCalendarPhase(
  travelDate: string,
  duration: TravelDuration,
  todayIso = getLocalDateIso(),
): TripCalendarPhase {
  const start = travelDate.slice(0, 10);
  const end = getTripEndDateIso(start, duration);
  if (todayIso < start) return "before";
  if (todayIso > end) return "after";
  return "active";
}

export function getDaysUntilTripStart(
  travelDate: string,
  todayIso = getLocalDateIso(),
): number {
  const start = parseTravelDateLocal(travelDate.slice(0, 10));
  const today = parseTravelDateLocal(todayIso);
  return Math.round((start.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

export function formatTripDepartureLabel(travelDate: string): string {
  const [, m, d] = travelDate.slice(0, 10).split("-");
  return `${Number(m)}월 ${Number(d)}일 출발`;
}

export function getActiveTripFloatingBarCopy(
  travelDate: string,
  duration: TravelDuration,
  todayIso = getLocalDateIso(),
): { eyebrow: string; status: string } {
  const phase = getTripCalendarPhase(travelDate, duration, todayIso);

  if (phase === "active") {
    return { eyebrow: "오늘의 실행 일정", status: "실행 중" };
  }

  if (phase === "before") {
    const daysUntil = getDaysUntilTripStart(travelDate, todayIso);
    const status =
      daysUntil === 1 ? "내일 출발" : daysUntil > 1 ? `D-${daysUntil}` : formatTripDepartureLabel(travelDate);
    return { eyebrow: "예정된 실행 일정", status };
  }

  return { eyebrow: "지난 실행 일정", status: "종료" };
}
