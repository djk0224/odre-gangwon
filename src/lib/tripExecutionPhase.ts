import { getDayCountForDuration } from "@/lib/travelDuration";
import type { TravelDuration } from "@/types/travel";

export type TripExecutionPhase = "before-trip" | "trip-day" | "after-trip";

/** Local calendar date as YYYY-MM-DD (avoids UTC drift from toISOString). */
export function getLocalDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseTravelDateIso(travelDate: string): Date | null {
  const iso = travelDate.slice(0, 10);
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

/** Last calendar day of the trip (inclusive). travelDate is day 1. */
export function getTripEndDateIso(
  travelDate: string,
  duration: TravelDuration,
): string {
  const start = parseTravelDateIso(travelDate);
  if (!start) {
    return travelDate.slice(0, 10);
  }
  const dayCount = getDayCountForDuration(duration);
  start.setDate(start.getDate() + Math.max(0, dayCount - 1));
  return getLocalDateIso(start);
}

export function getTripExecutionPhase(
  travelDate: string,
  duration: TravelDuration,
  todayIso = getLocalDateIso(),
): TripExecutionPhase {
  const startIso = travelDate.slice(0, 10);
  const endIso = getTripEndDateIso(startIso, duration);

  if (todayIso < startIso) {
    return "before-trip";
  }
  if (todayIso > endIso) {
    return "after-trip";
  }
  return "trip-day";
}

export function isTripExecutionDay(
  travelDate: string,
  duration: TravelDuration,
  todayIso = getLocalDateIso(),
): boolean {
  return getTripExecutionPhase(travelDate, duration, todayIso) === "trip-day";
}

/** 1-based itinerary day index while on trip; null when outside the trip window. */
export function getActiveTripDayNumber(
  travelDate: string,
  todayIso = getLocalDateIso(),
): number | null {
  const start = parseTravelDateIso(travelDate);
  if (!start) {
    return null;
  }
  const startIso = getLocalDateIso(start);
  if (todayIso < startIso) {
    return null;
  }
  const today = parseTravelDateIso(todayIso);
  if (!today) {
    return null;
  }
  const diffMs = today.getTime() - start.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays + 1;
}
