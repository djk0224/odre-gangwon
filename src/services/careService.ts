import { isCavePlace, isCaveVisitDiscouraged } from "@/lib/caveVisitConditions";
import { getSeasonFromDate, resolveEffectiveThemes } from "@/lib/regionalPreferences";
import { pickRouteLocalOffers, routeLocalOffers } from "@/data/mockLocalCommerce";
import type { EngineContext } from "@/services/engines/engineContext";
import { buildCrowdByPlaceId } from "@/services/engines/crowdEngine";
import { buildVisitCrowdContext } from "@/services/engines/visitSignals";
import {
  findCatalogPlaceByNameHint,
  getCatalogPlaceById,
} from "@/services/placeGeocodeService";
import { countItineraryReservationProgress } from "@/services/reservationService";
import type { HubReservationBooking } from "@/types/reservationHub";
import type {
  MidWeatherSnapshot,
  TransitArrivalItem,
  WeatherSnapshot,
} from "@/types/externalData";
import type {
  CareAlert,
  Itinerary,
  QRTicket,
  ReservationRecord,
  TodayCareStatus,
  TripPreferences,
  TravelZoneId,
} from "@/types/travel";

const GAP_NAME_HINTS_BY_ZONE: Partial<Record<TravelZoneId, string[]>> = {
  "samcheok-donghae": ["묵호", "로스터리"],
  "gangneung-yangyang": ["안목", "커피"],
  "sokcho-goseong": ["속초", "아바이"],
  "pyeongchang-jeongseon": ["알펜시아", "평창"],
  "yeongwol-jeongseon": ["동강", "래프팅"],
  "cheorwon-dmz": ["철원", "DMZ"],
  "wonju-chuncheon": ["춘천", "닭갈비"],
};

export interface CareEnhancements {
  preferences?: TripPreferences;
  engineContext?: EngineContext;
  weatherShort?: WeatherSnapshot | null;
  weatherMid?: MidWeatherSnapshot | null;
  transitArrivals?: TransitArrivalItem[];
}

export function generateTodayCareStatus(
  itinerary: Itinerary | undefined,
  reservations: ReservationRecord[],
  tickets: QRTicket[],
  hubBookings: HubReservationBooking[] = [],
): TodayCareStatus {
  if (!itinerary) {
    return {
      headline: "오늘 일정이 아직 없습니다",
      nextAction: "홈에서 AI 실행 일정을 먼저 생성하세요.",
      completedReservations: 0,
      hubBookings: 0,
      pendingCheckIns: 0,
      pendingItineraryReservations: 0,
    };
  }

  const progress = countItineraryReservationProgress(itinerary, reservations);
  const nextReservation = reservations[0];
  const nextHub = hubBookings[0];
  const pendingCheckIns = tickets.filter((ticket) => ticket.checkInStatus !== "checked-in").length;

  let nextAction = "예약이 필요한 장소를 확인하세요.";
  if (progress.pending > 0) {
    nextAction = `입장·QR ${progress.pending}건이 남았습니다.`;
  } else if (nextReservation) {
    nextAction = `${nextReservation.placeName} ${nextReservation.slotLabel} 입장 준비`;
  } else if (nextHub) {
    nextAction = `${nextHub.title} 체크인·이용 준비`;
  }

  return {
    headline: `${itinerary.title} 진행 중`,
    nextAction,
    completedReservations: reservations.length,
    hubBookings: hubBookings.length,
    pendingCheckIns,
    pendingItineraryReservations: progress.pending,
  };
}

export async function generateDayCareSuggestions(
  itinerary?: Itinerary,
  reservations: ReservationRecord[] = [],
  hubBookings: HubReservationBooking[] = [],
  claimedLocalOfferIds: string[] = [],
  enhancements?: CareEnhancements,
): Promise<CareAlert[]> {
  if (!itinerary) {
    return [
      {
        id: "care-empty",
        type: "departure",
        title: "일정을 먼저 생성하세요",
        message: "실행 일정이 만들어지면 출발·예약·혼잡 알림이 이곳에 표시됩니다.",
        priority: "low",
      },
    ];
  }

  const alerts: CareAlert[] = [];
  const progress = countItineraryReservationProgress(itinerary, reservations);

  const { weatherShort, weatherMid, transitArrivals, preferences } = enhancements ?? {};

  if (weatherShort || weatherMid) {
    const rainy =
      weatherShort?.skyLabel.includes("비") ||
      weatherShort?.skyLabel.includes("눈") ||
      weatherMid?.landForecast.includes("비");
    const temp =
      weatherShort?.temperatureC !== undefined ? `${weatherShort.temperatureC}°C · ` : "";
    alerts.push({
      id: "care-weather-live",
      type: "weather",
      title: rainy ? "강수 예보 · 일정 조정 권장" : "오늘·중기 날씨",
      message: [
        weatherShort ? `단기 ${temp}${weatherShort.skyLabel}` : null,
        weatherMid ? `중기 ${weatherMid.landForecast}` : null,
      ]
        .filter(Boolean)
        .join(" · "),
      priority: rainy ? "high" : "medium",
    });

    const season =
      preferences?.season ??
      getSeasonFromDate(preferences?.travelDate ?? new Date().toISOString().slice(0, 10));
    const caveDiscouraged = isCaveVisitDiscouraged({
      season,
      skyLabel: weatherShort?.skyLabel,
      weatherSummary: weatherMid?.landForecast,
    });
    const caveStops = itinerary.stops.filter((stop) => {
      const place = getCatalogPlaceById(stop.placeId);
      return place && isCavePlace(place);
    });
    if (caveDiscouraged && caveStops.length > 0) {
      alerts.push({
        id: "care-cave-weather",
        type: "schedule-adjust",
        title: "동굴 일정 조정 권장",
        message:
          "겨울·비·눈 오는 날은 동굴 내부가 습하고 미끄러울 수 있어요. 항구 산책·전망·시장·카페 위주로 바꾸는 편이 안전합니다.",
        actionLabel: "일정 보기",
        action: { type: "itinerary-edit" },
        priority: "high",
      });
    }
  }

  if (preferences?.transportation === "public-transit" && transitArrivals?.length) {
    const next = transitArrivals[0];
    alerts.push({
      id: "care-transit-arrival",
      type: "transit",
      title: `버스 ${next.routeName}번 약 ${next.arrivalMinutes}분 후`,
      message: `${next.stationName} 정류소 · TAGO 실시간 도착 (경로 화면 참고)`,
      actionLabel: "KTX·고속버스 예약",
      action: { type: "transport-hub" },
      priority: "high",
    });
  } else if (preferences?.transportation === "public-transit") {
    alerts.push({
      id: "care-transit-hint",
      type: "transit",
      title: "대중교통 일정",
      message: "시내·권역 버스는 케어·일정의 오늘 경로에서 확인하세요. KTX·고속버스는 예약 허브 교통 탭에서 예약합니다.",
      actionLabel: "KTX·고속버스 예약",
      action: { type: "transport-hub" },
      priority: "medium",
    });
  }

  if (progress.pending > 0) {
    alerts.push({
      id: "care-itinerary-pending",
      type: "reservation",
      title: `입장·QR ${progress.pending}건 남음`,
      message: "환선굴·케이블카 등 제휴 명소 시간을 선택하고 결제하면 QR이 발급됩니다.",
      actionLabel: "입장·QR 이어하기",
      action: { type: "itinerary-reservation" },
      priority: "high",
    });
  }

  const firstStop = itinerary.stops[0];
  if (firstStop) {
    alerts.push({
      id: "care-departure-live",
      type: "departure",
      title: "첫 일정 출발",
      message: `${firstStop.placeName}부터 방문을 시작하면 오늘 일정이 안정적으로 이어집니다.`,
      priority: "medium",
      relatedPlaceId: firstStop.placeId,
    });
  }

  for (const reservation of reservations) {
    alerts.push({
      id: `care-reservation-${reservation.id}`,
      type: "reservation",
      title: `${reservation.placeName} 예약 확인`,
      message: `${reservation.slotLabel} 입장 · 예상 대기 ${reservation.expectedWait}`,
      actionLabel: "QR 티켓 보기",
      action: { type: "qr-ticket", placeId: reservation.placeId },
      priority: "high",
      relatedPlaceId: reservation.placeId,
    });
  }

  for (const booking of hubBookings.slice(0, 2)) {
    alerts.push({
      id: `care-hub-${booking.id}`,
      type: "reservation",
      title: `${booking.title} 예약 확정`,
      message: booking.detailSummary,
      actionLabel: "예약 내역 보기",
      action: { type: "hub-reservations" },
      priority: "medium",
    });
  }

  if (enhancements?.engineContext && itinerary.stops.length > 0) {
    const crowdCandidates = itinerary.stops.slice(0, 5);
    const visitCrowd = buildVisitCrowdContext({
      preferences,
      weatherShort,
      weatherMid,
      stops: crowdCandidates,
    });
    const crowdByPlaceId = await buildCrowdByPlaceId(
      crowdCandidates.map((stop) => stop.placeId),
      enhancements.engineContext,
      visitCrowd,
    );

    for (const stop of crowdCandidates) {
      const estimate = crowdByPlaceId[stop.placeId];
      if (!estimate || (estimate.level !== "high" && estimate.level !== "very-high")) {
        continue;
      }
      alerts.push({
        id: `care-crowd-${stop.placeId}`,
        type: "crowd-change",
        title: `${stop.placeName} 혼잡 ${estimate.level === "very-high" ? "매우 높음" : "상승"}`,
        message: `방문 순서를 조정하거나 다른 시간대를 고려하면 예상 대기(${estimate.expectedWait})를 줄일 수 있습니다.`,
        actionLabel: "일정 조정 보기",
        action: { type: "itinerary-edit" },
        priority: estimate.confidence === "high" ? "high" : "medium",
        relatedPlaceId: stop.placeId,
      });
      if (alerts.filter((a) => a.type === "crowd-change").length >= 2) {
        break;
      }
    }
  }

  const zoneId =
    preferences?.zoneId ??
    (itinerary.stops[0]?.placeId
      ? getCatalogPlaceById(itinerary.stops[0].placeId)?.region
      : undefined);

  const gapHints = zoneId ? GAP_NAME_HINTS_BY_ZONE[zoneId] : undefined;
  const gapPlace =
    itinerary.stops.length >= 2 && zoneId && gapHints
      ? gapHints
          .map((hint) => findCatalogPlaceByNameHint(hint, zoneId))
          .find((place): place is NonNullable<typeof place> => Boolean(place))
      : undefined;

  const gapLocalOffer =
    zoneId && preferences
      ? pickRouteLocalOffers(
          resolveEffectiveThemes(preferences),
          preferences.season ?? getSeasonFromDate(preferences.travelDate),
          1,
          zoneId,
        )[0]
      : routeLocalOffers.find((offer) => offer.zoneId === zoneId);

  if (gapPlace || gapLocalOffer) {
    const gapLabel = gapPlace?.name ?? gapLocalOffer?.name ?? "근처";
    const gapOfferId = gapLocalOffer?.id;
    alerts.push({
      id: "care-gap-live",
      type: "gap-recommendation",
      title: "다음 예약까지 45분 여유",
      message: `${gapLabel}에서 잠시 쉬었다가 다음 이동을 준비하세요.`,
      actionLabel:
        gapOfferId && claimedLocalOfferIds.includes(gapOfferId)
          ? "저장한 쿠폰 보기"
          : "근처 추천 보기",
      action:
        gapOfferId && claimedLocalOfferIds.includes(gapOfferId)
          ? { type: "local-coupons" }
          : gapPlace
            ? { type: "place", placeId: gapPlace.id }
            : { type: "local-coupons" },
      priority: "low",
      relatedPlaceId: gapPlace?.id,
    });
  }

  const claimedOffers = routeLocalOffers.filter((offer) =>
    claimedLocalOfferIds.includes(offer.id),
  );
  if (claimedOffers.length > 0) {
    alerts.push({
      id: "care-local-wallet",
      type: "gap-recommendation",
      title: `경로 쿠폰 ${claimedOffers.length}장`,
      message: claimedOffers.map((offer) => `${offer.name} · ${offer.couponLabel}`).join(" / "),
      actionLabel: "쿠폰 보관함",
      action: { type: "local-coupons" },
      priority: "medium",
    });
  }

  return alerts;
}
