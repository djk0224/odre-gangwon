import { demoTransitHub } from "@/config/demoTransit";
import { detectTravelZoneFromText } from "@/lib/chatZoneDetection";
import { GANGWON_TRAVEL_ZONE_IDS } from "@/lib/gangwonZoneAvailability";
import { getSeasonLabel } from "@/lib/regionalPreferences";
import { searchRagChunksHybrid } from "@/services/ai/concierge/hybridRagSearch";
import type { ConciergeToolName, ConciergeToolResult } from "@/services/ai/concierge/types";
import type { AiChatSourceKind } from "@/services/ai/types";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { rerankPlaceIdsAsync } from "@/services/engines/personalizationRanker";
import { searchPlacesWithAi } from "@/services/ai/placeSearch";
import {
  formatSlotsSummary,
  sessionToTripPreferences,
} from "@/services/ai/chatSession";
import type { AiChatSession } from "@/services/ai/types";
import { fetchVilageForecast } from "@/services/external/weatherService";
import { fetchBusArrivals } from "@/services/external/tagoTransitService";
import {
  listGangwonRestaurants,
  listSbizCommerce,
} from "@/services/external/localDatasetService";
import { generateCrowdGuidance } from "@/services/ai/crowd";
import { generateAiCareSuggestions } from "@/services/ai/care";
import {
  buildExecutionStateSnapshot,
  collectDataLabRelatedCatalogIds,
  resolveExecutionDataLabState,
} from "@/services/executionStateService";
import { generateDayCareSuggestions } from "@/services/careService";
import {
  findCatalogPlaceByNameHint,
  getCatalogPlaceById,
} from "@/services/placeGeocodeService";
import { getBookablePartnerPlaces } from "@/services/reservationService";
import { fetchStaysForZone } from "@/services/external/tourGwService";
import { getNatureRoadCourse } from "@/services/natureRoadCatalog";
import type { AiChatAction, AiChatTripContext } from "@/services/ai/types";
import type { Place, TripPreferences } from "@/types/travel";

export interface ToolRunContext {
  message: string;
  session: AiChatSession;
  storePrefs: TripPreferences;
  tripContext?: AiChatTripContext;
}

function sourceLabel(kind: AiChatSourceKind, title: string) {
  return { id: `${kind}-${title}`, label: title, kind };
}

function resolveEngineContext(ctx: ToolRunContext) {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const trip = ctx.tripContext;
  return buildEngineContextFromTripStore({
    preferences: prefs,
    savedPlaceIds: trip?.savedPlaceIds ?? [],
    recentPlaceIds: trip?.recentPlaceIds ?? [],
    itineraryAnchorPlaceId: trip?.itineraryAnchorPlaceId ?? null,
    behaviorProfile: trip?.behaviorProfile,
  });
}

export async function runConciergeTool(
  tool: ConciergeToolName,
  ctx: ToolRunContext,
): Promise<ConciergeToolResult> {
  switch (tool) {
    case "rag_search":
      return await runRagSearch(ctx);
    case "search_places":
      return runSearchPlaces(ctx);
    case "search_local_commerce":
      return runLocalCommerce(ctx);
    case "get_weather":
      return runWeather();
    case "get_nature_road":
      return runNatureRoad(ctx.message);
    case "get_transit_arrivals":
      return runTransit();
    case "get_trip_context":
      return runTripContext(ctx);
    case "search_stays":
      return runSearchStays(ctx);
    case "get_crowd":
      return runCrowd(ctx);
    case "get_care":
      return runCare(ctx);
    case "get_datalab":
      return runDataLab(ctx);
    case "open_reservation":
      return runOpenReservation(ctx);
    default: {
      const _exhaustive: never = tool;
      return _exhaustive;
    }
  }
}

async function runRagSearch(ctx: ToolRunContext): Promise<ConciergeToolResult> {
  const { chunks: hits, mode } = await searchRagChunksHybrid(ctx.message, 5);
  if (hits.length === 0) {
    return {
      tool: "rag_search",
      ok: false,
      summary: "관련 문서를 찾지 못했습니다.",
      lines: ["`npm run build:rag`로 임베딩을 만들면 의미 검색이 더 정확해져요."],
      sources: [],
    };
  }

  const rawIds = hits.map((h) => h.placeId).filter((id): id is string => Boolean(id));
  const engineContext = resolveEngineContext(ctx);
  const placeIds = engineContext
    ? await rerankPlaceIdsAsync([...new Set(rawIds)], engineContext, { limit: 8 })
    : [...new Set(rawIds)].slice(0, 8);

  return {
    tool: "rag_search",
    ok: true,
    summary: `지식베이스 ${mode} 검색 ${hits.length}건`,
    lines: hits.map((h) => `· ${h.title}: ${h.text.slice(0, 120)}${h.text.length > 120 ? "…" : ""}`),
    placeIds,
    sources: hits.map((h) =>
      sourceLabel(h.source === "catalog" ? "catalog" : h.source === "nature-road" ? "nature-road" : "rag", h.title),
    ),
  };
}

async function runSearchPlaces(ctx: ToolRunContext): Promise<ConciergeToolResult> {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const engineContext = resolveEngineContext(ctx);
  const result = await searchPlacesWithAi(ctx.message, prefs, engineContext);

  return {
    tool: "search_places",
    ok: result.placeIds.length > 0,
    summary: result.summary,
    lines: result.placeIds
      .slice(0, 6)
      .map((id) => {
        const place = getCatalogPlaceById(id);
        return place ? `· ${place.name} — ${place.description.slice(0, 80)}` : `· ${id}`;
      }),
    placeIds: result.placeIds,
    sources: [{ id: "ai-search", label: "ODRÉ 장소 카탈로그", kind: "ai-search" }],
  };
}

function runLocalCommerce(ctx: ToolRunContext): ConciergeToolResult {
  const text = ctx.message;
  const zoneId = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs).zoneId;
  const wantLodging = /숙소|펜션|호텔|숙박|머물/.test(text);
  const wantFood = /맛|식당|횟|카페|음식|먹/.test(text);

  const lines: string[] = [];
  const sources: ConciergeToolResult["sources"] = [];

  if (wantLodging || !wantFood) {
    const stays = listSbizCommerce({ categoryLarge: "숙박", limit: 5, zoneId });
    stays.forEach((row) => {
      lines.push(`· [숙박] ${row.name} (${row.city}) ${row.address}`);
    });
    if (stays.length > 0) {
      sources.push(sourceLabel("commerce", "강원 상권 숙박"));
    }
  }

  if (wantFood || !wantLodging) {
    const food = listGangwonRestaurants({ limit: 6, zoneId });
    food.slice(0, 5).forEach((row) => {
      lines.push(`· [맛집] ${row.name} — ${row.cuisineType} (${row.city})`);
    });
    if (food.length > 0) {
      sources.push(sourceLabel("restaurant", "강원 음식점 데이터"));
    }
  }

  return {
    tool: "search_local_commerce",
    ok: lines.length > 0,
    summary: lines.length > 0 ? `로컬 상권·맛집 ${lines.length}건` : "조건에 맞는 상점이 없습니다.",
    lines,
    sources,
  };
}

async function runWeather(): Promise<ConciergeToolResult> {
  const weather = await fetchVilageForecast();
  if (!weather) {
    return {
      tool: "get_weather",
      ok: false,
      summary: "날씨 API를 사용할 수 없습니다.",
      lines: ["기상청 키가 없거나 일시 오류일 수 있어요."],
      sources: [],
    };
  }

  return {
    tool: "get_weather",
    ok: true,
    summary: `${weather.region} 단기 예보`,
    lines: [
      `${weather.skyLabel}${weather.temperatureC != null ? ` · ${weather.temperatureC}°C` : ""}${
        weather.precipitationMm != null ? ` · 강수 ${weather.precipitationMm}mm` : ""
      }`,
      `관측: ${weather.observedAt}`,
    ],
    sources: [{ id: "weather-short", label: "기상청 단기예보", kind: "weather" }],
  };
}

function runNatureRoad(message: string): ConciergeToolResult {
  const match = message.match(/(\d)\s*코스/);
  const courseId = match ? Number(match[1]) : 6;
  const course = getNatureRoadCourse(courseId);

  if (!course) {
    return {
      tool: "get_nature_road",
      ok: false,
      summary: `${courseId}코스 정보 없음`,
      lines: [],
      sources: [],
    };
  }

  const spots = course.viewPoints
    .slice(0, 4)
    .map((s) => `· ${s.spotName}`)
    .join("\n");

  return {
    tool: "get_nature_road",
    ok: true,
    summary: `${course.name} ${course.roadName} (${course.distanceKm}km)`,
    lines: [
      course.description.slice(0, 200) + (course.description.length > 200 ? "…" : ""),
      `주요 스팟:\n${spots}`,
    ],
    sources: [{ id: `nature-${courseId}`, label: "강원 네이처로드", kind: "nature-road" }],
  };
}

async function runTransit(): Promise<ConciergeToolResult> {
  const arrivals = await fetchBusArrivals({
    nodeId: demoTransitHub.primaryStop.nodeId,
  });

  if (arrivals.length === 0) {
    return {
      tool: "get_transit_arrivals",
      ok: false,
      summary: "버스 도착 정보 없음",
      lines: [
        `${demoTransitHub.primaryStop.name} — TAGO 키가 없거나 현재 도착 예정 버스가 없습니다.`,
      ],
      sources: [{ id: "tago", label: "TAGO 버스정보", kind: "tago" }],
    };
  }

  return {
    tool: "get_transit_arrivals",
    ok: true,
    summary: `${demoTransitHub.primaryStop.name} 도착 예정`,
    lines: arrivals.slice(0, 6).map(
      (a) => `· ${a.routeName}번 — 약 ${a.arrivalMinutes}분 후 (${a.stationName})`,
    ),
    sources: [{ id: "tago-arrivals", label: "TAGO 실시간 도착", kind: "tago" }],
  };
}

function resolvePlaceFromMessage(message: string, zoneId?: TripPreferences["zoneId"]): Place | undefined {
  const zones = zoneId
    ? [zoneId, ...GANGWON_TRAVEL_ZONE_IDS.filter((id) => id !== zoneId)]
    : [
        detectTravelZoneFromText(message),
        ...GANGWON_TRAVEL_ZONE_IDS,
      ].filter((id, index, arr): id is TripPreferences["zoneId"] => Boolean(id) && arr.indexOf(id) === index);

  for (const region of zones) {
    const hint = findCatalogPlaceByNameHint(message, region);
    if (hint) return hint;
  }

  const normalized = message.replace(/\s/g, "");
  for (const place of getBookablePartnerPlaces()) {
    const key = place.name.replace(/\s/g, "");
    if (normalized.includes(key) || key.includes(normalized.slice(0, 4))) {
      return place;
    }
  }

  return undefined;
}

async function runSearchStays(ctx: ToolRunContext): Promise<ConciergeToolResult> {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const items = await fetchStaysForZone(prefs.zoneId, { numOfRowsPerCity: 4 });

  if (items.length === 0) {
    return {
      tool: "search_stays",
      ok: false,
      summary: "숙소 목록을 불러오지 못했어요",
      lines: ["관광공사 API 키가 없거나 응답이 비어 있을 수 있어요."],
      sources: [{ id: "tour-stay", label: "한국관광공사 숙박", kind: "rag" }],
    };
  }

  return {
    tool: "search_stays",
    ok: true,
    summary: `관광공사 숙소 ${items.length}건`,
    lines: items.slice(0, 6).map((item) => {
      const title = item.title ?? "숙소";
      const addr = item.addr1 ?? "";
      return `· ${title}${addr ? ` — ${addr}` : ""}`;
    }),
    sources: [{ id: "tour-gw-stay", label: "관광공사 GW 숙박", kind: "rag" }],
    actions: [
      {
        id: "hub-stay",
        label: "예약 탭에서 숙소 보기",
        type: "open_reservation_hub",
        hubCategory: "stay",
      },
    ],
  };
}

async function runDataLab(ctx: ToolRunContext): Promise<ConciergeToolResult> {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const dataLab = resolveExecutionDataLabState(prefs);
  const place = resolvePlaceFromMessage(ctx.message, prefs.zoneId);
  const seedIds = place
    ? [place.id]
    : ctx.tripContext?.itinerary?.stops.slice(0, 2).map((stop) => stop.placeId) ?? [];

  const lines: string[] = [];
  if (dataLab.active) {
    lines.push(
      `권역 수요 지수: ${dataLab.zoneDemandScore ?? "—"}/100 (${dataLab.source === "live" ? "실시간" : "스냅샷"})`,
    );
  } else {
    lines.push(
      "관광빅데이터 스냅샷이 없습니다. npm run refresh:datalab-gangwon 후 다시 시도해 주세요.",
    );
  }

  let placeIds: string[] = [];
  if (seedIds.length > 0) {
    const { catalogIds, source } = await collectDataLabRelatedCatalogIds(
      seedIds,
      prefs,
      { tryLive: true, limitPerSeed: 4 },
    );
    placeIds = catalogIds;
    if (catalogIds.length > 0) {
      lines.push(
        `연관 관광지(카탈로그 매칭 ${catalogIds.length}곳, ${source}): ${catalogIds
          .map((id) => getCatalogPlaceById(id)?.name)
          .filter(Boolean)
          .join(" · ")}`,
      );
    } else if (place) {
      lines.push(`${place.name} 기준 연관 관광지를 카탈로그에서 찾지 못했습니다.`);
    }
  } else {
    const snapshot = await buildExecutionStateSnapshot(prefs);
    lines.push(...snapshot.selectionNotes);
  }

  return {
    tool: "get_datalab",
    ok: dataLab.active || placeIds.length > 0,
    summary: dataLab.active
      ? "관광빅데이터·연관 관광지"
      : "관광빅데이터 미연동",
    lines,
    placeIds,
    sources: [
      {
        id: "datalab-gw",
        label: "한국관광공사 관광빅데이터 GW",
        kind: "rag",
      },
    ],
  };
}

async function runCrowd(ctx: ToolRunContext): Promise<ConciergeToolResult> {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const place = resolvePlaceFromMessage(ctx.message, prefs.zoneId);

  if (!place?.availableSlots?.length) {
    return {
      tool: "get_crowd",
      ok: false,
      summary: "혼잡 안내 대상 장소를 찾지 못했어요",
      lines: ["환선굴·케이블카 등 제휴 명소 이름을 포함해 물어봐 주세요."],
      sources: [{ id: "crowd-demo", label: "ODRÉ 슬롯(데모)", kind: "rag" }],
    };
  }

  const guidance = await generateCrowdGuidance(
    place,
    place.availableSlots,
    resolveEngineContext(ctx),
  );
  const lines = [
    guidance.summary,
    ...place.availableSlots.slice(0, 4).map((slot) => {
      const rate = Math.round((slot.reservedCount / slot.capacity) * 100);
      return `· ${slot.label} — 예약률 약 ${rate}% · ${slot.crowdLevel} · 대기 ${slot.expectedWait ?? "—"}`;
    }),
  ];

  return {
    tool: "get_crowd",
    ok: true,
    summary: `${place.name} 혼잡·슬롯`,
    lines,
    placeIds: [place.id],
    sources: [{ id: "crowd-slots", label: "ODRÉ 혼잡(데모 슬롯)", kind: "rag" }],
    actions: [
      {
        id: `res-${place.id}`,
        label: `${place.name} 예약하기`,
        type: "open_reservation_place",
        placeId: place.id,
      },
    ],
  };
}

async function runCare(ctx: ToolRunContext): Promise<ConciergeToolResult> {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const weather = await fetchVilageForecast();
  const trip = ctx.tripContext;
  const reservations = trip?.reservations ?? [];
  const hubBookings = trip?.hubBookings ?? [];
  const claimed = trip?.claimedLocalOfferIds ?? [];

  const ruleAlerts = await generateDayCareSuggestions(
    trip?.itinerary,
    reservations,
    hubBookings,
    claimed,
    {
      preferences: prefs,
      engineContext: resolveEngineContext(ctx),
      weatherShort: weather,
      weatherMid: null,
      transitArrivals: [],
    },
  );

  let alerts = ruleAlerts;
  let sourceLabel = "ODRÉ 케어 규칙";

  if (trip?.itinerary) {
    try {
      const aiCare = await generateAiCareSuggestions({
        itinerary: trip.itinerary,
        preferences: prefs,
        reservations,
        hubBookings,
        claimedLocalOfferIds: claimed,
        ruleAlerts,
      });
      alerts = aiCare.alerts;
      sourceLabel =
        aiCare.provider === "gemini" ? "Gemini 케어" : "ODRÉ 케어·규칙";
    } catch {
      alerts = ruleAlerts;
    }
  }

  const actions: AiChatAction[] = [
    {
      id: "open-care-tab",
      label: "케어 탭 열기",
      type: "open_care",
    },
  ];

  if (trip?.itinerary) {
    actions.unshift({
      id: "open-itinerary",
      label: "내 일정 보기",
      type: "open_itinerary",
    });
  }

  const nextReservation = reservations[0];
  if (nextReservation) {
    actions.push({
      id: `care-res-${nextReservation.placeId}`,
      label: `${nextReservation.placeName} 예약·QR`,
      type: "open_reservation_place",
      placeId: nextReservation.placeId,
    });
  }

  return {
    tool: "get_care",
    ok: alerts.length > 0,
    summary: trip?.itinerary
      ? "오늘 일정 기준 케어 안내"
      : "당일 여행 케어 안내",
    lines: alerts.slice(0, 5).map((a) => `· ${a.title}: ${a.message}`),
    sources: [{ id: "care-ai", label: sourceLabel, kind: "rag" }],
    actions,
  };
}

function runOpenReservation(ctx: ToolRunContext): ConciergeToolResult {
  const prefs = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const place = resolvePlaceFromMessage(ctx.message, prefs.zoneId);
  const actions: AiChatAction[] = [];

  if (place) {
    if (place.reservationRequired) {
      actions.push({
        id: `book-${place.id}`,
        label: `${place.name} 예약·QR`,
        type: "open_reservation_place",
        placeId: place.id,
      });
    }
    actions.push({
      id: `detail-${place.id}`,
      label: `${place.name} 상세 보기`,
      type: "open_place",
      placeId: place.id,
    });
  }

  actions.push({
    id: "hub-main",
    label: place?.reservationRequired ? "예약 탭 (명소)" : "예약 탭 열기",
    type: "open_reservation_hub",
    hubCategory: place?.reservationRequired ? "attraction" : "stay",
  });

  const lines = [
    "예약은 하단 「예약」 탭 또는 일정에 연결된 제휴 명소에서 진행해요.",
    "mock 결제 후 QR 티켓이 발급되는 데모 흐름입니다.",
  ];
  if (place) {
    lines.unshift(`· ${place.name}${place.reservationRequired ? " — 시간대 예약 필요" : ""}`);
  }

  return {
    tool: "open_reservation",
    ok: true,
    summary: place ? `${place.name} 예약 안내` : "예약·QR 이용 방법",
    lines,
    placeIds: place ? [place.id] : [],
    actions,
    sources: [{ id: "reservation-faq", label: "ODRÉ 예약 흐름", kind: "faq" }],
  };
}

function runTripContext(ctx: ToolRunContext): ConciergeToolResult {
  const merged = sessionToTripPreferences(ctx.session.slots, ctx.storePrefs);
  const summary = formatSlotsSummary(ctx.session.slots);
  const lines: string[] = [];

  if (ctx.session.slots.travelDate) {
    lines.push(`채팅에서 확정한 출발일: ${merged.travelDate}`);
  } else {
    lines.push(`앱 기본 출발일: ${ctx.storePrefs.travelDate} (채팅 미확정)`);
  }

  lines.push(`시즌: ${getSeasonLabel(merged.season)}`);
  if (summary !== "조건을 아직 모르고 있어요") {
    lines.push(`수집된 조건: ${summary}`);
  }

  return {
    tool: "get_trip_context",
    ok: true,
    summary: "여행 맥락",
    lines,
    sources: [{ id: "trip-store", label: "앱 여행 조건", kind: "rag" }],
  };
}
