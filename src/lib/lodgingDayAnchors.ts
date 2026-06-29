import { resolveDayLodgingDepots, resolveNightDepot } from "@/lib/tripLodgingPlan";
import { getDayCountForDuration } from "@/lib/travelDuration";
import type {
  ItineraryDay,
  LodgingDayType,
  TripEndpoint,
  TripLodgingPlan,
  TripPreferences,
} from "@/types/travel";

export const DEFAULT_CHECK_IN_TIME = "15:00";
export const DEFAULT_CHECK_OUT_TIME = "11:00";

export interface DayRouteAnchors {
  dayType: LodgingDayType;
  start: TripEndpoint;
  end: TripEndpoint;
  lodgingStartName?: string;
  lodgingEndName?: string;
}

const ZONE_GATEWAY: Record<TripPreferences["zoneId"], TripEndpoint> = {
  "samcheok-donghae": { label: "동해역", coordinates: { lat: 37.4909, lng: 129.1224 } },
  "gangneung-yangyang": { label: "강릉역", coordinates: { lat: 37.7642, lng: 128.8996 } },
  "sokcho-goseong": { label: "속초시외버스터미널", coordinates: { lat: 38.2069, lng: 128.5918 } },
  "pyeongchang-jeongseon": { label: "평창역", coordinates: { lat: 37.5563, lng: 128.4836 } },
  "yeongwol-jeongseon": { label: "영월역", coordinates: { lat: 37.1842, lng: 128.4618 } },
  "cheorwon-dmz": { label: "철원버스터미널", coordinates: { lat: 38.1466, lng: 127.3132 } },
  "wonju-chuncheon": { label: "춘천역", coordinates: { lat: 37.8853, lng: 127.7174 } },
};

export function getTripOrigin(preferences: TripPreferences): TripEndpoint {
  return preferences.origin ?? ZONE_GATEWAY[preferences.zoneId];
}

export function getTripDestination(preferences: TripPreferences): TripEndpoint {
  return preferences.destination ?? getTripOrigin(preferences);
}

export function classifyDayType(
  day: ItineraryDay,
  preferences: TripPreferences,
  lodgingPlan?: TripLodgingPlan,
): LodgingDayType {
  const dayCount = getDayCountForDuration(preferences.duration);
  if (!lodgingPlan || lodgingPlan.mode === "off") return "day_trip";
  if (dayCount === 1) return "day_trip";
  if (day === 1) return "arrival_to_hotel";
  if (day === dayCount) return "departure_from_hotel";
  const depots = resolveDayLodgingDepots(day, lodgingPlan, preferences.duration);
  if (depots.start && depots.end && depots.start.id !== depots.end.id) {
    return "hotel_to_hotel";
  }
  return "hotel_loop";
}

export function resolveDayRouteAnchors(
  day: ItineraryDay,
  preferences: TripPreferences,
  lodgingPlan?: TripLodgingPlan,
): DayRouteAnchors {
  const origin = getTripOrigin(preferences);
  const destination = getTripDestination(preferences);
  const dayType = classifyDayType(day, preferences, lodgingPlan);

  if (!lodgingPlan || lodgingPlan.mode === "off") {
    return { dayType: "day_trip", start: origin, end: destination };
  }

  const depots = resolveDayLodgingDepots(day, lodgingPlan, preferences.duration);
  const firstDepot = resolveNightDepot(lodgingPlan, 1);
  const lastDepot =
    resolveNightDepot(lodgingPlan, getDayCountForDuration(preferences.duration) - 1) ?? firstDepot;

  const firstPoint: TripEndpoint = firstDepot
    ? { label: firstDepot.name, coordinates: firstDepot.coordinates }
    : origin;
  const lastPoint: TripEndpoint = lastDepot
    ? { label: lastDepot.name, coordinates: lastDepot.coordinates }
    : destination;

  switch (dayType) {
    case "arrival_to_hotel":
      return {
        dayType,
        start: origin,
        end: depots.end ? { label: depots.end.name, coordinates: depots.end.coordinates } : firstPoint,
        lodgingEndName: depots.end?.name,
      };
    case "departure_from_hotel":
      return {
        dayType,
        start: depots.start
          ? { label: depots.start.name, coordinates: depots.start.coordinates }
          : lastPoint,
        end: destination,
        lodgingStartName: depots.start?.name,
      };
    case "hotel_to_hotel":
      return {
        dayType,
        start: depots.start
          ? { label: depots.start.name, coordinates: depots.start.coordinates }
          : firstPoint,
        end: depots.end ? { label: depots.end.name, coordinates: depots.end.coordinates } : lastPoint,
        lodgingStartName: depots.start?.name,
        lodgingEndName: depots.end?.name,
      };
    case "hotel_loop":
      return {
        dayType,
        start: depots.start
          ? { label: depots.start.name, coordinates: depots.start.coordinates }
          : firstPoint,
        end: depots.end ? { label: depots.end.name, coordinates: depots.end.coordinates } : firstPoint,
        lodgingStartName: depots.start?.name,
        lodgingEndName: depots.end?.name,
      };
    case "day_trip":
    default:
      return { dayType: "day_trip", start: origin, end: destination };
  }
}
