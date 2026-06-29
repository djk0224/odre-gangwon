import mvpPathRaw from "@/data/imported/nature-road-mvp-path.json";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import {
  enrichPreferencesFromRegionalContext,
  formatRegionalSummary,
  getSeasonLabel,
  getSuggestedTheme,
} from "@/lib/regionalPreferences";
import { getDurationLabel } from "@/lib/travelDuration";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import type { EngineContext } from "@/services/engines/engineContext";
import { estimateMovingTimeLabel } from "@/services/engines/routeEngine";
import { scheduleItineraryFromPlaceIds } from "@/lib/itineraryDayPlanner";
import { getTransportationLabel, optimizeVisitOrder } from "@/services/engines/routeEngine";
import { buildStopsFromScheduledSlices } from "@/services/itineraryService";
import { buildItineraryTimeline, repairItinerary } from "@/services/itineraryService";
import { recalculateItineraryMeta } from "@/services/itineraryEditService";
import {
  getNatureRoadCourse,
  getNatureRoadCourseIdForZone,
  getNatureRoadOverlay,
  zoneHasExecutableNatureRoadStops,
} from "@/services/natureRoadCatalog";
import {
  findCatalogPlaceByNameHint,
  getCatalogPlaceById,
} from "@/services/placeGeocodeService";
import { travelZones } from "@/data/mockRegionalFraming";
import type { Itinerary, Place, TravelZoneId, TripPreferences } from "@/types/travel";

const samcheokMvpStopHints = ["새천년", "추암", "도째비", "장호"];

const NATURE_ROAD_STOP_LIMIT: Record<TripPreferences["pace"], number> = {
  relaxed: 4,
  balanced: 5,
  packed: 6,
};

function zoneKeywords(zoneId: TravelZoneId): string[] {
  const zone = travelZones.find((item) => item.id === zoneId);
  if (!zone) return [];
  return zone.cities
    .split(/[·,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function pushUniquePlace(places: Place[], seen: Set<string>, hint: string, zoneId: TravelZoneId) {
  const place =
    getCatalogPlaceById(hint) ?? findCatalogPlaceByNameHint(hint, zoneId);
  if (!place || seen.has(place.id)) return;
  seen.add(place.id);
  places.push(place);
}

/** 네이처로드 코스 순서에 맞춘 실행 장소 목록 (공식 viewPoint·네비 경유지·권역 키워드) */
export function resolveNatureRoadPlacesForZone(zoneId: TravelZoneId): Place[] {
  const courseId = getNatureRoadCourseIdForZone(zoneId);
  if (!courseId) return [];

  const course = getNatureRoadCourse(courseId);
  if (!course) return [];

  const places: Place[] = [];
  const seen = new Set<string>();
  const keywords = zoneKeywords(zoneId);

  if (zoneId === "samcheok-donghae") {
    for (const waypoint of mvpPathRaw.waypoints) {
      pushUniquePlace(places, seen, waypoint.name, zoneId);
    }
    for (const hint of samcheokMvpStopHints) {
      pushUniquePlace(places, seen, hint, zoneId);
    }
  }

  for (const navName of course.navWaypoints) {
    pushUniquePlace(places, seen, navName, zoneId);
  }

  for (const spot of course.viewPoints) {
    if (spot.type !== "View Point") continue;
    const addr = spot.address ?? spot.spotName;
    if (keywords.length > 0) {
      const inZone = keywords.some((keyword) => addr.includes(keyword));
      if (!inZone && zoneId !== "samcheok-donghae") continue;
    }
    pushUniquePlace(places, seen, spot.spotName, zoneId);
  }

  if (places.length === 0) {
    for (const spot of course.viewPoints) {
      if (spot.type === "View Point") {
        pushUniquePlace(places, seen, spot.spotName, zoneId);
      }
    }
  }

  return places;
}

export async function generateNatureRoadDriveItinerary(
  preferences: TripPreferences,
  zoneId: TravelZoneId,
  engineContext?: EngineContext,
): Promise<Itinerary> {
  const courseId = getNatureRoadCourseIdForZone(zoneId) ?? 6;
  const course = getNatureRoadCourse(courseId);

  if (!course || !zoneHasExecutableNatureRoadStops(zoneId)) {
    throw new Error("네이처로드에 연결된 실행 장소가 없습니다.");
  }

  const resolved = enrichPreferencesFromRegionalContext({
    ...preferences,
    zoneId,
    transportation: "car",
    travelPurpose: "drive",
    themes: [getSuggestedTheme(preferences.season, "drive")],
  });

  const stopLimit = NATURE_ROAD_STOP_LIMIT[resolved.pace] ?? 5;
  const allCandidates = resolveNatureRoadPlacesForZone(zoneId);
  if (allCandidates.length === 0) {
    throw new Error("네이처로드에 연결된 실행 장소가 없습니다.");
  }

  const fullRoute = await optimizeVisitOrder(
    allCandidates.map((place) => place.id),
    {
      transportation: resolved.transportation,
      pace: resolved.pace,
    },
  );
  const cappedIds = fullRoute.orderedPlaceIds.slice(0, stopLimit);

  const context =
    engineContext ??
    (await import("@/services/engines/engineContext")).buildEngineContextFromTripStore({
      preferences: resolved,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: null,
    });

  const plan = await scheduleItineraryFromPlaceIds(cappedIds, resolved, context, {
    preserveOrder: true,
    skipMealInjection: true,
  });

  const stops = await buildStopsFromScheduledSlices(plan.slices, resolved, context);
  const selectedPlaces = plan.orderedPlaceIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));

  const natureRoad = getNatureRoadOverlay(resolved);
  const courseTitle = course
    ? `${course.name} ${course.roadName}`
    : "강원 네이처로드 드라이브";
  const seasonLabel = getSeasonLabel(resolved.season);
  const reservationPlaceIds = selectedPlaces
    .filter((place) => place.reservationRequired)
    .map((place) => place.id);

  const zoneLabel = travelZoneShortLabels[zoneId] ?? zoneId;

  const draft: Itinerary = {
    id: `itinerary-nature-road-${Date.now()}`,
    region: resolved.zoneId,
    title: `${courseTitle} 드라이브`,
    summary: `${resolved.travelDate} · ${resolved.travelers}명 · ${getTransportationLabel(resolved.transportation)} · ${selectedPlaces.length}곳 · ${zoneLabel}`,
    totalDuration: getDurationLabel(resolved.duration),
    movingTime: estimateMovingTimeLabel(
      plan.totalRouteSeconds,
      stops.length,
      resolved.transportation,
    ),
    aiExplanation: `${seasonLabel}·${formatRegionalSummary(resolved)}에 맞춰 ${courseTitle} 공식 코스 순서대로 ${zoneLabel} 드라이브 일정을 엮었습니다. 지도에 네이처로드 구간이 표시되며, 예약·혼잡·QR은 실행 일정으로 담은 뒤 이어집니다.`,
    stops,
    timeline: buildItineraryTimeline(stops, resolved),
    natureRoadLabel: natureRoad?.label,
    natureRoadPath: natureRoad?.path,
    alternatives: [
      "일정 편집에서 체류·Day 조정",
      "제휴 명소는 예약 탭에서 시간대 선택",
      "공식 네이처로드 사이트에서 전체 코스 확인",
    ],
    reservationPlaceIds,
  };

  return recalculateItineraryMeta(repairItinerary(draft), resolved);
}
