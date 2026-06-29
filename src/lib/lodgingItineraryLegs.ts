import {
  isLodgingPlanActive,
  resolveDayLodgingDepots,
  type DayLodgingDepots,
} from "@/lib/tripLodgingPlan";
import { resolveDayRouteAnchors } from "@/lib/lodgingDayAnchors";
import { getDayCountForDuration } from "@/lib/travelDuration";
import { formatMovementLeg, haversineMinutes } from "@/services/engines/routeEngine";
import type {
  Coordinates,
  DayLodgingLegSnapshot,
  Itinerary,
  ItineraryDay,
  ItineraryStop,
  ItineraryTimelineItem,
  Transportation,
  TripLodgingDepot,
  TripLodgingPlan,
  TripPreferences,
} from "@/types/travel";

export function formatLodgingDepartLeg(
  depot: TripLodgingDepot,
  minutes: number,
  transportation: Transportation,
  firstPlaceName: string,
): string {
  return `숙소 출발 · ${depot.name} · ${formatMovementLeg(minutes, transportation, firstPlaceName).replace(/^→\s*/, "")}`;
}

export function formatLodgingReturnLeg(
  depot: TripLodgingDepot,
  minutes: number,
  transportation: Transportation,
): string {
  const mode = transportation === "car" ? "차량" : "대중교통";
  return `→ ${depot.name} 복귀 · ${mode} 약 ${minutes}분`;
}

export function formatInterHotelLeg(
  from: TripLodgingDepot,
  to: TripLodgingDepot,
  minutes: number,
  transportation: Transportation,
): string {
  const mode = transportation === "car" ? "차량" : "대중교통";
  return `숙소 이동 · ${from.name} → ${to.name} · ${mode} 약 ${minutes}분`;
}

export function applyLodgingLegsToStops(
  stops: ItineraryStop[],
  preferences: TripPreferences,
  plan: TripLodgingPlan | undefined,
  dayLegMeta: Partial<
    Record<
      ItineraryDay,
      { departMinutes?: number; returnMinutes?: number; dayDepots?: DayLodgingDepots }
    >
  >,
): ItineraryStop[] {
  if (!plan || !isLodgingPlanActive(plan)) return stops;

  const transportation = preferences.transportation;
  const byDay = new Map<ItineraryDay, ItineraryStop[]>();

  for (const stop of stops) {
    const list = byDay.get(stop.day) ?? [];
    list.push(stop);
    byDay.set(stop.day, list);
  }

  const result: ItineraryStop[] = [];

  for (const [day, dayStops] of byDay.entries()) {
    const sorted = [...dayStops].sort((a, b) => a.order - b.order);
    const depots = dayLegMeta[day]?.dayDepots ?? resolveDayLodgingDepots(day, plan, preferences.duration);
    const meta = dayLegMeta[day];
    const start = depots.start;
    const end = depots.end;

    sorted.forEach((stop, index) => {
      let updated = { ...stop };
      if (index === 0 && start && meta?.departMinutes != null) {
        updated = {
          ...updated,
          movementNote: formatLodgingDepartLeg(
            start,
            meta.departMinutes,
            transportation,
            stop.placeName,
          ),
        };
      }
      if (index === sorted.length - 1 && end && meta?.returnMinutes != null) {
        const returnLabel = formatLodgingReturnLeg(end, meta.returnMinutes, transportation);
        updated = {
          ...updated,
          returnToLodgingMinutes: meta.returnMinutes,
          returnToLodgingLabel: returnLabel,
          movementNote:
            depots.interHotelTransfer && start && end.id !== start.id
              ? formatInterHotelLeg(
                  start,
                  end,
                  meta.returnMinutes,
                  transportation,
                )
              : returnLabel,
        };
      }
      result.push(updated);
    });
  }

  return result.sort((a, b) => a.day - b.day || a.order - b.order);
}

export function buildLodgingTimelineItems(
  itinerary: Itinerary,
  preferences: TripPreferences,
): ItineraryTimelineItem[] {
  const plan = itinerary.lodgingPlan;
  if (!plan || !isLodgingPlanActive(plan)) return [];

  const items: ItineraryTimelineItem[] = [];
  const dayLegs = itinerary.dayLodgingLegs ?? {};
  const days = [...new Set(itinerary.stops.map((s) => s.day))].sort((a, b) => a - b);

  for (const day of days) {
    const snapshot = dayLegs[day];
    const depots = resolveDayLodgingDepots(day, plan, preferences.duration);
    const anchors = resolveDayRouteAnchors(day, preferences, plan);
    const start = snapshot?.start ?? depots.start;
    const dayStops = itinerary.stops.filter((s) => s.day === day).sort((a, b) => a.order - b.order);
    const firstStop = dayStops[0];

    if (start && firstStop) {
      const startLabel =
        anchors.dayType === "arrival_to_hotel" ? `${anchors.start.label} 출발` : `${start.name} 출발`;
      const startDescription =
        anchors.dayType === "arrival_to_hotel"
          ? "출발지에서 숙소 방향으로 이동하는 일정입니다."
          : "숙소에서 당일 일정을 시작합니다.";
      items.push({
        id: `lodging-depart-${day}`,
        kind: "lodging",
        day,
        order: 0,
        title: startLabel,
        description: startDescription,
        duration: "—",
        lodgingDepot: start,
        travelLegToNext: firstStop.movementNote,
      });
    }

    const lastStop = dayStops[dayStops.length - 1];
    const end = snapshot?.end ?? depots.end;
    if (end && lastStop?.returnToLodgingLabel) {
      const endTitle =
        anchors.dayType === "departure_from_hotel"
          ? `${anchors.end.label} 도착`
          : depots.interHotelTransfer
            ? "숙소 이동"
            : `${end.name} 복귀`;
      items.push({
        id: `lodging-return-${day}`,
        kind: "lodging",
        day,
        order: 999,
        title: endTitle,
        description: lastStop.returnToLodgingLabel,
        duration: "—",
        lodgingDepot: end,
      });
    }
  }

  return items;
}

export function mergeLodgingIntoTimeline(
  timeline: ItineraryTimelineItem[],
  lodgingItems: ItineraryTimelineItem[],
): ItineraryTimelineItem[] {
  if (lodgingItems.length === 0) return timeline;

  const byDay = new Map<ItineraryDay, ItineraryTimelineItem[]>();
  for (const item of timeline) {
    const list = byDay.get(item.day) ?? [];
    list.push(item);
    byDay.set(item.day, list);
  }

  for (const lodging of lodgingItems) {
    const list = byDay.get(lodging.day) ?? [];
    if (lodging.order === 0) {
      list.unshift(lodging);
    } else {
      list.push(lodging);
    }
    byDay.set(lodging.day, list);
  }

  const merged: ItineraryTimelineItem[] = [];
  for (const day of [...byDay.keys()].sort((a, b) => a - b)) {
    const dayItems = byDay.get(day) ?? [];
    const places = dayItems
      .filter((i) => i.kind !== "lodging")
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const depart = dayItems.find((i) => i.kind === "lodging" && i.order === 0);
    const ret = dayItems.find((i) => i.kind === "lodging" && (i.order ?? 0) >= 999);
    if (depart) merged.push(depart);
    merged.push(...places);
    if (ret) merged.push(ret);
  }
  return merged;
}

export function attachLodgingToItinerary(
  itinerary: Itinerary,
  preferences: TripPreferences,
  plan: TripLodgingPlan | undefined,
  dayLodgingMeta?: Partial<
    Record<
      ItineraryDay,
      {
        departMinutes: number;
        returnMinutes: number;
        dayType?: import("@/types/travel").LodgingDayType;
      }
    >
  >,
): Itinerary {
  if (!plan || !isLodgingPlanActive(plan)) {
    return itinerary;
  }

  const legInput: Partial<
    Record<
      ItineraryDay,
      { departMinutes?: number; returnMinutes?: number; dayDepots?: DayLodgingDepots }
    >
  > = {};

  const days = [...new Set(itinerary.stops.map((s) => s.day))];
  for (const day of days) {
    legInput[day] = {
      departMinutes: dayLodgingMeta?.[day]?.departMinutes,
      returnMinutes: dayLodgingMeta?.[day]?.returnMinutes,
      dayDepots: resolveDayLodgingDepots(day, plan, preferences.duration),
    };
  }

  const stops = applyLodgingLegsToStops(itinerary.stops, preferences, plan, legInput);
  const dayLodgingLegs = buildDayLodgingLegSnapshots(preferences, plan, dayLodgingMeta ?? {});
  const baseTimeline = itinerary.timeline.length > 0
    ? itinerary.timeline.filter((item) => item.kind !== "lodging")
    : [];

  const withStops = {
    ...itinerary,
    stops,
    lodgingPlan: plan,
    dayLodgingLegs,
  };
  const lodgingTimeline = buildLodgingTimelineItems(withStops, preferences);
  const timeline = mergeLodgingIntoTimeline(
    baseTimeline.length > 0 ? baseTimeline : buildItineraryTimelineFromStops(stops),
    lodgingTimeline,
  );

  return { ...withStops, timeline };
}

function buildItineraryTimelineFromStops(stops: ItineraryStop[]): ItineraryTimelineItem[] {
  return stops.map((stop) => ({
    id: `timeline-${stop.id}`,
    kind: "place" as const,
    day: stop.day,
    order: stop.order,
    title: stop.placeName,
    description: stop.note,
    duration: stop.duration,
    travelLegToNext: stop.movementNote,
    reservationRequired: stop.reservationRequired,
    partner: stop.partner,
    crowdLevel: stop.crowdLevel,
    expectedWait: stop.expectedWait,
    crowdConfidence: stop.crowdConfidence,
  }));
}

export function buildDayLodgingLegSnapshots(
  preferences: TripPreferences,
  plan: TripLodgingPlan,
  dayMeta: Partial<
    Record<
      ItineraryDay,
      {
        departMinutes?: number;
        returnMinutes?: number;
        dayType?: import("@/types/travel").LodgingDayType;
      }
    >
  >,
): Partial<Record<ItineraryDay, DayLodgingLegSnapshot>> {
  const snapshots: Partial<Record<ItineraryDay, DayLodgingLegSnapshot>> = {};
  const maxDay = getDayCountForDuration(preferences.duration);

  for (let day = 1; day <= maxDay; day += 1) {
    const d = day as ItineraryDay;
    const depots = resolveDayLodgingDepots(d, plan, preferences.duration);
    const anchors = resolveDayRouteAnchors(d, preferences, plan);
    if (!depots.start && !depots.end) continue;

    const meta = dayMeta[d];
    const snapshot: DayLodgingLegSnapshot = {
      start: depots.start ?? undefined,
      end: depots.end ?? undefined,
      dayType: meta?.dayType ?? anchors.dayType,
      origin: preferences.origin,
      destination: preferences.destination,
    };

    if (
      depots.interHotelTransfer &&
      depots.start &&
      depots.end &&
      meta?.returnMinutes != null
    ) {
      snapshot.interHotelTransfer = {
        from: depots.start,
        to: depots.end,
        minutes: meta.returnMinutes,
      };
    }

    snapshots[d] = snapshot;
  }

  return snapshots;
}

export function estimateDepotLegMinutes(
  from: Coordinates,
  to: Coordinates,
  transportation: Transportation,
): number {
  return haversineMinutes(from, to, transportation);
}

/** 지도 polyline·마커용 Day별 출발·복귀 좌표 */
export function resolveLodgingRouteAnchorsByDay(
  itinerary: Itinerary,
): Partial<Record<ItineraryDay, { start?: Coordinates; end?: Coordinates }>> {
  const anchors: Partial<Record<ItineraryDay, { start?: Coordinates; end?: Coordinates }>> = {};
  if (!itinerary.dayLodgingLegs) return anchors;

  for (const [dayKey, snap] of Object.entries(itinerary.dayLodgingLegs)) {
    const day = Number(dayKey) as ItineraryDay;
    anchors[day] = {
      start: snap.start?.coordinates,
      end: snap.end?.coordinates,
    };
  }
  return anchors;
}
