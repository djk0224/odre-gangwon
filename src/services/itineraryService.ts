import { defaultPreferences, mvpRegion } from "@/data/mockTravelData";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import {
  findCatalogPlaceByNameHint,
  getCatalogPlaceById,
  getCatalogPlaces,
} from "@/services/placeGeocodeService";
import { shouldSkipCavePlace } from "@/lib/caveVisitConditions";
import { resolvePlacesFromSelectionState } from "@/lib/placeSelectionFromState";
import { isDiningPlace, itineraryIncludesDiningPlaceIds } from "@/lib/itineraryMeals";
import { attachLodgingToItinerary } from "@/lib/lodgingItineraryLegs";
import { isLodgingPlace } from "@/lib/placeLodging";
import { isLodgingPlanActive } from "@/lib/tripLodgingPlan";
import {
  filterAttractionPlaceIds,
  scheduleItineraryFromPlaceIds,
} from "@/lib/itineraryDayPlanner";
import { backfillAttractionPlaceIds } from "@/lib/itineraryAttractionBackfill";
import {
  enrichPreferencesFromRegionalContext,
  formatRegionalSummary,
  getSeasonLabel,
  resolveEffectiveThemes,
} from "@/lib/regionalPreferences";
import {
  collectItineraryDaysFromStops,
  getDayCountForDuration,
  getMaxAttractionStopsForTrip,
} from "@/lib/travelDuration";
import { formatTripThemesLabel } from "@/lib/tripThemes";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { estimatePlaceCrowdQuick } from "@/services/engines/crowdEngine";
import { placeHasPartnerSlots, resolveStopCrowdFields } from "@/services/crowdService";
import {
  formatMovementLeg,
  getTransportationLabel,
  estimateMovingTimeLabel,
} from "@/services/engines/routeEngine";
import { rerankPlaceIdsAsync } from "@/services/engines/personalizationRanker";
import { getBookablePartnerPlaces } from "@/services/reservationService";
import {
  recalculateItineraryMeta,
  reflowDayStopsAsync,
} from "@/services/itineraryEditService";
import { buildItineraryTimeline, repairItinerary } from "@/services/itineraryRepair";
import type { PlannedDaySlice, ScheduledItineraryPlan } from "@/lib/itineraryDayPlanner";
import type { EngineContext } from "@/services/engines/engineContext";
import { resolveLegMinutesBetween } from "@/lib/itineraryLegMinutes";
import type {
  Itinerary,
  ItineraryStop,
  ItineraryTimelineItem,
  Place,
  TripLodgingPlan,
  TripPreferences,
  TripTheme,
} from "@/types/travel";

function zoneLabelFor(preferences: TripPreferences): string {
  return travelZoneShortLabels[preferences.zoneId] ?? mvpRegion.name;
}

const themePlaceHints: Record<TripTheme, string[]> = {
  culture: ["중앙시장", "항구", "논골"],
  activity: ["케이블카", "도째비", "추암", "스카이"],
  history: ["환선굴", "대금굴", "묵호등대"],
  experience: ["장호", "어촌", "체험"],
  nature: ["장호", "묵호", "추암 촛대", "동해"],
  rest: ["논골", "장호", "카페", "추암"],
};

const themePartnerPlaceIds: Partial<Record<TripTheme, string>> = {
  activity: "samcheok-cablecar",
  history: "hwanseon-cave",
  nature: "samcheok-cablecar",
};

function isCultureOnlyThemes(themes: TripTheme[]): boolean {
  return themes.length === 1 && themes[0] === "culture";
}

/** 자동 채움(테마·필러) — 음식점·카페는 culture 단일 테마가 아니면 제외 (시장은 관광지) */
function isAutoFillSelectablePlace(
  place: Place,
  themes: TripTheme[],
  caveFilterOpts: { season: TripPreferences["season"]; anchorPlaceId: string | null },
): boolean {
  if (isLodgingPlace(place)) return false;
  if (shouldSkipCavePlace(place, caveFilterOpts)) return false;
  if (!isCultureOnlyThemes(themes) && isDiningPlace(place)) return false;
  return true;
}

function filterScheduleablePlaces(
  places: Place[],
  themes: TripTheme[],
  caveFilterOpts: { season: TripPreferences["season"]; anchorPlaceId: string | null },
): Place[] {
  return places.filter((place) => isAutoFillSelectablePlace(place, themes, caveFilterOpts));
}

function resolveThemePlaces(
  themes: TripTheme[],
  zoneId: TripPreferences["zoneId"],
): Place[] {
  const hints = [...new Set(themes.flatMap((theme) => themePlaceHints[theme] ?? []))];
  const resolved: Place[] = [];
  const seen = new Set<string>();

  for (const hint of hints) {
    const place =
      getCatalogPlaceById(hint) ?? findCatalogPlaceByNameHint(hint, zoneId);
    if (!place || seen.has(place.id)) continue;
    seen.add(place.id);
    resolved.push(place);
  }

  return resolved;
}

export async function createItineraryStop(
  place: Place,
  order: number,
  day: ItineraryStop["day"],
  engineContext?: EngineContext,
): Promise<ItineraryStop> {
  let crowdLevel: ItineraryStop["crowdLevel"];
  let expectedWait: ItineraryStop["expectedWait"];
  let crowdConfidence: ItineraryStop["crowdConfidence"];

  if (engineContext) {
    const estimate = estimatePlaceCrowdQuick(place, engineContext);
    const crowd = resolveStopCrowdFields(place, {
      level: estimate.level,
      expectedWait: estimate.expectedWait,
      confidence: estimate.confidence,
    });
    crowdLevel = crowd.crowdLevel;
    expectedWait = crowd.expectedWait;
    crowdConfidence = crowd.crowdConfidence;
  } else if (placeHasPartnerSlots(place)) {
    crowdLevel = place.availableSlots[0]?.crowdLevel;
    expectedWait = place.availableSlots[0]?.expectedWait;
    crowdConfidence = crowdLevel ? "high" : undefined;
  }

  return {
    id: `stop-${place.id}-${Date.now()}-${order}`,
    order,
    day,
    placeId: place.id,
    placeName: place.name,
    category: place.category,
    duration: place.estimatedDuration,
    note: place.recommendationReason,
    movementNote: place.distanceNote,
    coordinates: place.coordinates,
    reservationRequired: place.reservationRequired,
    partner: place.partner,
    crowdLevel,
    expectedWait,
    crowdConfidence,
  };
}

export async function buildStopsFromScheduledSlices(
  slices: PlannedDaySlice[],
  preferences: TripPreferences,
  context?: EngineContext,
  routePlan?: { orderedPlaceIds: string[]; orderedLegMinutes?: number[] },
): Promise<ItineraryStop[]> {
  const transportation = preferences.transportation;
  let stops: ItineraryStop[] = [];

  for (const slice of slices) {
    const places = slice.placeIds
      .map((id) => getCatalogPlaceById(id))
      .filter((place): place is Place => Boolean(place));

    if (places.length === 0) continue;

    const dayStops: ItineraryStop[] = [];

    for (let i = 0; i < places.length; i += 1) {
      const place = places[i];
      const stop = await createItineraryStop(place, i + 1, slice.day, context);
      const travelMinutes =
        i < places.length - 1
          ? resolveLegMinutesBetween(
              place.id,
              places[i + 1].id,
              routePlan?.orderedPlaceIds ?? places.map((p) => p.id),
              routePlan?.orderedLegMinutes,
              transportation,
            )
          : undefined;

      dayStops.push(
        travelMinutes !== undefined
          ? {
              ...stop,
              travelMinutesToNext: travelMinutes,
              movementNote: formatMovementLeg(
                travelMinutes,
                transportation,
                places[i + 1].name,
              ),
            }
          : stop,
      );
    }

    const reflowed = await reflowDayStopsAsync(dayStops, slice.day, context);
    stops = [...stops, ...reflowed];
  }

  const normalized: ItineraryStop[] = [];
  for (const day of collectItineraryDaysFromStops(stops)) {
    const dayStops = stops
      .filter((stop) => stop.day === day)
      .sort((a, b) => a.order - b.order);
    dayStops.forEach((stop, index) => {
      normalized.push({ ...stop, order: index + 1 });
    });
  }

  const selectedState = context?.selectedPlaceState;
  if (!selectedState) return normalized;

  return normalized.map((stop) => {
    const selected = selectedState[stop.placeId];
    if (!selected) return stop;
    return {
      ...stop,
      selectionState: selected.state,
      lockedDay: selected.lockedDay,
      lockedOrder: selected.lockedOrder,
      lockedTime: selected.lockedTime,
    };
  });
}

async function placeToStop(
  place: Place,
  order: number,
  day: ItineraryStop["day"],
  engineContext?: EngineContext,
): Promise<ItineraryStop> {
  return createItineraryStop(place, order, day, engineContext);
}

export { buildItineraryTimeline, repairItinerary } from "@/services/itineraryRepair";

export async function selectPlacesForExecution(
  preferences: TripPreferences,
  anchorPlaceId?: string | null,
  engineContext?: EngineContext,
): Promise<Place[]> {
  return selectPlaces(preferences, anchorPlaceId, engineContext);
}

async function selectPlaces(
  preferences: TripPreferences,
  anchorPlaceId?: string | null,
  engineContext?: EngineContext,
): Promise<Place[]> {
  const resolved = enrichPreferencesFromRegionalContext(preferences);
  const effectiveThemes = resolveEffectiveThemes(resolved);
  const ordered = resolveThemePlaces(effectiveThemes, resolved.zoneId);

  const catalogPlaces = getCatalogPlaces().filter((place) => place.region === resolved.zoneId);
  const anchorPlace = anchorPlaceId
    ? catalogPlaces.find((place) => place.id === anchorPlaceId) ??
      getCatalogPlaceById(anchorPlaceId)
    : undefined;

  const themePartnerId = effectiveThemes
    .map((theme) => themePartnerPlaceIds[theme])
    .find(Boolean);
  const themePartnerCandidate =
    themePartnerId && themePartnerId !== anchorPlace?.id
      ? catalogPlaces.find((place) => place.id === themePartnerId)
      : undefined;
  const themePartner =
    themePartnerCandidate &&
    !shouldSkipCavePlace(themePartnerCandidate, {
      season: resolved.season,
      anchorPlaceId: anchorPlace?.id ?? null,
    })
      ? themePartnerCandidate
      : undefined;

  const caveFilterOpts = {
    season: resolved.season,
    anchorPlaceId: anchorPlace?.id ?? null,
  };

  const { mustGo: mustGoPlaces, interested: interestedPlaces } =
    resolvePlacesFromSelectionState(engineContext?.selectedPlaceState, resolved.zoneId, caveFilterOpts);

  const merged = [
    ...mustGoPlaces,
    ...(anchorPlace && !mustGoPlaces.some((place) => place.id === anchorPlace.id)
      ? [anchorPlace]
      : []),
    ...interestedPlaces.filter(
      (place) =>
        place.id !== anchorPlace?.id &&
        !mustGoPlaces.some((item) => item.id === place.id),
    ),
    ...(themePartner &&
    isAutoFillSelectablePlace(themePartner, effectiveThemes, caveFilterOpts) &&
    !ordered.some((candidate) => candidate.id === themePartner.id)
      ? [themePartner]
      : []),
    ...ordered.filter(
      (place) =>
        place.id !== anchorPlace?.id &&
        place.id !== themePartner?.id &&
        isAutoFillSelectablePlace(place, effectiveThemes, caveFilterOpts),
    ),
  ];
  const unique = merged.filter(
    (place, index, array) => array.findIndex((item) => item.id === place.id) === index,
  );

  const limit = Math.min(getMaxAttractionStopsForTrip(resolved), 14);
  const scheduleable = filterScheduleablePlaces(unique, effectiveThemes, caveFilterOpts);
  if (scheduleable.length >= limit) {
    return scheduleable.slice(0, limit);
  }

  const fillerCandidates = catalogPlaces.filter(
    (place) =>
      !unique.some((item) => item.id === place.id) &&
      isAutoFillSelectablePlace(place, effectiveThemes, caveFilterOpts),
  );
  const fillerIds = engineContext
    ? await rerankPlaceIdsAsync(
        fillerCandidates.map((p) => p.id),
        engineContext,
        { limit: limit - scheduleable.length, deemphasizeProximity: true },
      )
    : fillerCandidates.slice(0, limit - scheduleable.length).map((p) => p.id);
  const fillers = fillerIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));

  const combined = filterScheduleablePlaces(
    [...unique, ...fillers],
    effectiveThemes,
    caveFilterOpts,
  );
  if (!engineContext) {
    return ensureBookablePartnerInSelection(combined, resolved.zoneId, limit, resolved.season);
  }

  const rankedIds = await rerankPlaceIdsAsync(combined.map((p) => p.id), engineContext, {
    limit,
    deemphasizeProximity: true,
  });
  const ranked = rankedIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));

  return ensureBookablePartnerInSelection(ranked, resolved.zoneId, limit, resolved.season);
}

function ensureBookablePartnerInSelection(
  places: Place[],
  zoneId: TripPreferences["zoneId"],
  limit: number,
  season: TripPreferences["season"],
): Place[] {
  const trimmed = places.slice(0, limit);
  const hasBookablePartner = trimmed.some(
    (place) => place.partner && place.reservationRequired && place.qrAvailable,
  );
  if (hasBookablePartner) return trimmed;

  const partnerCandidates = getBookablePartnerPlaces().filter(
    (place) =>
      place.region === zoneId && !trimmed.some((candidate) => candidate.id === place.id),
  );
  const fallbackPartner =
    partnerCandidates.find(
      (place) => !shouldSkipCavePlace(place, { season, anchorPlaceId: null }),
    ) ?? partnerCandidates[0];
  if (!fallbackPartner) return trimmed;

  if (trimmed.length >= limit) {
    return [...trimmed.slice(0, limit - 1), fallbackPartner];
  }
  return [...trimmed, fallbackPartner];
}

export async function generateExecutableItinerary(
  preferences: TripPreferences,
  anchorPlaceId?: string | null,
  engineContext?: EngineContext,
  options?: {
    skipSelectPlaces?: boolean;
    preselectedPlaceIds?: string[];
    routeProfile?: import("@/lib/routeMatrixPreference").RouteMatrixProfile;
    lodgingPlan?: TripLodgingPlan;
  },
): Promise<Itinerary> {
  // TODO: Replace with OpenAI/Gemini structured itinerary generation.
  const resolved = enrichPreferencesFromRegionalContext(preferences);
  const baseContext =
    engineContext ??
    buildEngineContextFromTripStore({
      preferences: resolved,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: anchorPlaceId ?? null,
    });
  const context =
    options?.routeProfile === "fast" && baseContext.crowdMode !== "live"
      ? { ...baseContext, crowdMode: "quick" as const }
      : baseContext;

  const selected = options?.skipSelectPlaces && options.preselectedPlaceIds
    ? options.preselectedPlaceIds
        .map((id) => getCatalogPlaceById(id))
        .filter((place): place is Place => Boolean(place))
    : await selectPlaces(resolved, anchorPlaceId, context);
  const effectiveThemes = resolveEffectiveThemes(resolved);
  const attractionIds = filterAttractionPlaceIds(
    selected.map((place) => place.id),
    resolved,
    { anchorPlaceId },
  );

  const lodgingPlan = options?.lodgingPlan ?? context.lodgingPlan;
  const plan = await scheduleItineraryFromPlaceIds(attractionIds, resolved, context, {
    anchorPlaceId,
    routeProfile: options?.routeProfile ?? "accurate",
    lodgingPlan: context.lodgingPlan,
  });
  const ordered = plan.orderedPlaceIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));
  const stops = await buildStopsFromScheduledSlices(plan.slices, resolved, context, {
    orderedPlaceIds: plan.orderedPlaceIds,
    orderedLegMinutes: plan.orderedLegMinutes,
  });
  const routeSeconds = plan.totalRouteSeconds;
  const reservationPlaceIds = ordered
    .filter((place) => place.reservationRequired)
    .map((place) => place.id);

  const anchorPlace = anchorPlaceId ? getCatalogPlaceById(anchorPlaceId) : undefined;
  const themeLabel = formatTripThemesLabel(effectiveThemes);

  const seasonLabel = getSeasonLabel(resolved.season);
  const zoneName = zoneLabelFor(resolved);
  const draft: Itinerary = {
    id: `itinerary-${Date.now()}`,
    region: resolved.zoneId,
    title: anchorPlace
      ? `${anchorPlace.name} 중심 ${seasonLabel} 실행 일정`
      : `${zoneName} ${seasonLabel} ${themeLabel} 실행 일정`,
    summary: `${resolved.travelDate} · ${resolved.travelers}명 · ${formatRegionalSummary(resolved)} · ${getTransportationLabel(resolved.transportation)}`,
    totalDuration: resolved.pace === "relaxed" ? "6시간" : resolved.pace === "packed" ? "8시간 30분" : "7시간 20분",
    movingTime: estimateMovingTimeLabel(
      routeSeconds,
      stops.length,
      resolved.transportation,
    ),
    aiExplanation: anchorPlace
      ? `${anchorPlace.name}을(를) 중심으로 ${seasonLabel}·${formatRegionalSummary(resolved)}에 맞춰 주변 명소와 로컬 상권을 연결했습니다. 구간별 이동 시간은 ${getTransportationLabel(resolved.transportation)} 기준입니다.`
      : `${seasonLabel} 시즌과 ${formatRegionalSummary(resolved)} 성향에 맞춰 예약 명소를 먼저 배치했습니다. 구간별 이동 시간은 ${getTransportationLabel(resolved.transportation)} 기준입니다.`,
    stops,
    timeline: buildItineraryTimeline(stops, resolved),
    alternatives: [
      "비·눈·겨울에는 실내·전망·시장 위주로 전환",
      "혼잡 시간대 제휴 슬롯 조정",
      "대중교통 선택 시 권역 버스·열차 연결 확인",
    ],
    reservationPlaceIds,
    routingSource: plan.routingSource,
  };

  const repaired = repairItinerary(draft);
  const withLodging = attachLodgingToItinerary(
    repaired,
    resolved,
    isLodgingPlanActive(lodgingPlan) ? lodgingPlan : undefined,
    plan.dayLodgingMeta,
  );
  const finalized = await recalculateItineraryMeta(withLodging, resolved, {
    skipTravelEnrich: true,
    preserveNarrative: true,
  });
  const localCount = finalized.timeline.filter((item) => item.kind === "local").length;
  let result = finalized;
  if (localCount > 0) {
    result = {
      ...finalized,
      aiExplanation: `${finalized.aiExplanation} 로컬 상권 ${localCount}곳이 경로에 포함됩니다.`,
    };
  }
  if (lodgingPlan && isLodgingPlanActive(lodgingPlan)) {
    const lodgingNote =
      lodgingPlan.mode === "per_night" && lodgingPlan.nights.length > 1
        ? "숙소 기준으로 박마다 출발·복귀 동선을 반영했습니다."
        : "숙소에서 출발해 숙소로 돌아오는 동선을 반영했습니다.";
    result = {
      ...result,
      aiExplanation: `${result.aiExplanation} ${lodgingNote}`,
    };
  }
  return result;
}

async function finalizeItineraryFromPlan(
  plan: ScheduledItineraryPlan,
  resolved: TripPreferences,
  context: EngineContext,
  aiMeta?: { explanation?: string; alternatives?: string[] },
  didBackfillAttractions = false,
): Promise<Itinerary> {
  const selected = plan.orderedPlaceIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));
  const stops = await buildStopsFromScheduledSlices(plan.slices, resolved, context, {
    orderedPlaceIds: plan.orderedPlaceIds,
    orderedLegMinutes: plan.orderedLegMinutes,
  });

  const reservationPlaceIds = selected
    .filter((place) => place.reservationRequired)
    .map((place) => place.id);
  const timeline = buildItineraryTimeline(stops, resolved);

  const zoneName = zoneLabelFor(resolved);
  const lodgingPlan = context.lodgingPlan;
  const draft: Itinerary = {
    id: `itinerary-${Date.now()}`,
    region: resolved.zoneId,
    title: `${zoneName} AI 실행 일정`,
    summary: `${resolved.travelDate} · ${resolved.travelers}명 · ${formatRegionalSummary(resolved)}`,
    totalDuration: resolved.pace === "relaxed" ? "6시간" : "7시간 20분",
    movingTime: estimateMovingTimeLabel(
      plan.totalRouteSeconds,
      stops.length,
      resolved.transportation,
    ),
    aiExplanation:
      aiMeta?.explanation ??
      (didBackfillAttractions
        ? "선택하신 관광지를 중심으로 빈 Day·남은 슬롯을 AI가 권역 추천으로 채워 실행 일정을 구성했습니다."
        : "AI가 예약·이동·체류·지리 Day 분할을 반영해 실행 가능한 순서로 일정을 구성했습니다."),
    stops,
    timeline,
    alternatives: aiMeta?.alternatives ?? [
      "비·눈·겨울에는 동굴을 빼고 항구·전망·로컬 식사 중심으로 전환",
      "혼잡 시간대 슬롯 조정",
      "대중교통 선택 시 버스 도착 정보 확인",
    ],
    reservationPlaceIds,
    routingSource: plan.routingSource,
  };

  const repaired = repairItinerary(draft);
  const withLodging = attachLodgingToItinerary(
    repaired,
    resolved,
    isLodgingPlanActive(lodgingPlan) ? lodgingPlan : undefined,
    plan.dayLodgingMeta,
  );
  return await recalculateItineraryMeta(withLodging, resolved, {
    skipTravelEnrich: true,
    preserveNarrative: true,
  });
}

export async function buildItineraryFromPlaceIds(
  placeIds: string[],
  preferences: TripPreferences,
  aiMeta?: { explanation?: string; alternatives?: string[] },
  engineContext?: EngineContext,
  weatherSummary?: string | null,
  options?: {
    preserveOrder?: boolean;
    anchorPlaceId?: string | null;
    routeProfile?: import("@/lib/routeMatrixPreference").RouteMatrixProfile;
    /** @deprecated 식당은 일정 단계에서 Day별 삽입 — 관광지만 스케줄 */
    userCuratedRoute?: boolean;
  },
): Promise<Itinerary> {
  const resolved = enrichPreferencesFromRegionalContext(preferences);
  const anchorPlaceId = options?.anchorPlaceId ?? null;
  const context =
    engineContext ??
    buildEngineContextFromTripStore({
      preferences: resolved,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: anchorPlaceId,
    });

  if (placeIds.length === 0) {
    return generateExecutableItinerary(preferences, anchorPlaceId, context);
  }

  const preserveOrder = options?.preserveOrder ?? false;
  const caveOpts = {
    season: resolved.season,
    anchorPlaceId: context.anchorPlaceId ?? null,
    weatherSummary,
  };

  if (preserveOrder) {
    const schedulePlaceIds = placeIds.filter((id) => {
      const place = getCatalogPlaceById(id);
      if (!place || isLodgingPlace(place)) return false;
      return !shouldSkipCavePlace(place, caveOpts);
    });

    const attractionPlaceCount = schedulePlaceIds.filter((id) => {
      const place = getCatalogPlaceById(id);
      return place && !isDiningPlace(place) && !isLodgingPlace(place);
    }).length;
    if (schedulePlaceIds.length === 0 || attractionPlaceCount === 0) {
      return generateExecutableItinerary(preferences, anchorPlaceId, context, {
        routeProfile: options?.routeProfile ?? "accurate",
        lodgingPlan: context.lodgingPlan,
      });
    }

    const plan = await scheduleItineraryFromPlaceIds(schedulePlaceIds, resolved, context, {
      anchorPlaceId: anchorPlaceId ?? context.anchorPlaceId,
      preserveOrder: true,
      skipMealInjection: itineraryIncludesDiningPlaceIds(schedulePlaceIds),
      routeProfile: options?.routeProfile ?? "accurate",
      lodgingPlan: context.lodgingPlan,
    });

    return finalizeItineraryFromPlan(plan, resolved, context, aiMeta, false);
  }

  const attractionIds = filterAttractionPlaceIds(placeIds, resolved, {
    anchorPlaceId: context.anchorPlaceId,
    weatherSummary,
  });

  if (attractionIds.length === 0) {
    return generateExecutableItinerary(preferences, anchorPlaceId, context, {
      routeProfile: options?.routeProfile ?? "accurate",
      lodgingPlan: context.lodgingPlan,
    });
  }

  const backfilledAttractionIds = await backfillAttractionPlaceIds(
    attractionIds,
    resolved,
    context,
    caveOpts,
  );
  const didBackfillAttractions =
    backfilledAttractionIds.length > attractionIds.length;

  const plan = await scheduleItineraryFromPlaceIds(backfilledAttractionIds, resolved, context, {
    anchorPlaceId: anchorPlaceId ?? context.anchorPlaceId,
    preserveOrder: false,
    routeProfile: options?.routeProfile ?? "accurate",
    lodgingPlan: context.lodgingPlan,
  });

  return finalizeItineraryFromPlan(plan, resolved, context, aiMeta, didBackfillAttractions);
}

export async function generateItineraryFromSavedPlaces(
  selectedPlaces: Place[],
  preferences: TripPreferences,
): Promise<Itinerary> {
  if (selectedPlaces.length === 0) {
    return generateExecutableItinerary(preferences);
  }

  const resolved = enrichPreferencesFromRegionalContext(preferences);
  const context = buildEngineContextFromTripStore({
    preferences: resolved,
    savedPlaceIds: [],
    recentPlaceIds: [],
    itineraryAnchorPlaceId: null,
  });

  const plan = await scheduleItineraryFromPlaceIds(
    selectedPlaces.map((place) => place.id),
    resolved,
    context,
  );
  const orderedPlaces = plan.orderedPlaceIds
    .map((id) => getCatalogPlaceById(id))
    .filter((place): place is Place => Boolean(place));
  const stops = await buildStopsFromScheduledSlices(plan.slices, resolved, context, {
    orderedPlaceIds: plan.orderedPlaceIds,
    orderedLegMinutes: plan.orderedLegMinutes,
  });

  const reservationPlaceIds = orderedPlaces
    .filter((place) => place.reservationRequired)
    .map((place) => place.id);

  const timeline = buildItineraryTimeline(stops, resolved);

  const zoneName = zoneLabelFor(resolved);
  const draft: Itinerary = {
    id: `itinerary-${Date.now()}`,
    region: resolved.zoneId,
    title: `${zoneName} 찜한 곳 실행 일정`,
    summary: `${resolved.travelDate} · ${resolved.travelers}명 · 찜 ${orderedPlaces.length}곳`,
    totalDuration: "7시간",
    movingTime: estimateMovingTimeLabel(
      plan.totalRouteSeconds,
      stops.length,
      preferences.transportation,
    ),
    aiExplanation:
      "찜한 장소를 체류·이동·지리 Day 분할에 맞춰 재배치해 실행 일정으로 연결했습니다. 로컬 쿠폰과 예약·혼잡·QR 흐름은 저장 후 이어집니다.",
    stops,
    timeline,
    alternatives: [
      "찜 목록에서 순서를 바꾼 뒤 다시 생성",
      "제휴 명소는 예약 탭에서 시간대 선택",
      "일정 편집에서 Day·시간 조정",
    ],
    reservationPlaceIds,
    routingSource: plan.routingSource,
  };

  return await recalculateItineraryMeta(repairItinerary(draft), preferences, {
    skipTravelEnrich: true,
  });
}

/** @deprecated Use generateExecutableItinerary */
export async function generateItinerary(
  _regionId: string,
  selectedPlaces: Place[],
  preferences?: TripPreferences,
): Promise<Itinerary> {
  if (preferences) {
    return generateExecutableItinerary(preferences);
  }

  const stops = await Promise.all(
    selectedPlaces.map((place, index) => placeToStop(place, index + 1, 1)),
  );

  const fallbackPrefs = defaultPreferences;
  return {
    id: `itinerary-${Date.now()}`,
    region: fallbackPrefs.zoneId,
    title: `${zoneLabelFor(fallbackPrefs)} 맞춤 실행 일정`,
    summary: "선택한 장소를 방문 순서대로 재구성한 일정입니다.",
    totalDuration: "7시간",
    movingTime: "1시간",
    aiExplanation: "선택 장소를 이동 부담이 적도록 재배치했습니다.",
    stops,
    timeline: buildItineraryTimeline(stops),
    alternatives: ["방문 순서 조정", "예약 슬롯 변경"],
    reservationPlaceIds: selectedPlaces
      .filter((place) => place.reservationRequired)
      .map((place) => place.id),
  };
}
