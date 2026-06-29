import type { Itinerary, ItineraryDay, TravelDuration, TripPace, TripPreferences } from "@/types/travel";

export function getDayCountForDuration(duration: TravelDuration): number {
  switch (duration) {
    case "day-trip":
      return 1;
    case "one-night":
      return 2;
    case "two-nights":
      return 3;
    case "three-nights":
      return 4;
  }
}

export function getDurationLabel(duration: TravelDuration): string {
  switch (duration) {
    case "day-trip":
      return "당일치기";
    case "one-night":
      return "1박 2일";
    case "two-nights":
      return "2박 3일";
    case "three-nights":
      return "3박 4일";
  }
}

export function getDefaultItineraryDays(duration: TravelDuration): ItineraryDay[] {
  const count = getDayCountForDuration(duration);
  return Array.from({ length: count }, (_, index) => (index + 1) as ItineraryDay);
}

export function inferDurationFromDayCount(dayCount: number): TravelDuration | null {
  if (dayCount <= 1) return "day-trip";
  if (dayCount === 2) return "one-night";
  if (dayCount === 3) return "two-nights";
  if (dayCount >= 4) return "three-nights";
  return null;
}

export function collectItineraryDays(itinerary: Itinerary | undefined): ItineraryDay[] {
  if (!itinerary) return [1];

  const fromData = new Set<ItineraryDay>();
  itinerary.stops.forEach((stop) => fromData.add(stop.day));
  itinerary.timeline.forEach((item) => fromData.add(item.day ?? 1));

  if (fromData.size === 0) return [1];
  return Array.from(fromData).sort((a, b) => a - b) as ItineraryDay[];
}

export function collectItineraryDaysFromStops(
  stops: Array<{ day: ItineraryDay }>,
): ItineraryDay[] {
  const fromData = new Set<ItineraryDay>();
  stops.forEach((stop) => fromData.add(stop.day));
  if (fromData.size === 0) return [1];
  return Array.from(fromData).sort((a, b) => a - b) as ItineraryDay[];
}

export function isLastTripDay(day: number, duration: TravelDuration): boolean {
  return day === getDayCountForDuration(duration);
}

export type TripDayPosition = "first" | "middle" | "last";

/** Day가 첫날·중간·마지막 중 어디에 해당하는지 */
export function resolveTripDayPosition(day: number, duration: TravelDuration): TripDayPosition {
  const dayCount = getDayCountForDuration(duration);
  if (dayCount === 1) return "last";
  if (day === 1) return "first";
  if (day === dayCount) return "last";
  return "middle";
}

const ATTRACTION_CAPS: Record<TripPace, Record<TripDayPosition, number>> = {
  relaxed: { first: 2, middle: 2, last: 1 },
  balanced: { first: 2, middle: 3, last: 2 },
  packed: { first: 3, middle: 4, last: 2 },
};

const DAY_TRIP_ATTRACTION_CAPS: Record<TripPace, number> = {
  relaxed: 2,
  balanced: 3,
  packed: 3,
};

export type DiningSlotRole = "start" | "middle" | "end";

/** 귀가일(마지막 Day) — 당일치기는 제외 */
export function isTripDepartureDay(day: number, duration: TravelDuration): boolean {
  return isLastTripDay(day, duration) && duration !== "day-trip";
}

/** 첫날(숙박) — 당일치기는 제외 */
export function isTripFirstDay(day: number, duration: TravelDuration): boolean {
  return day === 1 && duration !== "day-trip";
}

/** Day별 식사 슬롯 역할 — 당일·첫날: 점심·저녁 / 귀가일: 아침·점심 / 중간: 3끼 */
export function getDiningSlotRolesForDay(
  day: number,
  duration: TravelDuration,
): readonly DiningSlotRole[] {
  if (duration === "day-trip" || isTripFirstDay(day, duration)) {
    return ["middle", "end"];
  }
  if (isLastTripDay(day, duration)) {
    return ["start", "middle"];
  }
  return ["start", "middle", "end"];
}

/** 관광지(식당·숙박 제외) Day별 상한 */
export function getMaxAttractionStopsForDay(
  day: number,
  pace: TripPace,
  duration: TravelDuration,
): number {
  if (duration === "day-trip") {
    return DAY_TRIP_ATTRACTION_CAPS[pace];
  }
  const position = resolveTripDayPosition(day, duration);
  return ATTRACTION_CAPS[pace][position];
}

/** Day별 식사 슬롯 수 */
export function getDiningSlotsForDay(day: number, duration: TravelDuration): number {
  return getDiningSlotRolesForDay(day, duration).length;
}

/** 일정에 넣을 관광지(식당 제외) 상한 — must_go 우선, interested는 여유분만 */
export function getMaxAttractionStopsForTrip(
  preferences: Pick<TripPreferences, "duration" | "pace">,
): number {
  const dayCount = getDayCountForDuration(preferences.duration);
  let total = 0;
  for (let day = 1; day <= dayCount; day += 1) {
    total += getMaxAttractionStopsForDay(day, preferences.pace, preferences.duration);
  }
  return total;
}

/** DataLab 보강 등 단일 Day 기준치 — 중간 Day가 있으면 중간, 없으면 첫날 */
export function getReferenceAttractionDayCap(
  preferences: Pick<TripPreferences, "duration" | "pace">,
): number {
  const dayCount = getDayCountForDuration(preferences.duration);
  const referenceDay = dayCount >= 3 ? 2 : 1;
  return getMaxAttractionStopsForDay(referenceDay, preferences.pace, preferences.duration);
}
