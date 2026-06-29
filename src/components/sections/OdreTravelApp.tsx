"use client";

import { useCallback, useEffect, useMemo, useRef, startTransition, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Sparkles, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppShell } from "@/components/layout/AppShell";
import { BottomNav, type BottomNavItem } from "@/components/layout/BottomNav";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { CareAlertList } from "@/components/travel/CareAlertCard";
import { CareTransitPanel } from "@/components/travel/CareTransitPanel";
import { CareWeatherPanel } from "@/components/travel/CareWeatherPanel";
import { ActiveTripFloatingBar } from "@/components/travel/ActiveTripFloatingBar";
import { MyMenuSheet } from "@/components/travel/MyMenuSheet";
import { AiAssistantSheet } from "@/components/travel/AiAssistantSheet";
import { PlaceSearchSheet } from "@/components/travel/PlaceSearchSheet";
import { TripPlaceSearchPanel } from "@/components/travel/TripPlaceSearchPanel";
import { AddPlaceSheet } from "@/components/travel/AddPlaceSheet";
import { ItineraryEditTimeline } from "@/components/travel/ItineraryEditTimeline";
import { ItineraryFeasibilityPanel } from "@/components/travel/ItineraryFeasibilityPanel";
import { ItineraryResultTimeline } from "@/components/travel/ItineraryResultTimeline";
import { PlaceBrowseSheet } from "@/components/travel/PlaceBrowseSheet";
import { PlaceCarousel } from "@/components/travel/PlaceCarousel";
import { PlaceDetailScreen } from "@/components/travel/PlaceDetailScreen";
import { PlacesScreen, type PlacesScreenMode } from "@/components/travel/PlacesScreen";
import { QRTicketCard } from "@/components/travel/QRTicketCard";
import { LocalTransitRoutePanel } from "@/components/travel/LocalTransitRoutePanel";
import { LodgingDepotPickerSheet } from "@/components/travel/LodgingDepotPickerSheet";
import { RoutePreviewCard } from "@/components/travel/RoutePreviewCard";
import { ZoneHeroMedia } from "@/components/travel/ZoneHeroMedia";
import { resolveZoneHeroMeta } from "@/data/zoneHeroImages";
import { resolveLodgingRouteAnchorsByDay } from "@/lib/lodgingItineraryLegs";
import { scrollItineraryStopIntoView } from "@/lib/itineraryTimelineStop";
import { GeneratingScreen } from "@/components/wizard/GeneratingScreen";
import { NatureRoadDriveWizard } from "@/components/wizard/NatureRoadDriveWizard";
import { PreferenceWizard } from "@/components/wizard/PreferenceWizard";
import { DayTabs, type ItineraryDayFilter } from "@/components/ui/DayTabs";
import {
  TravelCardButton,
  TravelCardShell,
  travelCardClass,
} from "@/components/ui/TravelCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { defaultCareAlerts, defaultPreferences, mvpRegion } from "@/data/mockTravelData";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import { loadFullGangwonCatalog, subscribeCatalog } from "@/data/placeCatalog";
import { isFullCatalogLoaded } from "@/lib/catalogRuntime";
import {
  getZoneHomeBundle,
  getZoneHomeBundleAsync,
  type ZoneHomeBundle,
} from "@/data/zoneHomeCatalog";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import {
  generateAiCareAlerts,
  enrichItineraryInBackground,
  generateExecutableItineraryFromPreferences,
  generateItineraryFromSavedPlacesWithPreferences,
  generateNatureRoadDriveItineraryFromPreferences,
} from "@/services/aiRecommendationService";
import type { FeaturedNatureRoadSegment } from "@/services/natureRoadCatalog";
import {
  generateDayCareSuggestions,
  generateTodayCareStatus,
  type CareEnhancements,
} from "@/services/careService";
import { demoTransitHub } from "@/config/demoTransit";
import {
  fetchMidWeatherForecast,
  fetchShortWeatherForecast,
  fetchTagoArrivals,
} from "@/services/externalDataClient";
import {
  addStopFromPlace,
  cloneItinerary,
  getAvailablePlacesToAdd,
  itinerariesEqual,
  rebuildItineraryFromStops,
  recalculateItineraryMeta,
  removeStop,
} from "@/services/itineraryEditService";
import { repairItinerary } from "@/services/itineraryRepair";
import { syncPlaceCoordinates } from "@/services/externalDataClient";
import { getPlaceById } from "@/data/placeDetailMeta";
import { ItineraryReservationScreen } from "@/components/travel/ItineraryReservationScreen";
import { GangwonPassTeaserCard } from "@/components/travel/GangwonPassTeaserCard";
import { GangwonPassSheet } from "@/components/travel/GangwonPassSheet";
import { NatureRoadSegmentCard } from "@/components/travel/NatureRoadSegmentCard";
import { NewsletterScreen } from "@/components/newsletter/NewsletterScreen";
import { OnboardingScreen } from "@/components/onboarding/OnboardingScreen";
import { ReservationHubScreen } from "@/components/travel/ReservationHubScreen";
import { RecommendationCard } from "@/components/travel/RecommendationCard";
import { RouteDiningPlanPanel } from "@/components/travel/RouteDiningPlanPanel";
import { SelectionSummaryView } from "@/components/travel/SelectionSummarySheet";
import {
  LodgingZoneRecommendationView,
  type LodgingZoneSuggestion,
} from "@/components/travel/LodgingZoneRecommendationSheet";
import { getTravelZone, isTravelZoneAvailable } from "@/data/mockRegionalFraming";
import { enrichPreferencesFromRegionalContext, getSuggestedTheme } from "@/lib/regionalPreferences";
import {
  collectItineraryDays,
  getDefaultItineraryDays,
  getDurationLabel,
  inferDurationFromDayCount,
} from "@/lib/travelDuration";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { routeLocalOffers } from "@/data/mockLocalCommerce";
import {
  getTotalReservationCount,
  getTripReservationStatusLabel,
} from "@/lib/tripReservationCounts";
import { getActiveTripFloatingBarCopy } from "@/lib/tripCalendar";
import {
  getActiveTripDayNumber,
  getTripEndDateIso,
  getTripExecutionPhase,
  type TripExecutionPhase,
} from "@/lib/tripExecutionPhase";
import { RegionStampProgress } from "@/components/travel/RegionStampProgress";
import { TravelZonePicker } from "@/components/travel/TravelZonePicker";
import { getReservationOfferById, getReservationOffers } from "@/data/mockReservationOffers";
import { getStayOffersForZone, mergeStayOffersForZone } from "@/lib/stayOffers";
import { fetchTourStayOffers } from "@/services/externalDataClient";
import type { ReservationOffer } from "@/types/reservationHub";
import {
  buildOfferBookingSummary,
  getOfferBookingNumber,
  validateOfferBookingDraft,
  type OfferBookingDraft,
} from "@/lib/offerReservationForm";
import {
  isLodgingPlanActive,
  createLodgingPlanForDuration,
  getNightCountForDuration,
} from "@/lib/tripLodgingPlan";
import { buildOdreNotePlanBridge } from "@/lib/odreNotePlanBridge";
import { getOdreNoteById } from "@/data/odreNotes";
import { OdreNotePlanBanner } from "@/components/newsletter/OdreNotePlanBanner";
import {
  getBookablePartnerPlaces,
  countItineraryReservationProgress,
  getItineraryReservationPlaces,
} from "@/services/reservationService";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/authStore";
import { useTripStore } from "@/stores/tripStore";
import type { ReservationHubCategory } from "@/types/reservationHub";
import type { ActiveGangwonPass } from "@/types/gangwonPass";
import { isPassActive } from "@/services/gangwonPassService";
import { buildRecommendationCandidates } from "@/services/recommendation/candidateGenerator";
import { rankRecommendations } from "@/services/recommendation/recommendationRanker";
import { buildRecommendationSections } from "@/services/recommendation/diversityMixer";
import {
  buildRouteDiningPlan,
  orderTourPlaceIdsForItinerary,
} from "@/services/recommendation/routeDiningPlanner";
import type { AiProvider } from "@/services/ai/types";
import type {
  CareAlert,
  CareAlertAction,
  Itinerary,
  ItineraryDay,
  Place,
  TravelZoneId,
  TripPreferences,
  SelectionIntent,
} from "@/types/travel";

type Step =
  | "onboarding"
  | "home"
  | "trip-preferences"
  | "trip-places"
  | "trip-dining"
  | "trip-summary"
  | "trip-stay-area"
  | "trip-hotels"
  | "trip-generating"
  | "trip-result"
  | "places"
  | "nature-road-plan"
  | "generating"
  | "itinerary"
  | "newsletter"
  | "reservation"
  | "itinerary-reservation"
  | "care";

type GeneratingSource = "preferences" | "saved" | "nature-road" | "odre-note";

const ONBOARDING_KEY = "odre-onboarded";

function getBackStep(
  step: Step,
  hasItinerary: boolean,
  generatingSource: GeneratingSource,
  duration?: TripPreferences["duration"],
): Step | null {
  switch (step) {
    case "trip-preferences":
      return "home";
    case "trip-places":
      if (duration && getNightCountForDuration(duration) > 0) {
        return "trip-hotels";
      }
      return "trip-preferences";
    case "trip-dining":
      return generatingSource === "odre-note" ? "trip-preferences" : "trip-places";
    case "trip-summary":
      return "trip-dining";
    case "trip-stay-area":
      return "trip-preferences";
    case "trip-hotels":
      return "trip-stay-area";
    case "trip-generating":
      return "trip-dining";
    case "trip-result":
      return "trip-dining";
    case "home":
      return null;
    case "places":
      return "home";
    case "itinerary":
      return "home";
    case "reservation":
      return "home";
    case "itinerary-reservation":
      return "itinerary";
    case "care":
      return "home";
    case "nature-road-plan":
      return "home";
    case "generating":
      if (generatingSource === "saved") return "places";
      if (generatingSource === "nature-road") return "nature-road-plan";
      return "trip-preferences";
    default:
      return null;
  }
}

function getItineraryDays(
  itinerary: Itinerary | undefined,
  duration: TripPreferences["duration"],
): ItineraryDay[] {
  if (!itinerary) {
    return getDefaultItineraryDays(duration);
  }

  const fromData = collectItineraryDays(itinerary);
  if (fromData.length > 1 || fromData[0] !== 1 || itinerary.stops.length > 0) {
    return fromData;
  }

  return getDefaultItineraryDays(duration);
}

function buildLodgingSuggestionsFromSelection(
  selectedState: Record<string, { intent: SelectionIntent }>,
  zoneId: TravelZoneId,
): LodgingZoneSuggestion[] {
  const selectedIds = Object.keys(selectedState);
  const strong = selectedIds.filter((id) => selectedState[id]?.intent === "must_go");
  const baseLabel = travelZoneShortLabels[zoneId] ?? "강원";
  if (selectedIds.length === 0) {
    return [
      {
        id: "zone-default",
        zoneLabel: `${baseLabel} 중심`,
        summary: "선택한 장소를 모으면 권역 중심 숙소가 가장 안정적입니다.",
      },
    ];
  }
  return [
    {
      id: "zone-primary",
      zoneLabel: `${baseLabel} 1박 거점`,
      summary: `현재 선택 ${selectedIds.length}곳(꼭 갈 곳 ${strong.length}곳)을 기준으로 첫날 도착형 동선에 유리합니다.`,
    },
    {
      id: "zone-secondary",
      zoneLabel: `${baseLabel} 인접 권역`,
      summary: "둘째 날 이동형(숙소→숙소) 코스를 구성할 때 이동 피로를 줄이기 좋습니다.",
    },
  ];
}

export function OdreTravelApp() {
  const [step, setStep] = useState<Step>("onboarding");
  const [tripSlideClass, setTripSlideClass] = useState("trip-slide-in-right");
  const [tripProgressStep, setTripProgressStep] = useState(1);
  const [selectedDiningPlaceIds, setSelectedDiningPlaceIds] = useState<string[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [localPreferences, setLocalPreferences] =
    useState<TripPreferences>(defaultPreferences);
  const [saveMessage, setSaveMessage] = useState("");
  const [confirmMessage, setConfirmMessage] = useState("");
  const [generatingSource, setGeneratingSource] =
    useState<GeneratingSource>("preferences");
  const [detailPlaceId, setDetailPlaceId] = useState<string | null>(null);
  const [odreNoteReading, setOdreNoteReading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [tripPlaceSearchActive, setTripPlaceSearchActive] = useState(false);
  const [tripPlaceSearchOpen, setTripPlaceSearchOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastItineraryProvider, setLastItineraryProvider] = useState<AiProvider | null>(null);
  const [itineraryBackgroundEnriching, setItineraryBackgroundEnriching] = useState(false);
  const [placesScreenMode, setPlacesScreenMode] = useState<PlacesScreenMode>("category");
  const [reservationHubCategory, setReservationHubCategory] =
    useState<ReservationHubCategory>("stay");
  /** 허브를 일정 제휴 예약 화면 등에서 연 경우 뒤로가기 복귀 대상 */
  const [reservationReturnStep, setReservationReturnStep] = useState<Step | null>(null);
  const [reservationSheetPlaceId, setReservationSheetPlaceId] = useState<string | null>(
    null,
  );
  const [reservationFocusPlaceId, setReservationFocusPlaceId] = useState<string | null>(
    null,
  );
  const [gangwonPassOpen, setGangwonPassOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [itineraryDetailUnlocked, setItineraryDetailUnlocked] = useState(false);
  const [activeSavedItineraryId, setActiveSavedItineraryId] = useState<string | null>(
    null,
  );
  /** AI 생성 직후 미리보기. '실행 일정으로 담기' 전에는 tripStore.itinerary에 반영하지 않음 */
  const [pendingItinerary, setPendingItinerary] = useState<Itinerary | null>(null);
  const [generatingRunKey, setGeneratingRunKey] = useState(0);
  /** AI 비서·채팅에서 넘긴 장소 id — generating 단계에서 실행 커널로 전달 */
  const pendingOrderedPlaceIdsRef = useRef<string[] | null>(null);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const [natureRoadPlan, setNatureRoadPlan] = useState<{
    zoneId: TravelZoneId;
    segment: FeaturedNatureRoadSegment;
  } | null>(null);
  const [lodgingPickerNight, setLodgingPickerNight] = useState<number | null>(null);
  const tripStepHistoryRef = useRef<Step[]>([]);
  const suppressTripHistoryRef = useRef(false);

  function moveTripStep(next: Step, nextOrder: number) {
    if (
      !suppressTripHistoryRef.current &&
      step.startsWith("trip-") &&
      next.startsWith("trip-") &&
      step !== next
    ) {
      tripStepHistoryRef.current.push(step);
    }
    suppressTripHistoryRef.current = false;
    setTripSlideClass(nextOrder >= tripProgressStep ? "trip-slide-in-right" : "trip-slide-back-right");
    setTripProgressStep(nextOrder);
    setStep(next);
  }

  function resetTripFlowHistory() {
    tripStepHistoryRef.current = [];
  }

  function tripGoBack() {
    const previous = tripStepHistoryRef.current.pop();
    if (previous) {
      suppressTripHistoryRef.current = true;
      const tripOrderMap: Partial<Record<Step, number>> = {
        "trip-preferences": 1,
        "trip-places": 2,
        "trip-dining": 3,
        "trip-summary": 3,
        "trip-stay-area": 1,
        "trip-hotels": 1,
        "trip-generating": 6,
        "trip-result": 7,
      };
      moveTripStep(previous, tripOrderMap[previous] ?? Math.max(1, tripProgressStep - 1));
      return;
    }
    goBack();
  }

  function cancelTripFlow() {
    resetTripFlowHistory();
    setPendingItinerary(null);
    setGeneratingRunKey((key) => key + 1);
    setStep("home");
  }

  function enterTripPreferencesFlow(
    source: GeneratingSource = "preferences",
    prefsOverride?: TripPreferences,
  ) {
    resetTripFlowHistory();
    setGeneratingSource(source);
    const synced = prefsOverride ?? preferences;
    if (prefsOverride) {
      setPreferences(prefsOverride);
    }
    setLocalPreferences(synced);
    setSaveMessage("");
    setConfirmMessage("");
    setDetailPlaceId(null);
    moveTripStep("trip-preferences", 1);
  }

  const {
    preferences,
    itinerary,
    activeItineraryCommitted,
    savedItineraries,
    reservations,
    hubBookings,
    qrTickets,
    careAlerts,
    selectedSlotByPlace,
    regionStampIds,
    regionStampCollectedAt,
    claimedStampMilestones,
    gangwonPass,
    claimedLocalOfferIds,
    claimLocalOffer,
    claimStampMilestone,
    purchaseGangwonPass,
    redeemGangwonPassBenefit,
    setPreferences,
    setItinerary,
    clearActiveItinerary,
    saveCurrentItinerary,
    deleteSavedItinerary,
    loadItinerary,
    selectSlot,
    confirmPlaceReservation,
    checkInQrTicket,
    confirmHubOffer,
    updateItinerary,
    savedPlaceIds,
    recentPlaceIds,
    behaviorProfile,
    itineraryAnchorPlaceId,
    trackRecentPlace,
    trackBehavior,
    lodgingPlan,
    useLodgingBasedRoutes,
    setLodgingForNight,
    selectedPlaceState,
    setPlaceSelection,
    clearPlaceSelection,
    odreNotePlanContext,
    setOdreNotePlanContext,
    clearOdreNotePlanContext,
    clearAllPlaceSelections,
  } = useTripStore();

  const [zoneStayOffers, setZoneStayOffers] = useState<ReservationOffer[]>(() =>
    getStayOffersForZone(defaultPreferences.zoneId, 6),
  );

  useEffect(() => {
    const fallback = getStayOffersForZone(preferences.zoneId, 6);
    setZoneStayOffers(fallback);
    let cancelled = false;
    void fetchTourStayOffers(preferences.zoneId)
      .then((result) => {
        if (cancelled || result.offers.length === 0) return;
        setZoneStayOffers(mergeStayOffersForZone(preferences.zoneId, result.offers, 6));
      })
      .catch(() => {
        /* GW 미연동 시 권역 목업 유지 */
      });
    return () => {
      cancelled = true;
    };
  }, [preferences.zoneId]);

  function completeTripPreferencesWizard() {
    const prefsToCommit = odreNotePlanContext
      ? enrichPreferencesFromRegionalContext({
          ...localPreferences,
          zoneId: odreNotePlanContext.zoneId,
          travelPurpose: odreNotePlanContext.lockedTravelPurpose,
          themes: [...odreNotePlanContext.lockedThemes],
        })
      : enrichPreferencesFromRegionalContext(localPreferences);
    setPreferences(prefsToCommit);
    setLocalPreferences(prefsToCommit);
    const store = useTripStore.getState();
    store.setLodgingPlan(
      createLodgingPlanForDuration(prefsToCommit.duration, store.lodgingPlan),
    );

    const needsLodging =
      getNightCountForDuration(prefsToCommit.duration) > 0 &&
      !isLodgingPlanActive(useTripStore.getState().lodgingPlan);

    if (generatingSource === "odre-note" || odreNotePlanContext) {
      moveTripStep(needsLodging ? "trip-stay-area" : "trip-dining", needsLodging ? 4 : 3);
      return;
    }

    moveTripStep(
      needsLodging ? "trip-stay-area" : "trip-places",
      needsLodging ? 1 : 2,
    );
  }

  function advanceAfterLodgingWizard() {
    if (generatingSource === "odre-note" || odreNotePlanContext) {
      moveTripStep("trip-dining", 3);
      return;
    }
    moveTripStep("trip-places", 2);
  }

  function handlePlanFromOdreNote(noteId: string) {
    const note = getOdreNoteById(noteId);
    if (!note) return;

    const store = useTripStore.getState();
    const bridge = buildOdreNotePlanBridge(note, store.preferences);

    clearAllPlaceSelections();
    clearOdreNotePlanContext();
    setOdreNotePlanContext(bridge.context);
    // 날짜·기간·인원·숙소는 PreferenceWizard에서 직접 확정 — 노트는 권역·테마·장소만 선반영
    setLocalPreferences(bridge.preferences);

    // 노트 방문 순서 → must_go updatedAt (orderTourPlaceIdsForItinerary와 동일 규칙)
    const selectionBaseMs = Date.now();
    const notePlaceState = Object.fromEntries(
      bridge.placeSelections.map((selection, index) => [
        selection.placeId,
        {
          intent: selection.intent,
          state: "fixed" as const,
          updatedAt: new Date(selectionBaseMs + index).toISOString(),
        },
      ]),
    );
    useTripStore.setState({ selectedPlaceState: notePlaceState });

    if (bridge.context.orderedPlaceIds[0]) {
      store.setItineraryAnchorPlace(bridge.context.orderedPlaceIds[0]);
    }

    trackBehavior("tab_view", {
      tab: "newsletter",
      metadata: { noteId, action: "plan_from_note" },
    });
    resetTripFlowHistory();
    setGeneratingSource("odre-note");
    setPendingItinerary(null);
    setSaveMessage("");
    setConfirmMessage("");
    moveTripStep("trip-preferences", 1);
  }

  const odreNotePlanBanner =
    odreNotePlanContext &&
    (step === "trip-preferences" ||
      step === "trip-places" ||
      step === "trip-dining" ||
      step === "trip-stay-area" ||
      step === "trip-hotels") ? (
      <div className="px-5 pb-3">
        <OdreNotePlanBanner
          hint={odreNotePlanContext.planHint}
          matchedPlaceCount={odreNotePlanContext.orderedPlaceIds.length}
        />
      </div>
    ) : null;

  const engineContext = useMemo(
    () =>
      buildEngineContextFromTripStore({
        preferences,
        savedPlaceIds,
        recentPlaceIds,
        itineraryAnchorPlaceId,
        behaviorProfile,
        lodgingPlan,
        selectedPlaceState,
      }),
    [
      preferences,
      savedPlaceIds,
      recentPlaceIds,
      itineraryAnchorPlaceId,
      behaviorProfile,
      lodgingPlan,
      selectedPlaceState,
    ],
  );

  const committedItinerary = activeItineraryCommitted ? itinerary : undefined;
  const careStatus = generateTodayCareStatus(
    committedItinerary,
    reservations,
    qrTickets,
    hubBookings,
  );
  const hubReservationPlaces = useMemo(
    () => getBookablePartnerPlaces(preferences.zoneId),
    [preferences.zoneId, catalogRevision],
  );
  const displayItinerary = pendingItinerary ?? committedItinerary;
  const hasCommittedItinerary = Boolean(committedItinerary);
  const tripExecutionPhase = useMemo(
    () => getTripExecutionPhase(preferences.travelDate, preferences.duration),
    [preferences.travelDate, preferences.duration],
  );
  const tripFloatingBarCopy = useMemo(
    () => getActiveTripFloatingBarCopy(preferences.travelDate, preferences.duration),
    [preferences.travelDate, preferences.duration],
  );
  const hasItineraryView = Boolean(
    committedItinerary || pendingItinerary || savedItineraries.length > 0,
  );
  const itineraryReservationPlaces = committedItinerary
    ? getItineraryReservationPlaces(committedItinerary)
    : [];
  const committedReservationProgress = committedItinerary
    ? countItineraryReservationProgress(committedItinerary, reservations)
    : { total: 0, confirmed: 0, pending: 0 };
  const itineraryReservationCount = committedReservationProgress.total;
  const previewReservationCount = displayItinerary
    ? getItineraryReservationPlaces(displayItinerary).length
    : 0;
  const previewPendingReservationCount =
    pendingItinerary && displayItinerary
      ? Math.max(
          0,
          getItineraryReservationPlaces(displayItinerary).length - reservations.length,
        )
      : 0;
  const authUser = useAuthStore((state) => state.user);
  const pendingReservationCount = committedReservationProgress.pending;
  const tripFloatingBarStatus = useMemo(() => {
    if (tripExecutionPhase !== "trip-day") {
      return tripFloatingBarCopy.status;
    }
    const reservationLabel = getTripReservationStatusLabel(
      reservations,
      hubBookings,
      pendingReservationCount,
    );
    return reservationLabel === "실행 중" ? tripFloatingBarCopy.status : reservationLabel;
  }, [
    tripExecutionPhase,
    tripFloatingBarCopy.status,
    reservations,
    hubBookings,
    pendingReservationCount,
  ]);
  const careAlertCount = careAlerts.filter((alert) => alert.priority === "high").length;
  const totalReservationCount = getTotalReservationCount(reservations, hubBookings);
  const confirmedPlaceIds = reservations.map((item) => item.placeId);
  const selectedIntents = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(selectedPlaceState).map(([placeId, value]) => [placeId, value.intent]),
      ) as Record<string, SelectionIntent>,
    [selectedPlaceState],
  );
  const recommendationSections = useMemo(() => {
    const candidates = buildRecommendationCandidates(preferences, Object.keys(selectedPlaceState));
    const ranked = rankRecommendations(candidates, preferences, selectedIntents);
    return buildRecommendationSections(ranked);
  }, [preferences, selectedIntents, selectedPlaceState]);
  const selectedCount = Object.keys(selectedPlaceState).length;
  const itineraryTourCount = useMemo(
    () => orderTourPlaceIdsForItinerary(selectedPlaceState, preferences).length,
    [selectedPlaceState, preferences],
  );
  const mustGoCount = Object.values(selectedPlaceState).filter((v) => v.intent === "must_go").length;
  const hasSelectedLodging = useMemo(() => isLodgingPlanActive(lodgingPlan), [lodgingPlan]);
  const routeDiningPlan = useMemo(
    () =>
      buildRouteDiningPlan({
        preferences,
        lodgingPlan,
        selectedPlaceState,
      }),
    [preferences, lodgingPlan, selectedPlaceState],
  );
  const selectedIntentsMap = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(selectedPlaceState).map(([placeId, value]) => [placeId, value.intent]),
      ) as Record<string, SelectionIntent>,
    [selectedPlaceState],
  );
  const prevTripStepRef = useRef<Step>("onboarding");

  useEffect(() => {
    if (step === "trip-dining" && prevTripStepRef.current !== "trip-dining") {
      setSelectedDiningPlaceIds(routeDiningPlan.resolvedDiningPlaceIds);
    }
    prevTripStepRef.current = step;
  }, [step, routeDiningPlan]);

  function showToast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(""), 2800);
  }

  function openMyReservations() {
    setConfirmMessage("");
    if (committedItinerary) {
      const partnerPlaces = getItineraryReservationPlaces(committedItinerary);
      const firstPending = partnerPlaces.find(
        (place) => !reservations.some((item) => item.placeId === place.id),
      );
      setReservationFocusPlaceId(firstPending?.id ?? null);
      setStep("itinerary-reservation");
      return;
    }
    openReservationHub("attraction");
  }

  function commitPendingItineraryToStore() {
    if (!pendingItinerary) return false;
    setItinerary(pendingItinerary);
    setPendingItinerary(null);
    return true;
  }

  function clearDisplayedItinerary() {
    setPendingItinerary(null);
    clearActiveItinerary();
    setActiveSavedItineraryId(null);
    setItineraryDetailUnlocked(false);
    setConfirmMessage("");
  }

  function openItineraryAdmission() {
    setConfirmMessage("");
    commitPendingItineraryToStore();
    if (!useTripStore.getState().itinerary) {
      setConfirmMessage("실행 일정이 없습니다. 일정을 먼저 만든 뒤 예약해 주세요.");
      return;
    }
    setStep("itinerary-reservation");
  }

  function openReservationHub(
    category: ReservationHubCategory = "stay",
    sheetPlaceId: string | null = null,
    options?: { returnStep?: Step | null },
  ) {
    setReservationHubCategory(category);
    setReservationSheetPlaceId(sheetPlaceId);
    if (options && "returnStep" in options) {
      setReservationReturnStep(options.returnStep ?? null);
    } else {
      setReservationReturnStep(null);
    }
    setStep("reservation");
  }

  function openReservationHubFromItinerary(
    category: ReservationHubCategory = "stay",
  ) {
    openReservationHub(category, null, { returnStep: "itinerary-reservation" });
  }

  function startPlanFromPlace(place: Place) {
    const zone = getTravelZone(place.region);
    if (zone && !isTravelZoneAvailable(place.region)) {
      showToast(
        `${zone.label} 권역 데이터를 준비 중입니다. 다른 권역을 선택하거나 잠시 후 다시 시도해 주세요.`,
      );
      return;
    }

    useTripStore.getState().setItineraryAnchorPlace(place.id);
    const next: TripPreferences = {
      ...preferences,
      zoneId: place.region,
      themes: preferences.themes,
    };
    enterTripPreferencesFlow("preferences", next);
  }

  /** AI 비서에서 제안한 코스 → 채팅에서 수집한 조건으로 바로 일정 생성 */
  function startItineraryFromAiChat(placeIds: string[], mergedPreferences?: TripPreferences) {
    pendingOrderedPlaceIdsRef.current =
      placeIds.length > 0 ? [...placeIds] : null;

    if (mergedPreferences) {
      setPreferences(mergedPreferences);
      setLocalPreferences(mergedPreferences);
    }

    const anchorId = placeIds[0];
    const anchorPlace = anchorId ? getCatalogPlaces().find((p) => p.id === anchorId) : undefined;

    if (anchorPlace) {
      const zone = getTravelZone(anchorPlace.region);
      if (zone && !isTravelZoneAvailable(anchorPlace.region)) {
        showToast(
          `${zone.label} 권역 데이터를 준비 중입니다. 다른 권역을 선택하거나 잠시 후 다시 시도해 주세요.`,
        );
        return;
      }
      useTripStore.getState().setItineraryAnchorPlace(anchorPlace.id);
      setPreferences({ ...preferences, zoneId: anchorPlace.region });
      setLocalPreferences({ ...localPreferences, zoneId: anchorPlace.region });
    } else if (anchorId) {
      useTripStore.getState().setItineraryAnchorPlace(anchorId);
    }

    setGeneratingSource("preferences");
    setSaveMessage("");
    setConfirmMessage("");
    setActiveSavedItineraryId(null);
    setPendingItinerary(null);
    setItineraryDetailUnlocked(true);
    setGeneratingRunKey((key) => key + 1);
    setStep("generating");
  }

  function startNatureRoadPlanning(
    zoneId: TravelZoneId,
    segment: FeaturedNatureRoadSegment,
  ) {
    const next: TripPreferences = {
      ...preferences,
      transportation: "car",
      travelPurpose: "drive",
      themes: [getSuggestedTheme(preferences.season, "drive")],
      zoneId,
    };
    setNatureRoadPlan({ zoneId, segment });
    setLocalPreferences(next);
    setPreferences(next);
    setPendingItinerary(null);
    setSaveMessage("");
    setConfirmMessage("");
    setStep("nature-road-plan");
  }

  function completeNatureRoadWizard() {
    setPreferences(localPreferences);
    setGeneratingSource("nature-road");
    setSaveMessage("");
    setConfirmMessage("");
    setGeneratingRunKey((key) => key + 1);
    setStep("generating");
  }

  function updateRegionalPreference<K extends "season" | "zoneId">(
    key: K,
    value: TripPreferences[K],
  ) {
    const next =
      key === "season"
        ? {
            ...preferences,
            season: value as TripPreferences["season"],
            themes: [
              getSuggestedTheme(
                value as TripPreferences["season"],
                preferences.travelPurpose,
              ),
            ],
          }
        : { ...preferences, [key]: value };
    setPreferences(next);
    if (step === "trip-preferences") {
      setLocalPreferences(next);
    }
  }

  function openGangwonPassHub() {
    setGangwonPassOpen(true);
  }

  function notifyRegionStampIfEarned(beforeStampIds: TravelZoneId[]) {
    const after = useTripStore.getState().regionStampIds;
    const newZoneId = after.find((id) => !beforeStampIds.includes(id));
    if (!newZoneId) return;
    const label = getTravelZone(newZoneId)?.label ?? "권역";
    showToast(`${label} 예약 인증으로 방문 스탬프가 적립되었습니다.`);
  }

  function handlePurchaseGangwonPass(planId: string) {
    const ok = purchaseGangwonPass(planId, "혜택 연동");
    if (ok) {
      showToast("강원 혜택이 일정에 연동되었습니다.");
    }
    return ok;
  }

  function handleRedeemPassBenefit(benefitId: string) {
    return redeemGangwonPassBenefit(benefitId);
  }

  function handleCareAlertAction(alert: CareAlert) {
    const action = alert.action;
    if (!action) return;

    runCareAlertAction(action);
  }

  function runCareAlertAction(action: CareAlertAction) {
    switch (action.type) {
      case "qr-ticket":
        if (hasCommittedItinerary && pendingReservationCount > 0) {
          setStep("itinerary-reservation");
        } else if (reservations.length > 0) {
          setStep("itinerary-reservation");
        } else {
          setStep("care");
        }
        break;
      case "itinerary-reservation":
        setStep("itinerary-reservation");
        break;
      case "itinerary-edit":
        setItineraryDetailUnlocked(true);
        setStep("itinerary");
        break;
      case "local-coupons":
        setStep("care");
        break;
      case "hub-reservations":
        openReservationHub("stay");
        break;
      case "transport-hub":
        openReservationHub("transport");
        break;
      case "place":
        openPlaceDetail(action.placeId);
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    let finished = false;
    const finishHydration = () => {
      if (finished) return;
      finished = true;
      setHasHydrated(true);
    };

    if (useTripStore.persist.hasHydrated()) {
      finishHydration();
      return;
    }

    const unsub = useTripStore.persist.onFinishHydration(finishHydration);
    const timeoutId = window.setTimeout(finishHydration, 2500);

    return () => {
      unsub();
      window.clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const state = useTripStore.getState();
    if (state.itinerary && !state.activeItineraryCommitted) {
      const hasTripProgress =
        state.reservations.length > 0 || state.qrTickets.length > 0;
      if (hasTripProgress) {
        useTripStore.setState({ activeItineraryCommitted: true });
      } else {
        useTripStore.setState({
          itinerary: undefined,
          activeItineraryCommitted: false,
          reservations: [],
          qrTickets: [],
          selectedSlotByPlace: {},
          careAlerts: defaultCareAlerts,
        });
        setPendingItinerary(null);
        setItineraryDetailUnlocked(false);
      }
    }
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    let cancelled = false;

    syncPlaceCoordinates()
      .then(({ results }) => {
        if (cancelled || results.length === 0) return;
        const state = useTripStore.getState();
        if (state.itinerary && state.activeItineraryCommitted) {
          state.updateItinerary(repairItinerary(state.itinerary));
        }
      })
      .catch(() => {
        /* Kakao REST 미설정·도메인 오류 시 mock 좌표 유지 */
      });

    return () => {
      cancelled = true;
    };
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;

    setStep((current) => {
      if (current !== "onboarding") return current;
      if (activeItineraryCommitted && itinerary) return "home";
      if (typeof window !== "undefined" && sessionStorage.getItem(ONBOARDING_KEY)) {
        return "home";
      }
      return "onboarding";
    });
  }, [hasHydrated, itinerary, activeItineraryCommitted]);

  useEffect(() => {
    if (!hasHydrated) return;
    void loadFullGangwonCatalog();
    return subscribeCatalog(() => setCatalogRevision((value) => value + 1));
  }, [hasHydrated]);

  useEffect(() => {
    if (step === "trip-preferences") {
      setLocalPreferences(preferences);
    }
  }, [step, preferences]);

  useEffect(() => {
    if (step !== "reservation" && step !== "itinerary-reservation") {
      setConfirmMessage("");
    }
  }, [step]);

  function goBack() {
    if (detailPlaceId) {
      closePlaceDetail();
      return;
    }
    if (step === "reservation" && reservationReturnStep) {
      const returnTo = reservationReturnStep;
      setReservationReturnStep(null);
      setStep(returnTo);
      return;
    }
    const previous = getBackStep(step, hasItineraryView, generatingSource, preferences.duration);
    if (!previous) return;
    const tripOrderMap: Partial<Record<Step, number>> = {
      "trip-preferences": 1,
      "trip-places": 2,
      "trip-dining": 3,
      "trip-summary": 3,
      "trip-stay-area": 1,
      "trip-hotels": 1,
      "trip-generating": 6,
      "trip-result": 7,
    };
    const previousOrder = tripOrderMap[previous];
    if (previousOrder) {
      moveTripStep(previous, previousOrder);
      return;
    }
    setStep(previous);
  }

  function completeOnboarding() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(ONBOARDING_KEY, "1");
    }
    setStep("home");
  }

  function updatePreference<K extends keyof TripPreferences>(
    key: K,
    value: TripPreferences[K],
  ) {
    setLocalPreferences((current) => ({ ...current, [key]: value }));
  }

  const runGeneratingTask = useCallback(async (): Promise<{ provider?: AiProvider }> => {
    await loadFullGangwonCatalog();
    const state = useTripStore.getState();
    const prefs = state.preferences;
    const anchorPlaceId = state.itineraryAnchorPlaceId;
    const diningPlanForGeneration = buildRouteDiningPlan({
      preferences: prefs,
      lodgingPlan: state.lodgingPlan,
      selectedPlaceState: state.selectedPlaceState ?? {},
    });

    const orderedFromSelection = diningPlanForGeneration.tourPlaceIds;

    if (generatingSource === "saved") {
      const savedPlaces = state.savedPlaceIds
        .map((id) => getCatalogPlaces().find((place) => place.id === id))
        .filter((place): place is Place => Boolean(place));
      const generated = await generateItineraryFromSavedPlacesWithPreferences(
        savedPlaces,
        prefs,
      );
      setPendingItinerary(generated);
      setLastItineraryProvider("rules");
      setActiveSavedItineraryId(null);
      setItineraryDetailUnlocked(true);
      return { provider: "rules" };
    }

    if (generatingSource === "nature-road" && natureRoadPlan) {
      const engineCtx = buildEngineContextFromTripStore(state);
      const generated = await generateNatureRoadDriveItineraryFromPreferences(
        prefs,
        natureRoadPlan.zoneId,
        engineCtx,
      );
      state.trackBehavior("itinerary_generate");
      setPendingItinerary(generated);
      setLastItineraryProvider("rules");
      setActiveSavedItineraryId(null);
      setItineraryDetailUnlocked(true);
      return { provider: "rules" };
    }

    const engineCtx = buildEngineContextFromTripStore(state);
    const orderedFromChat = pendingOrderedPlaceIdsRef.current;
    pendingOrderedPlaceIdsRef.current = null;

    const noteCtx = state.odreNotePlanContext;
    const hasUserTourSelection = diningPlanForGeneration.tourPlaceIds.length > 0;
    const useKernelAutoFill =
      generatingSource === "odre-note" ||
      Boolean(noteCtx && noteCtx.orderedPlaceIds.length > 0) ||
      !hasUserTourSelection;

    const generationOptions = orderedFromChat?.length
      ? {
          orderedPlaceIds: orderedFromChat,
          preserveOrder: true as const,
          useLodgingBasedRoutes: state.useLodgingBasedRoutes,
        }
      : useKernelAutoFill
        ? { useLodgingBasedRoutes: state.useLodgingBasedRoutes }
        : orderedFromSelection.length
          ? {
              orderedPlaceIds: orderedFromSelection,
              preserveOrder: false as const,
              useLodgingBasedRoutes: state.useLodgingBasedRoutes,
            }
          : { useLodgingBasedRoutes: state.useLodgingBasedRoutes };

    let { itinerary: generated, provider } = await generateExecutableItineraryFromPreferences(
      prefs,
      anchorPlaceId,
      engineCtx,
      generationOptions,
    );

    if (
      generated.stops.length === 0 &&
      "orderedPlaceIds" in generationOptions &&
      generationOptions.orderedPlaceIds?.length
    ) {
      ({ itinerary: generated, provider } = await generateExecutableItineraryFromPreferences(
        prefs,
        anchorPlaceId,
        engineCtx,
        { useLodgingBasedRoutes: state.useLodgingBasedRoutes },
      ));
    }
    state.trackBehavior("itinerary_generate");
    setPendingItinerary(generated);
    setLastItineraryProvider(provider);
    state.setItineraryAnchorPlace(null);
    state.clearOdreNotePlanContext();
    setActiveSavedItineraryId(null);
    setItineraryDetailUnlocked(true);

    setItineraryBackgroundEnriching(true);
    void enrichItineraryInBackground(generated, prefs, anchorPlaceId, {
      reservations: state.reservations,
      qrTickets: state.qrTickets,
    })
      .then(({ itinerary: enriched, provider: enrichProvider, routesEnriched }) => {
        setPendingItinerary(enriched);
        setLastItineraryProvider(enrichProvider);
        if (routesEnriched) {
          showToast("실경로 이동 시간이 반영되었습니다.");
        }
      })
      .finally(() => setItineraryBackgroundEnriching(false));

    return { provider };
  }, [generatingSource, natureRoadPlan, selectedDiningPlaceIds]);

  const finishGenerating = useCallback(() => {
    setStep("itinerary");
  }, []);

  function openItineraryPicker() {
    setPendingItinerary(null);
    setItineraryDetailUnlocked(false);
    setStep("itinerary");
  }

  function handleSaveItinerary() {
    commitPendingItineraryToStore();
    const saved = saveCurrentItinerary();
    if (saved) {
      trackBehavior("itinerary_save");
    }
    setSaveMessage(saved ? "일정이 저장되었습니다." : "저장할 일정이 없습니다.");
  }

  function focusFirstPendingPartnerReservation(itineraryToBook: Itinerary) {
    const partnerPlaces = getItineraryReservationPlaces(itineraryToBook);
    const storeReservations = useTripStore.getState().reservations;
    const firstPending = partnerPlaces.find(
      (place) => !storeReservations.some((item) => item.placeId === place.id),
    );
    setReservationFocusPlaceId(firstPending?.id ?? null);
  }

  /** 새로 만든 일정만 저장 후 제휴 예약으로. 저장 목록에서 불러온 일정은 중복 저장 없이 예약만. */
  function handleCommitItineraryToTrip() {
    commitPendingItineraryToStore();
    const active = useTripStore.getState().itinerary;
    if (!active) return;

    if (activeSavedItineraryId && active.id === activeSavedItineraryId) {
      focusFirstPendingPartnerReservation(active);
      setStep("itinerary-reservation");
      return;
    }

    const existingSaved = savedItineraries.find((item) => itinerariesEqual(item, active));
    if (existingSaved) {
      setActiveSavedItineraryId(existingSaved.id);
      loadItinerary(existingSaved);
      focusFirstPendingPartnerReservation(existingSaved);
      setStep("itinerary-reservation");
      return;
    }

    if (saveCurrentItinerary()) {
      const newest = useTripStore.getState().savedItineraries[0];
      if (newest) {
        setActiveSavedItineraryId(newest.id);
        loadItinerary(newest);
        focusFirstPendingPartnerReservation(newest);
      }
      setSaveMessage("일정이 저장되었습니다.");
    } else {
      focusFirstPendingPartnerReservation(active);
    }
    setStep("itinerary-reservation");
  }

  function handleDeleteSavedItinerary(id: string) {
    const deleted = savedItineraries.find((item) => item.id === id);
    const storeSnapshot = useTripStore.getState();
    const showingCommitted = storeSnapshot.activeItineraryCommitted
      ? storeSnapshot.itinerary
      : undefined;
    const displayed = pendingItinerary ?? showingCommitted;

    deleteSavedItinerary(id);

    const remaining = useTripStore.getState().savedItineraries;
    const noSavedLeft = remaining.length === 0;

    const matchesDisplayed = Boolean(
      deleted &&
        displayed &&
        (activeSavedItineraryId === id ||
          pendingItinerary?.id === id ||
          showingCommitted?.id === id ||
          itinerariesEqual(deleted, displayed)),
    );

    // 저장 목록만 비우고 pending 미리보기가 남는 경우 방지 (일정 탭 → 휴지통 삭제)
    const shouldClearDisplay =
      matchesDisplayed ||
      activeSavedItineraryId === id ||
      (noSavedLeft && Boolean(pendingItinerary || showingCommitted));

    if (shouldClearDisplay) {
      clearDisplayedItinerary();
      if (step === "itinerary" || step === "itinerary-reservation") {
        setStep("itinerary");
      }
    } else if (activeSavedItineraryId === id) {
      setActiveSavedItineraryId(null);
      setItineraryDetailUnlocked(false);
    }

    setSaveMessage("저장한 일정을 삭제했습니다.");
  }

  function handleLoadItinerary(saved: Itinerary) {
    setPendingItinerary(null);
    loadItinerary(saved);
    setActiveSavedItineraryId(saved.id);
    setItineraryDetailUnlocked(true);
    const savedDays = getItineraryDays(saved, preferences.duration);
    const inferredDuration = inferDurationFromDayCount(savedDays.length);
    if (inferredDuration && inferredDuration !== preferences.duration) {
      setPreferences({ ...preferences, duration: inferredDuration });
      setLocalPreferences((current) => ({ ...current, duration: inferredDuration }));
    }
    setSaveMessage("");
    setConfirmMessage("");
    setStep("itinerary");
  }

  function handleConfirmHubReservation(
    placeId: string,
    payment: { amount: number; method: string },
  ) {
    const stampsBefore = regionStampIds;
    const reservationError = confirmPlaceReservation(placeId, payment);
    if (reservationError) {
      showToast(reservationError);
      setConfirmMessage(reservationError);
      return;
    }
    notifyRegionStampIfEarned(stampsBefore);
    showToast("결제가 완료되었고 QR 티켓이 발급되었습니다.");
    setConfirmMessage("결제가 완료되었고 QR 티켓이 발급되었습니다.");
  }

  function handleConfirmHubOffer(
    offerId: string,
    draft: OfferBookingDraft,
    payment: { amount: number; method: string },
  ) {
    const offer = getReservationOfferById(offerId);
    if (!offer) return;

    const validationError = validateOfferBookingDraft(offer.category, draft);
    if (validationError) {
      setConfirmMessage(validationError);
      return;
    }

    const stampsBefore = regionStampIds;
    const confirmed = confirmHubOffer(offer, {
      detailSummary: buildOfferBookingSummary(offer, draft),
      bookingNumber: getOfferBookingNumber(offer),
      payment,
    });
    if (confirmed) notifyRegionStampIfEarned(stampsBefore);
    setConfirmMessage(
      confirmed
        ? offer.category === "stay"
          ? `${offer.title} 예약이 완료되었습니다. 일정 기준 숙소로 반영됩니다.`
          : `${offer.title} 결제 및 예약이 완료되었습니다.`
        : "이미 예약된 항목입니다.",
    );
  }

  function handleConfirmItineraryReservation(
    placeId: string,
    payment: { amount: number; method: string },
  ) {
    if (!committedItinerary) {
      setConfirmMessage("실행 일정이 없습니다. 일정을 먼저 만든 뒤 예약해 주세요.");
      enterTripPreferencesFlow();
      return;
    }

    const stampsBefore = regionStampIds;
    const reservationError = confirmPlaceReservation(placeId, payment);
    if (reservationError) {
      showToast(reservationError);
      setConfirmMessage(reservationError);
      return;
    }
    notifyRegionStampIfEarned(stampsBefore);
    showToast("결제가 완료되었고 QR 티켓이 발급되었습니다.");
    setConfirmMessage("결제가 완료되었고 QR 티켓이 발급되었습니다.");
  }

  function openPlaceDetail(placeId: string) {
    trackRecentPlace(placeId);
    startTransition(() => {
      setDetailPlaceId(placeId);
    });
  }

  function closePlaceDetail() {
    setDetailPlaceId(null);
  }

  function handleAddPlaceToSchedule(place: Place) {
    const isPendingDraft = Boolean(pendingItinerary);
    const target = pendingItinerary ?? committedItinerary;
    if (!target) {
      showToast("먼저 맞춤 일정을 만든 뒤 장소를 추가할 수 있어요.");
      startPlanFromPlace(place);
      return;
    }

    const days = getItineraryDays(target, preferences.duration);
    const day = days[days.length - 1] ?? 1;
    void addStopFromPlace(target.stops, place, day, engineContext).then((nextStops) => {
      void rebuildItineraryFromStops(nextStops, target, preferences).then((next) => {
        if (isPendingDraft) {
          setPendingItinerary(next);
        } else {
          updateItinerary(next);
        }
      });
    });
    setDetailPlaceId(null);
    setStep("itinerary");
  }

  function handleItineraryEdit(next: Itinerary) {
    if (pendingItinerary) {
      setPendingItinerary(next);
      return;
    }
    updateItinerary(next);
  }

  function openItineraryTab() {
    if (savedItineraries.length > 0) {
      setItineraryDetailUnlocked(false);
    }
    setStep("itinerary");
  }

  function handleBottomNav(item: BottomNavItem) {
    if (detailPlaceId) {
      setDetailPlaceId(null);
    }
    if (step === "reservation" && item !== "reservation") {
      setReservationReturnStep(null);
    }

    const tabMap: Record<
      BottomNavItem,
      "home" | "newsletter" | "reservation" | "care" | undefined
    > = {
      home: "home",
      places: undefined,
      newsletter: "newsletter",
      reservation: "reservation",
      care: "care",
    };
    const tab = tabMap[item];
    if (tab) {
      trackBehavior("tab_view", { tab });
    }

    if (item === "home") {
      setStep("home");
      return;
    }
    if (item === "places") {
      setPlacesScreenMode("category");
      setStep("places");
      return;
    }
    if (item === "newsletter") {
      setStep("newsletter");
      return;
    }
    if (item === "reservation") {
      setReservationReturnStep(null);
      openReservationHub(reservationHubCategory);
      return;
    }
    if (item === "care") setStep("care");
  }

  function getActiveBottomItem(): BottomNavItem {
    const navStep = step;
    if (navStep === "places") return "places";
    if (navStep === "newsletter") return "newsletter";
    if (
      navStep === "itinerary" ||
      navStep === "generating" ||
      navStep === "itinerary-reservation"
    ) {
      return "home";
    }
    if (navStep === "reservation") {
      return "reservation";
    }
    if (navStep === "care") return "care";
    return "home";
  }

  const hideChrome =
    step === "onboarding" ||
    step.startsWith("trip-") ||
    step === "nature-road-plan" ||
    step === "generating" ||
    odreNoteReading;
  const itineraryMapPinned = step === "itinerary" || step === "trip-result";
  const hideAppHeader = hideChrome || Boolean(detailPlaceId);
  const detailPlace = detailPlaceId ? getPlaceById(detailPlaceId) : undefined;

  function showOnboardingAgain() {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(ONBOARDING_KEY);
    }
    setStep("onboarding");
  }

  if (!hasHydrated) {
    return (
      <AppShell>
        <MobileFrame>
          <div className="min-h-0 flex-1 bg-ivory" />
        </MobileFrame>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <MobileFrame>
        {!hideAppHeader ? (
          <AppHeader
            canGoBack={
              (step === "reservation" && reservationReturnStep !== null) ||
              getBackStep(step, hasItineraryView, generatingSource, preferences.duration) !== null
            }
            onAiChat={() => setAssistantOpen(true)}
            onAiPlan={() => enterTripPreferencesFlow()}
            onBack={goBack}
            onHome={() => setStep("home")}
            onMenu={() => setMenuOpen(true)}
            onSearch={() => setSearchOpen(true)}
            showMenuBadge={!authUser || pendingReservationCount > 0}
          />
        ) : null}

        <div className="relative flex min-h-0 flex-1 flex-col bg-ivory">
          <div
            className={cn(
              "min-h-0 flex-1 overflow-x-hidden overscroll-y-contain",
              odreNoteReading || itineraryMapPinned
                ? "flex flex-col overflow-hidden"
                : "overflow-y-auto",
            )}
          >
          {step === "home" && hasCommittedItinerary ? (
            <div className="sticky top-0 z-10 px-4 pb-2">
              <ActiveTripFloatingBar
                eyebrow={tripFloatingBarCopy.eyebrow}
                onClick={() => {
                  setItineraryDetailUnlocked(true);
                  setStep("itinerary");
                }}
                status={tripFloatingBarStatus}
                title={
                  committedItinerary?.title ??
                  `${travelZoneShortLabels[preferences.zoneId] ?? mvpRegion.name} 실행 일정`
                }
              />
            </div>
          ) : null}

          {step === "onboarding" ? (
            <OnboardingScreen onStart={completeOnboarding} />
          ) : null}
          {step === "home" ? (
            <HomeScreen
              engineContext={engineContext}
              preferences={preferences}
              catalogRevision={catalogRevision}
              onStartTripFlow={() => {
                clearOdreNotePlanContext();
                setGeneratingSource("preferences");
                moveTripStep("trip-preferences", 1);
              }}
              regionStampIds={regionStampIds}
              regionStampCollectedAt={regionStampCollectedAt}
              claimedStampMilestones={claimedStampMilestones}
              gangwonPass={gangwonPass}
              onClaimStampMilestone={(count) => {
                const ok = claimStampMilestone(count);
                showToast(
                  ok
                    ? "스탬프 마일스톤 보상이 케어·쿠폰에 반영되었습니다."
                    : "아직 받을 수 없거나 이미 수령한 보상입니다.",
                );
              }}
              toastMessage={toastMessage}
              onOpenPlace={openPlaceDetail}
              onShowIntro={showOnboardingAgain}
              onPlanNatureRoad={startNatureRoadPlanning}
              onOpenGangwonPass={openGangwonPassHub}
              onZoneChange={(zoneId) => updateRegionalPreference("zoneId", zoneId)}
              onZonePreviewOnly={(label) =>
                showToast(
                  `${label} 권역은 아직 일정 실행 준비 중입니다. 카탈로그 갱신 후 이용할 수 있어요.`,
                )
              }
            />
          ) : null}
          {step === "places" ? (
            <PlacesScreen
              mode={placesScreenMode}
              onGoHome={() => setStep("home")}
              onOpenPlace={openPlaceDetail}
              preferences={preferences}
            />
          ) : null}
          {step === "newsletter" ? (
            <NewsletterScreen
              onPlanFromNote={handlePlanFromOdreNote}
              onReadingChange={setOdreNoteReading}
              zoneLabel={
                getTravelZone(preferences.zoneId)?.label ??
                travelZoneShortLabels[preferences.zoneId] ??
                mvpRegion.name
              }
            />
          ) : null}
          {step === "trip-preferences" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              {odreNotePlanBanner}
              <TripFlowChrome current={1} onCancel={cancelTripFlow} />
              <PreferenceWizard
                noteLockedPreferences={
                  odreNotePlanContext
                    ? {
                        travelPurpose: odreNotePlanContext.lockedTravelPurpose,
                        themes: odreNotePlanContext.lockedThemes,
                      }
                    : null
                }
                onBack={() => {
                  resetTripFlowHistory();
                  moveTripStep("home", 0);
                }}
                onChange={updatePreference}
                onComplete={completeTripPreferencesWizard}
                onOpenLodgingPicker={(nightIndex) => setLodgingPickerNight(nightIndex)}
                preferences={localPreferences}
              />
            </div>
          ) : null}
          {step === "trip-places" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              <TripFlowChrome current={2} onBack={tripGoBack} onCancel={cancelTripFlow} />
              <div className="space-y-4 px-5 py-4">
              {odreNotePlanBanner}
              <TripPlaceSearchPanel
                preferences={preferences}
                selectedIntents={selectedIntentsMap}
                onPickIntent={(placeId, intent) => {
                  if (intent === "exclude") {
                    clearPlaceSelection(placeId);
                    return;
                  }
                  setPlaceSelection(placeId, { intent });
                }}
                onOpenDetail={openPlaceDetail}
                onSearchingChange={setTripPlaceSearchActive}
                onOpenFullSearch={() => setTripPlaceSearchOpen(true)}
              />
              {!tripPlaceSearchActive
                ? recommendationSections.map((section) => (
                    <section className="space-y-2" key={section.id}>
                      <SectionHeader title={section.title} />
                      <div className="grid grid-cols-1 gap-3">
                        {section.items.map((item) => (
                          <RecommendationCard
                            key={item.place.id}
                            placeId={item.place.id}
                            title={item.place.name}
                            emotionLine={item.emotionLine}
                            badges={item.badges}
                            gradient={item.place.gradient}
                            imageUrl={item.place.imageUrl}
                            selectionIntent={selectedPlaceState[item.place.id]?.intent ?? null}
                            onMustGo={() => setPlaceSelection(item.place.id, { intent: "must_go" })}
                            onLike={() => setPlaceSelection(item.place.id, { intent: "interested" })}
                            onSkip={() => clearPlaceSelection(item.place.id)}
                            onOpenDetail={() => openPlaceDetail(item.place.id)}
                          />
                        ))}
                      </div>
                    </section>
                  ))
                : null}
              <PremiumButton className="w-full" onClick={() => moveTripStep("trip-dining", 3)}>
                식당 추천으로 이동 (일정 반영 {itineraryTourCount}곳
                {selectedCount > itineraryTourCount ? ` · 선택 ${selectedCount}곳` : ""})
              </PremiumButton>
              </div>
            </div>
          ) : null}
          {step === "trip-dining" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              <TripFlowChrome current={3} onBack={tripGoBack} onCancel={cancelTripFlow} />
              <div className="space-y-4 px-5 py-4">
              {odreNotePlanBanner}
              <SectionHeader
                title="동선 최적화 + 식당 배치"
                description="관광지는 이동 시간 기준으로 순서를 맞춘 뒤, Day별로 식사를 배치합니다. 당일·첫날은 점심·저녁, 중간 Day는 3끼, 귀가일은 아침·점심까지만 넣습니다."
              />
              <RouteDiningPlanPanel plan={routeDiningPlan} />
              {itineraryTourCount === 0 ? (
                <p className="rounded-xl border border-pine/10 bg-paper px-4 py-3 text-xs leading-5 text-stone">
                  관광지를 고르지 않으면 AI가 권역·테마·기간에 맞춰 장소를 채워 일정을 만듭니다. 식당은
                  생성 단계에서 Day별로 자동 배치됩니다.
                </p>
              ) : null}
              {selectedCount > itineraryTourCount ? (
                <p className="rounded-xl border border-pine/10 bg-paper px-4 py-3 text-xs leading-5 text-stone">
                  선택한 기간·페이스의 하루 활동 시간 기준으로 관광지 {itineraryTourCount}곳까지
                  일정에 반영됩니다. 꼭 갈래요를 우선 배치했고, 나머지 선택은 참고용으로 남겨
                  두었어요. 더 많이 담으려면 페이스를 빡빡하게로 바꿔 보세요.
                </p>
              ) : null}
              <SectionHeader
                title="직접 식당 추가"
                description="자동 추천 외에 직접 식당을 검색해 추가할 수 있어요."
              />
              <TripPlaceSearchPanel
                preferences={preferences}
                selectedIntents={Object.fromEntries(
                  selectedDiningPlaceIds
                    .filter((id) => !routeDiningPlan.resolvedDiningPlaceIds.includes(id))
                    .map((id) => [id, "interested" as SelectionIntent]),
                )}
                onPickIntent={(placeId, intent) => {
                  if (intent === "exclude") {
                    setSelectedDiningPlaceIds((current) => current.filter((id) => id !== placeId));
                    return;
                  }
                  setSelectedDiningPlaceIds((current) =>
                    current.includes(placeId) ? current : [...current, placeId],
                  );
                }}
                onOpenDetail={openPlaceDetail}
                onOpenFullSearch={() => setTripPlaceSearchOpen(true)}
              />
              <PremiumButton className="w-full" onClick={() => moveTripStep("trip-generating", 6)}>
                동선 최적화 실행 (식당 {selectedDiningPlaceIds.length}곳 반영)
              </PremiumButton>
              </div>
            </div>
          ) : null}
          {step === "trip-summary" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              <TripFlowChrome current={3} onBack={tripGoBack} onCancel={cancelTripFlow} />
              <div className="space-y-4 px-5 py-4">
              <SelectionSummaryView
                selectedCount={selectedCount}
                mustGoCount={mustGoCount}
                deferredCount={Math.max(0, selectedCount - 13)}
                estimatedTravelMinutes={Math.max(120, selectedCount * 35)}
                onConfirm={() => moveTripStep("trip-stay-area", 4)}
              />
              <PremiumButton className="w-full" variant="ghost" onClick={() => moveTripStep("trip-places", 2)}>
                카드 선택으로 돌아가기
              </PremiumButton>
              </div>
            </div>
          ) : null}
          {step === "trip-stay-area" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              <TripFlowChrome current={1} onBack={tripGoBack} onCancel={cancelTripFlow} />
              <div className="space-y-4 px-5 py-4">
              <LodgingZoneRecommendationView
                suggestions={buildLodgingSuggestionsFromSelection(selectedPlaceState, preferences.zoneId)}
                onChoose={() => moveTripStep("trip-hotels", 1)}
                onClose={() => moveTripStep("trip-preferences", 1)}
              />
              </div>
            </div>
          ) : null}
          {step === "trip-hotels" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              <TripFlowChrome current={1} onBack={tripGoBack} onCancel={cancelTripFlow} />
              <div className="space-y-4 px-5 py-4">
              <SectionHeader
                title="숙소 선택"
                description={`${travelZoneShortLabels[preferences.zoneId] ?? "선택 권역"} 숙소만 추천합니다. 직접 장소로 지정할 수도 있어요.`}
              />
              {hasSelectedLodging ? (
                <p className="rounded-xl border border-pine/10 bg-paper px-3 py-2 text-xs text-stone">
                  현재 숙소가 이미 설정되어 있습니다. 그대로 다음 단계로 넘어갈 수 있어요.
                </p>
              ) : null}
              <div className="grid grid-cols-1 gap-3">
                {zoneStayOffers.map((offer) => (
                  <TravelCardButton
                    key={offer.id}
                    onClick={() => {
                      if (offer.coordinates) {
                        setLodgingForNight(1, {
                          id: `manual-${offer.id}`,
                          name: offer.title,
                          coordinates: offer.coordinates,
                          address: offer.address,
                          source: "wizard_offer",
                          offerId: offer.id,
                        });
                      }
                    }}
                  >
                    <div className="p-4 text-left">
                      <p className="text-sm font-semibold text-ink">{offer.title}</p>
                      <p className="mt-1 text-xs text-stone">{offer.subtitle}</p>
                      <p className="mt-2 text-xs font-medium text-pine">{offer.priceLabel}</p>
                    </div>
                  </TravelCardButton>
                ))}
              </div>
              <PremiumButton
                className="w-full"
                variant="ghost"
                onClick={() => setLodgingPickerNight(1)}
              >
                직접 장소로 숙소 지정
              </PremiumButton>
              <PremiumButton className="w-full" onClick={advanceAfterLodgingWizard}>
                {generatingSource === "odre-note" || odreNotePlanContext
                  ? hasSelectedLodging
                    ? "숙소 유지하고 식당·동선으로 이동"
                    : "식당·동선 배치로 이동"
                  : hasSelectedLodging
                    ? "숙소 유지하고 관광지 추천으로 이동"
                    : "관광지 추천으로 이동"}
              </PremiumButton>
              </div>
            </div>
          ) : null}
          {step === "trip-generating" ? (
            <div className={cn("trip-step-screen", tripSlideClass)}>
              <TripFlowChrome onBack={tripGoBack} onCancel={cancelTripFlow} />
              <GeneratingScreen
                runKey={generatingRunKey}
                onDone={() => moveTripStep("trip-result", 7)}
                subtitle="선택 장소와 숙소 기준으로 동선·식당 배치를 최적화합니다."
                task={runGeneratingTask}
                title={
                  generatingSource === "odre-note"
                    ? "오드레 노트 기준으로\n일정을 만들고 있어요"
                    : "일정 생성 중입니다"
                }
              />
            </div>
          ) : null}
          {step === "trip-result" ? (
            <div className={cn("trip-step-screen trip-step-screen--pinned-map", tripSlideClass)}>
              <TripFlowChrome current={4} onBack={tripGoBack} onCancel={cancelTripFlow} />
              <ItineraryScreen
                key={displayItinerary?.id ?? "no-itinerary"}
                aiProvider={lastItineraryProvider}
                claimedLocalOfferIds={claimedLocalOfferIds}
                days={getItineraryDays(displayItinerary, preferences.duration)}
                duration={preferences.duration}
                itinerary={displayItinerary}
                isPreviewItinerary={Boolean(pendingItinerary)}
                onClaimLocalOffer={claimLocalOffer}
                confirmedPlaceIds={confirmedPlaceIds}
                onViewLocalCoupons={() => setStep("care")}
                preferences={preferences}
                reservations={reservations}
                savedItineraries={savedItineraries}
                saveMessage={saveMessage}
                itineraryReservationCount={
                  pendingItinerary ? previewReservationCount : itineraryReservationCount
                }
                pendingReservationCount={
                  pendingItinerary ? previewPendingReservationCount : pendingReservationCount
                }
                onAddToTrip={handleCommitItineraryToTrip}
                activeSavedItineraryId={activeSavedItineraryId}
                detailUnlocked={itineraryDetailUnlocked}
                onDeleteSavedItinerary={handleDeleteSavedItinerary}
                onLoadItinerary={handleLoadItinerary}
                onOpenItineraryPicker={openItineraryPicker}
                onOpenReservation={openItineraryAdmission}
                onRegenerate={() => {
                  resetTripFlowHistory();
                  moveTripStep("trip-preferences", 1);
                }}
                onSaveEdit={handleItineraryEdit}
                engineContext={engineContext}
                backgroundEnriching={itineraryBackgroundEnriching}
              />
            </div>
          ) : null}
          {step === "nature-road-plan" && natureRoadPlan ? (
            <NatureRoadDriveWizard
              onBack={() => {
                setNatureRoadPlan(null);
                setStep("home");
              }}
              onChange={updatePreference}
              onComplete={completeNatureRoadWizard}
              preferences={localPreferences}
              segment={natureRoadPlan.segment}
              zoneId={natureRoadPlan.zoneId}
            />
          ) : null}
          {step === "generating" ? (
            <div className="trip-step-screen">
              <TripFlowChrome
                onBack={goBack}
                onCancel={() => {
                  setGeneratingRunKey((key) => key + 1);
                  setPendingItinerary(null);
                  setStep("home");
                }}
              />
              <GeneratingScreen
              runKey={generatingRunKey}
              onDone={finishGenerating}
              subtitle={
                generatingSource === "nature-road"
                  ? "네이처로드 코스 순서와 차량 이동·혼잡을 반영합니다."
                  : "AI가 예약·이동·혼잡·로컬 상권을 반영합니다."
              }
              task={runGeneratingTask}
              title={
                generatingSource === "nature-road"
                  ? "네이처로드 드라이브\n실행 일정을 준비중입니다."
                  : "실행 스타일에 맞는\n맞춤 일정을 준비중입니다."
              }
            />
            </div>
          ) : null}
          {step === "itinerary" ? (
            <div className="flex min-h-0 flex-1 flex-col">
              <ItineraryScreen
              key={displayItinerary?.id ?? "no-itinerary"}
              aiProvider={lastItineraryProvider}
              claimedLocalOfferIds={claimedLocalOfferIds}
              days={getItineraryDays(displayItinerary, preferences.duration)}
              duration={preferences.duration}
              itinerary={displayItinerary}
              isPreviewItinerary={Boolean(pendingItinerary)}
              onClaimLocalOffer={claimLocalOffer}
              confirmedPlaceIds={confirmedPlaceIds}
              onViewLocalCoupons={() => setStep("care")}
              preferences={preferences}
              reservations={reservations}
              savedItineraries={savedItineraries}
              saveMessage={saveMessage}
              itineraryReservationCount={
                pendingItinerary ? previewReservationCount : itineraryReservationCount
              }
              pendingReservationCount={
                pendingItinerary ? previewPendingReservationCount : pendingReservationCount
              }
              onAddToTrip={handleCommitItineraryToTrip}
              activeSavedItineraryId={activeSavedItineraryId}
              detailUnlocked={itineraryDetailUnlocked}
              onDeleteSavedItinerary={handleDeleteSavedItinerary}
              onLoadItinerary={handleLoadItinerary}
              onOpenItineraryPicker={openItineraryPicker}
              onOpenReservation={openItineraryAdmission}
              onRegenerate={() => enterTripPreferencesFlow()}
              onSaveEdit={handleItineraryEdit}
              engineContext={engineContext}
              backgroundEnriching={itineraryBackgroundEnriching}
            />
            </div>
          ) : null}
          {step === "reservation" ? (
            <ReservationHubScreen
              attractionPlaces={hubReservationPlaces}
              confirmMessage={confirmMessage}
              hubBookings={hubBookings}
              initialCategory={reservationHubCategory}
              initialSheetPlaceId={reservationSheetPlaceId}
              itinerary={committedItinerary}
              zoneId={committedItinerary?.region ?? preferences.zoneId}
              onOpenItineraryAdmission={
                hasCommittedItinerary && pendingReservationCount > 0
                  ? openMyReservations
                  : undefined
              }
              pendingItineraryReservations={pendingReservationCount}
              onSheetPlaceClose={() => setReservationSheetPlaceId(null)}
              qrTickets={qrTickets}
              reservations={reservations}
              selectedSlotByPlace={selectedSlotByPlace}
              onConfirmAttraction={handleConfirmHubReservation}
              defaultTravelers={preferences.travelers}
              onConfirmOffer={handleConfirmHubOffer}
              onSelectSlot={selectSlot}
            />
          ) : null}
          {step === "itinerary-reservation" && committedItinerary ? (
            <ItineraryReservationScreen
              confirmMessage={confirmMessage}
              initialSheetPlaceId={reservationFocusPlaceId}
              itinerary={committedItinerary}
              places={itineraryReservationPlaces}
              qrTickets={qrTickets}
              reservations={reservations}
              selectedSlotByPlace={selectedSlotByPlace}
              defaultTravelers={preferences.travelers}
              onBackToItinerary={() => {
                setReservationFocusPlaceId(null);
                setItineraryDetailUnlocked(true);
                setStep("itinerary");
              }}
              onConfirm={handleConfirmItineraryReservation}
              onOpenReservationHub={(category) =>
                openReservationHubFromItinerary(category ?? "stay")
              }
              onSelectSlot={selectSlot}
            />
          ) : null}
          {step === "care" ? (
            <CareScreen
              status={careStatus}
              alerts={careAlerts}
              hubBookings={hubBookings}
              claimedLocalOfferIds={claimedLocalOfferIds}
              tickets={qrTickets}
              itinerary={committedItinerary}
              preferences={preferences}
              reservations={reservations}
              engineContext={engineContext}
              onAlertAction={handleCareAlertAction}
              onCreateItinerary={() => enterTripPreferencesFlow()}
              onOpenItinerary={openItineraryTab}
              onOpenHubReservations={() => openReservationHub("stay")}
              onBookIntercityTransport={() => openReservationHub("transport")}
              onCheckInTicket={checkInQrTicket}
            />
          ) : null}
          </div>

        </div>

        {!hideChrome ? (
          <BottomNav activeItem={getActiveBottomItem()} onNavigate={handleBottomNav} />
        ) : null}

        <PlaceSearchSheet
            onClose={() => {
              setSearchOpen(false);
              setTripPlaceSearchOpen(false);
            }}
            onOpenPlace={openPlaceDetail}
            open={searchOpen || tripPlaceSearchOpen}
            preferences={preferences}
            selectionMode={step === "trip-places" || step === "trip-dining" || tripPlaceSearchOpen}
            onPickInterested={(placeId) => {
              if (step === "trip-dining") {
                setSelectedDiningPlaceIds((current) =>
                  current.includes(placeId) ? current : [...current, placeId],
                );
                return;
              }
              setPlaceSelection(placeId, { intent: "interested" });
            }}
            onPickMustGo={(placeId) => {
              if (step === "trip-dining") {
                setSelectedDiningPlaceIds((current) =>
                  current.includes(placeId) ? current : [...current, placeId],
                );
                return;
              }
              setPlaceSelection(placeId, { intent: "must_go" });
            }}
            selectedPlaceIds={step === "trip-dining" ? selectedDiningPlaceIds : Object.keys(selectedPlaceState)}
            selectedIntents={
              step === "trip-dining"
                ? (Object.fromEntries(
                    selectedDiningPlaceIds.map((id) => [id, "interested"]),
                  ) as Record<string, SelectionIntent>)
                : selectedIntentsMap
            }
          />
          <AiAssistantSheet
            onClose={() => setAssistantOpen(false)}
            onCreateItinerary={startItineraryFromAiChat}
            onOpenCare={() => setStep("care")}
            onOpenItinerary={openItineraryTab}
            onOpenPlace={openPlaceDetail}
            onOpenReservationHub={(category) => openReservationHub(category ?? "attraction")}
            onOpenReservationPlace={(placeId) => openReservationHub("attraction", placeId)}
            onOpenPreferenceWizard={() => enterTripPreferencesFlow()}
            open={assistantOpen}
            preferences={preferences}
            tripContext={{
              itinerary: displayItinerary,
              reservations,
              hubBookings,
              claimedLocalOfferIds,
              savedPlaceIds,
              recentPlaceIds,
              itineraryAnchorPlaceId,
              behaviorProfile,
            }}
          />
          <LodgingDepotPickerSheet
            nightIndex={lodgingPickerNight ?? 1}
            zoneId={preferences.zoneId}
            onClose={() => setLodgingPickerNight(null)}
            onSelect={(depot) => {
              if (lodgingPickerNight != null) {
                setLodgingForNight(lodgingPickerNight, depot);
              }
            }}
            open={lodgingPickerNight != null}
          />
          <GangwonPassSheet
            gangwonPass={gangwonPass}
            onClose={() => setGangwonPassOpen(false)}
            onOpenReservation={({ placeId, hubCategory }) => {
              setGangwonPassOpen(false);
              openReservationHub(hubCategory ?? "attraction", placeId ?? null);
            }}
            onPurchase={handlePurchaseGangwonPass}
            onRedeemBenefit={handleRedeemPassBenefit}
            open={gangwonPassOpen}
            preferences={preferences}
          />

          <MyMenuSheet
            careAlertCount={careAlertCount}
            claimedLocalOfferIds={claimedLocalOfferIds}
            hasItinerary={hasCommittedItinerary}
            tripExecutionPhase={tripExecutionPhase}
            onAiPlan={() => enterTripPreferencesFlow()}
            onClose={() => setMenuOpen(false)}
            onOpenCare={() => setStep("care")}
            onOpenItinerary={openItineraryTab}
            onOpenPlace={openPlaceDetail}
            onOpenPlaces={() => {
              setPlacesScreenMode("category");
              setStep("places");
            }}
            onOpenReservation={openMyReservations}
            onOpenSavedPlaces={() => {
              setPlacesScreenMode("saved");
              setStep("places");
            }}
            open={menuOpen}
            pendingReservationCount={pendingReservationCount}
            reservationCount={totalReservationCount}
            savedItinerariesCount={savedItineraries.length}
            savedPlacesCount={savedPlaceIds.length}
          />
          {detailPlaceId && detailPlace ? (
            <div className="absolute inset-0 z-40 overflow-y-auto bg-ivory">
              <PlaceDetailScreen
                key={detailPlace.id}
                currentUserId={authUser?.id}
                hasItinerary={Boolean(displayItinerary)}
                onAddToSchedule={handleAddPlaceToSchedule}
                onBack={closePlaceDetail}
                onOpenPlace={openPlaceDetail}
                onOpenReservation={(placeId) => openReservationHub("attraction", placeId)}
                onPlanAroundPlace={startPlanFromPlace}
                place={detailPlace}
              />
            </div>
          ) : detailPlaceId ? (
            <div className="absolute inset-0 z-40 flex flex-col bg-ivory px-5 pt-6">
              <button
                className="flex size-10 items-center justify-center rounded-full bg-paper text-ink shadow-sm"
                onClick={closePlaceDetail}
                type="button"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <p className="mt-10 text-center text-sm text-stone">장소 정보를 불러오는 중…</p>
            </div>
          ) : null}
      </MobileFrame>
    </AppShell>
  );
}

function HomeScreen({
  engineContext,
  preferences,
  regionStampIds,
  regionStampCollectedAt,
  claimedStampMilestones,
  gangwonPass,
  onClaimStampMilestone,
  toastMessage,
  onOpenPlace,
  onShowIntro,
  onPlanNatureRoad,
  onOpenGangwonPass,
  onZoneChange,
  onZonePreviewOnly,
  onStartTripFlow,
  catalogRevision,
}: {
  engineContext: ReturnType<typeof buildEngineContextFromTripStore>;
  preferences: TripPreferences;
  catalogRevision: number;
  regionStampIds: TravelZoneId[];
  regionStampCollectedAt: Partial<Record<TravelZoneId, string>>;
  claimedStampMilestones: number[];
  gangwonPass?: ActiveGangwonPass;
  onClaimStampMilestone: (milestoneCount: number) => void;
  toastMessage: string;
  onOpenPlace: (placeId: string) => void;
  onShowIntro: () => void;
  onPlanNatureRoad: (zoneId: TravelZoneId, segment: FeaturedNatureRoadSegment) => void;
  onOpenGangwonPass: () => void;
  onZoneChange: (zoneId: TravelZoneId) => void;
  onZonePreviewOnly: (zoneLabel: string) => void;
  onStartTripFlow: () => void;
}) {
  const activeZoneId = preferences.zoneId;
  const [browseSection, setBrowseSection] = useState<{
    title: string;
    places: Place[];
  } | null>(null);
  const [saveHint, setSaveHint] = useState("");

  const [zoneBundle, setZoneBundle] = useState<ZoneHomeBundle>(() =>
    getZoneHomeBundle(activeZoneId, engineContext),
  );
  useEffect(() => {
    let cancelled = false;
    void getZoneHomeBundleAsync(activeZoneId, engineContext).then((bundle) => {
      if (!cancelled) setZoneBundle(bundle);
    });
    return () => {
      cancelled = true;
    };
  }, [activeZoneId, engineContext, catalogRevision]);

  function handleZoneSelect(zoneId: TravelZoneId) {
    onZoneChange(zoneId);
    const zone = getTravelZone(zoneId);
    if (zone && !isTravelZoneAvailable(zoneId)) {
      onZonePreviewOnly(zone.label);
    }
  }

  function showSaveHint() {
    setSaveHint("장소 탭에서 확인할 수 있어요.");
    window.setTimeout(() => setSaveHint(""), 2000);
  }

  return (
    <main className="space-y-7 pb-20 pt-2">
      <section className="px-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pine">
            강원 특화 여행 OS
          </p>
          <p className="mt-2 text-lg font-semibold leading-snug text-ink">
            강원의 길과 로컬을 연결합니다
          </p>
        </div>
      </section>

      {toastMessage ? (
        <p className="px-5 text-center text-sm font-medium text-pine">{toastMessage}</p>
      ) : null}

      <section className="px-5 pb-1">
        <TravelZonePicker selected={activeZoneId} onSelect={handleZoneSelect} />
        {!zoneBundle.executable ? (
          <p className="mt-3 rounded-xl border border-pine/10 bg-paper px-3 py-2.5 text-xs leading-5 text-stone">
            {isFullCatalogLoaded() ? (
              <>
                {zoneBundle.zone.label} 권역 카탈로그가 아직 부족합니다. 다른 권역을 선택하거나{" "}
                <span className="font-semibold text-pine">npm run refresh:tour-places</span>로
                카탈로그를 갱신해 주세요.
              </>
            ) : (
              <>
                {zoneBundle.zone.label} 권역 데이터를 불러오는 중입니다. 잠시만 기다려 주세요.
              </>
            )}
          </p>
        ) : null}
      </section>

      <div
        className="px-5 pt-5"
        role="region"
        aria-label={`${zoneBundle.zone.label} 권역 콘텐츠`}
      >
        <div className="border-t border-pine/12 pt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
            {zoneBundle.zone.label}
          </p>
          <p className="mt-1.5 text-base font-semibold leading-snug text-ink">
            이 권역에서 이어지는 여행
          </p>
          <p className="mt-1 text-xs leading-5 text-stone">
            네이처로드, 강원패스, 스탬프와 가볼 곳이 선택한 권역에 맞춰 표시됩니다
          </p>
        </div>
      </div>

      <section className="space-y-3 px-5">
        {zoneBundle.natureRoad ? (
          <NatureRoadSegmentCard
            segment={zoneBundle.natureRoad}
            onClick={() => {
              if (!zoneBundle.natureRoad?.executablePlan) {
                onZonePreviewOnly(zoneBundle.zone.label);
                return;
              }
              onPlanNatureRoad(activeZoneId, zoneBundle.natureRoad);
            }}
          />
        ) : null}
        <GangwonPassTeaserCard
          owned={isPassActive(gangwonPass, preferences.travelDate)}
          pass={zoneBundle.passTeaser}
          passNumber={gangwonPass?.passNumber}
          onClick={onOpenGangwonPass}
        />
        <RegionStampProgress
          activeZoneId={activeZoneId}
          claimedMilestoneCounts={claimedStampMilestones}
          collectedAtByZone={regionStampCollectedAt}
          onClaimMilestone={onClaimStampMilestone}
          stampedZoneIds={regionStampIds}
        />
      </section>

      <section className="px-5">
        <p className="text-lg font-semibold leading-snug text-ink">{zoneBundle.exploreTitle}</p>
        <p className="mt-1 text-sm text-stone">{zoneBundle.exploreSubtitle}</p>
      </section>

      {saveHint ? (
        <p className="px-5 text-center text-sm font-medium text-pine">{saveHint}</p>
      ) : null}

      {zoneBundle.carouselSections.length === 0 ? (
        <section className="px-5">
          <TravelCardShell>
            <div className="p-5 text-sm leading-6 text-stone">
              {zoneBundle.zone.label} 권역 장소 데이터를 연결 중입니다. Phase 2에서 가볼 곳
              캐러셀이 채워집니다.
            </div>
          </TravelCardShell>
        </section>
      ) : null}

      {zoneBundle.carouselSections.map((section) => (
        <PlaceCarousel
          key={section.id}
          onOpenPlace={(placeId) => {
            setBrowseSection(null);
            onOpenPlace(placeId);
          }}
          onToggleSave={showSaveHint}
          onViewMore={() =>
            setBrowseSection({ title: section.title, places: section.browsePlaces })
          }
          places={section.places}
          title={section.title}
        />
      ))}

      <section className="space-y-4 px-5">
        <SectionHeader
          title="단계형 AI 여행 만들기"
          description="조건 입력부터 숙소 지정까지 단계별로 선택하고, 마지막에 AI가 일정을 최적화합니다."
        />
        <PremiumButton className="w-full" onClick={onStartTripFlow}>
          여행 정보 입력부터 시작하기
        </PremiumButton>
      </section>

      <PlaceBrowseSheet
        onClose={() => setBrowseSection(null)}
        onOpenPlace={(placeId) => {
          setBrowseSection(null);
          onOpenPlace(placeId);
        }}
        onToggleSave={showSaveHint}
        open={Boolean(browseSection)}
        places={browseSection?.places ?? []}
        title={browseSection ? `${zoneBundle.zone.label} ${browseSection.title}` : ""}
        zoneLabel={zoneBundle.zone.label}
      />

      <div className="px-5 pb-4">
        <button
          className="w-full rounded-full border border-pine/12 py-2.5 text-sm font-medium text-pine transition-colors hover:bg-pine/5 active:bg-pine/8"
          onClick={onShowIntro}
          type="button"
        >
          오드래강원을 소개합니다
        </button>
      </div>
    </main>
  );
}

const itineraryProviderLabels: Record<AiProvider, string> = {
  openai: "AI 일정 (OpenAI)",
  gemini: "AI 일정 (Gemini)",
  rules: "일정 엔진",
  "ai+verified": "AI 보강 일정",
};

const ITINERARY_PIN_HIGHLIGHT_MS = 3500;

function ItineraryScreen({
  aiProvider,
  days,
  duration,
  itinerary,
  isPreviewItinerary = false,
  preferences,
  reservations,
  savedItineraries,
  saveMessage,
  itineraryReservationCount,
  pendingReservationCount,
  claimedLocalOfferIds,
  confirmedPlaceIds,
  onClaimLocalOffer,
  onViewLocalCoupons,
  onAddToTrip,
  activeSavedItineraryId,
  detailUnlocked,
  onDeleteSavedItinerary,
  onLoadItinerary,
  onOpenItineraryPicker,
  onOpenReservation,
  onRegenerate,
  onSaveEdit,
  engineContext,
  backgroundEnriching = false,
}: {
  aiProvider: AiProvider | null;
  days: ItineraryDay[];
  duration: TripPreferences["duration"];
  itinerary?: Itinerary;
  isPreviewItinerary?: boolean;
  preferences: TripPreferences;
  reservations: ReturnType<typeof useTripStore.getState>["reservations"];
  savedItineraries: Itinerary[];
  saveMessage: string;
  itineraryReservationCount: number;
  pendingReservationCount: number;
  claimedLocalOfferIds: string[];
  confirmedPlaceIds: string[];
  activeSavedItineraryId: string | null;
  detailUnlocked: boolean;
  onClaimLocalOffer: (offerId: string) => void;
  onViewLocalCoupons: () => void;
  onAddToTrip: () => void;
  onDeleteSavedItinerary: (id: string) => void;
  onLoadItinerary: (itinerary: Itinerary) => void;
  onOpenItineraryPicker: () => void;
  onOpenReservation: () => void;
  onRegenerate: () => void;
  onSaveEdit: (itinerary: Itinerary) => void;
  engineContext: ReturnType<typeof buildEngineContextFromTripStore>;
  backgroundEnriching?: boolean;
}) {
  const [dayFilter, setDayFilter] = useState<ItineraryDayFilter>(() =>
    days.length > 1 ? "all" : (days[0] ?? 1),
  );
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [draftItinerary, setDraftItinerary] = useState<Itinerary | null>(null);
  const [editMessage, setEditMessage] = useState("");
  const [addPlaceOpen, setAddPlaceOpen] = useState(false);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const highlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timelineScrollRef = useRef<HTMLDivElement | null>(null);

  const activeZoneId = preferences.zoneId;
  const zoneLabel =
    travelZoneShortLabels[activeZoneId] ?? mvpRegion.name;
  const zoneHero = resolveZoneHeroMeta(activeZoneId);
  const zoneGradient = getTravelZone(activeZoneId)?.gradient ?? "from-pine-deep via-pine to-mist";
  const itineraryDisplayTitle =
    mode === "edit" ? `${zoneLabel} AI 실행 일정 · 편집 중` : `${zoneLabel} AI 실행 일정`;
  const showDayToggle = days.length > 1;
  const resolvedActiveDay: ItineraryDay =
    dayFilter !== "all" && days.includes(dayFilter) ? dayFilter : (days[0] ?? 1);

  useEffect(() => {
    setSelectedStopId(null);
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
      highlightTimerRef.current = null;
    }
  }, [dayFilter, mode, itinerary?.id]);

  useEffect(
    () => () => {
      if (highlightTimerRef.current) {
        clearTimeout(highlightTimerRef.current);
      }
    },
    [],
  );

  const armStopHighlight = useCallback((stopId: string) => {
    setSelectedStopId(stopId);
    if (highlightTimerRef.current) {
      clearTimeout(highlightTimerRef.current);
    }
    highlightTimerRef.current = setTimeout(() => {
      setSelectedStopId(null);
      highlightTimerRef.current = null;
    }, ITINERARY_PIN_HIGHLIGHT_MS);
  }, []);

  const handleHighlightStop = useCallback(
    (stopId: string) => {
      armStopHighlight(stopId);
    },
    [armStopHighlight],
  );

  const handleMapHighlightStop = useCallback(
    (stopId: string) => {
      armStopHighlight(stopId);
      requestAnimationFrame(() => {
        scrollItineraryStopIntoView(stopId, timelineScrollRef.current);
      });
    },
    [armStopHighlight],
  );

  const displayItineraryForMap = useMemo(() => {
    if (mode === "edit" && draftItinerary) return draftItinerary;
    return itinerary ?? null;
  }, [mode, draftItinerary, itinerary]);

  const mapStops = useMemo(() => {
    if (!displayItineraryForMap) return [];
    if (dayFilter === "all") {
      return [...displayItineraryForMap.stops].sort((a, b) => {
        if (a.day !== b.day) return a.day - b.day;
        return a.order - b.order;
      });
    }
    return displayItineraryForMap.stops
      .filter((stop) => stop.day === resolvedActiveDay)
      .sort((a, b) => a.order - b.order);
  }, [dayFilter, displayItineraryForMap, resolvedActiveDay]);

  const lodgingAnchorsByDay = useMemo(() => {
    if (!displayItineraryForMap) return undefined;
    return resolveLodgingRouteAnchorsByDay(displayItineraryForMap);
  }, [
    displayItineraryForMap?.id,
    displayItineraryForMap?.stops,
    displayItineraryForMap?.lodgingPlan,
    displayItineraryForMap?.dayLodgingLegs,
  ]);

  function exitEditMode() {
    setDraftItinerary(null);
    setAddPlaceOpen(false);
    setMode("view");
  }

  const showItineraryPicker = savedItineraries.length > 0 && !detailUnlocked;

  const isViewingSavedItinerary = Boolean(
    !isPreviewItinerary &&
      itinerary &&
      ((activeSavedItineraryId && itinerary.id === activeSavedItineraryId) ||
        savedItineraries.some((saved) => saved.id === itinerary.id)),
  );

  if (showItineraryPicker) {
    return (
      <main className="space-y-6 px-5 py-6">
        <SectionHeader
          description="불러올 일정을 선택하면 상세 코스·지도·예약 흐름이 표시됩니다."
          title="저장한 일정"
        />
        {saveMessage ? (
          <p className="text-center text-sm font-medium text-pine">{saveMessage}</p>
        ) : null}
        <SavedItineraryList
          activeId={activeSavedItineraryId}
          itineraries={savedItineraries}
          mode="picker"
          onDelete={onDeleteSavedItinerary}
          onLoad={onLoadItinerary}
        />
      </main>
    );
  }

  if (!itinerary) {
    return (
      <main className="space-y-6 px-5 py-6">
        <EmptyPanel
          title="생성된 실행 일정이 없습니다"
          description="홈에서 여행 조건을 입력해 실행 일정을 만들거나, 저장한 일정을 불러오세요."
        />
        <PremiumButton className="w-full" onClick={onRegenerate}>
          내 여행 일정 만들기
        </PremiumButton>
        {savedItineraries.length > 0 ? (
          <PremiumButton className="w-full" variant="ghost" onClick={onOpenItineraryPicker}>
            저장한 일정 불러오기
          </PremiumButton>
        ) : null}
      </main>
    );
  }

  const activeItinerary = itinerary;
  const displayItinerary = displayItineraryForMap ?? activeItinerary;
  const isDirty =
    mode === "edit" && draftItinerary
      ? !itinerariesEqual(draftItinerary, activeItinerary)
      : false;

  function startEdit() {
    if (dayFilter === "all") {
      setDayFilter(days[0] ?? 1);
    }
    setDraftItinerary(cloneItinerary(activeItinerary));
    setEditMessage("");
    setMode("edit");
  }

  function cancelEdit() {
    if (
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("저장하지 않은 변경사항이 사라집니다. 편집을 취소할까요?")
    ) {
      return;
    }
    setEditMessage("");
    exitEditMode();
  }

  function applyDraftStops(stops: Itinerary["stops"]) {
    if (!draftItinerary) return;
    void rebuildItineraryFromStops(stops, draftItinerary, preferences).then(setDraftItinerary);
  }

  function handleRemoveStop(stopId: string) {
    if (!draftItinerary) return;
    const target = draftItinerary.stops.find((stop) => stop.id === stopId);
    if (!target) return;

    const hasReservation = reservations.some((item) => item.placeId === target.placeId);
    if (
      hasReservation &&
      typeof window !== "undefined" &&
      !window.confirm(`${target.placeName} 예약이 해제됩니다. 삭제할까요?`)
    ) {
      return;
    }

    applyDraftStops(removeStop(draftItinerary.stops, stopId));
  }

  function handleSaveEdit() {
    if (!draftItinerary) return;
    onSaveEdit(draftItinerary);
    setEditMessage("변경사항이 저장되었습니다.");
    exitEditMode();
  }

  function handleRegenerate() {
    if (
      isDirty &&
      typeof window !== "undefined" &&
      !window.confirm("저장하지 않은 편집 내용이 있습니다. 조건 수정 화면으로 이동할까요?")
    ) {
      return;
    }
    exitEditMode();
    onRegenerate();
  }

  return (
    <main className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-5 pt-2 pb-3">
          <RoutePreviewCard
            enableMap
            highlightStopId={selectedStopId}
            lodgingAnchorsByDay={lodgingAnchorsByDay}
            onHighlightStop={handleMapHighlightStop}
            stops={mapStops.length > 0 ? mapStops : displayItinerary.stops}
          />
          {preferences.transportation === "public-transit" ? (
            <LocalTransitRoutePanel embedded />
          ) : null}
        </div>

        <div
          className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain pb-8"
          ref={timelineScrollRef}
        >
        <section className="px-5 text-center">
          <ZoneHeroMedia
            className="mx-auto mb-3 size-12 rounded-full border border-pine/10 shadow-sm"
            gradient={zoneGradient}
            heightClassName="size-12"
            imageAlt={`${zoneLabel} 대표 이미지`}
            imageUrl={zoneHero?.imageUrl}
          />
          <h1 className="text-xl font-bold leading-7 text-ink">{itineraryDisplayTitle}</h1>
          {aiProvider && mode === "view" ? (
            <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-pine/8 px-3 py-1 text-xs font-medium text-pine">
              <Sparkles aria-hidden="true" className="size-3.5" />
              {itineraryProviderLabels[aiProvider]}
            </p>
          ) : null}
          <p className="mt-1.5 text-sm leading-6 text-stone">
            {mode === "edit"
              ? "드래그·Day 이동으로 방문 순서를 조정하세요."
              : "ODRÉ가 조건에 맞춰 실행 가능한 일정으로 엮었습니다. 예약·혼잡·QR까지 이어집니다."}
          </p>
        </section>

        {savedItineraries.length > 0 && mode === "view" ? (
          <div className="px-5">
            <PremiumButton className="w-full" onClick={onOpenItineraryPicker} variant="ghost">
              저장한 일정 선택
            </PremiumButton>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 px-5">
          {mode === "view" ? (
            <>
              {!isViewingSavedItinerary ? (
                <PremiumButton className="w-full" onClick={onAddToTrip}>
                  실행 일정으로 담기
                </PremiumButton>
              ) : null}
              {itineraryReservationCount > 0 ? (
                <PremiumButton className="flex-1" onClick={onOpenReservation} variant="ghost">
                  {pendingReservationCount > 0
                    ? `내 예약 (${pendingReservationCount})`
                    : "제휴 예약하기"}
                </PremiumButton>
              ) : null}
              <PremiumButton
                className={itineraryReservationCount > 0 ? "flex-1" : "w-full"}
                onClick={startEdit}
              >
                일정 편집
              </PremiumButton>
            </>
          ) : (
            <>
              <PremiumButton className="flex-1" onClick={handleSaveEdit} variant="ivory">
                저장
              </PremiumButton>
              <PremiumButton className="flex-1" onClick={cancelEdit} variant="ghost">
                취소
              </PremiumButton>
            </>
          )}
        </div>

        {mode === "edit" ? (
          <div className="px-5">
            <PremiumButton className="w-full" onClick={handleRegenerate} variant="ghost">
              조건 수정 후 다시 생성
            </PremiumButton>
          </div>
        ) : null}

        {showDayToggle ? (
          <DayTabs
            active={mode === "view" ? dayFilter : resolvedActiveDay}
            days={days}
            includeAll={mode === "view"}
            onChange={(value) => {
              if (value === "all" && mode === "edit") return;
              setDayFilter(value);
            }}
          />
        ) : null}

        {mode === "edit" && draftItinerary ? (
          <>
            <ItineraryEditTimeline
              day={resolvedActiveDay}
              engineContext={engineContext}
              itineraryDays={days}
              onRemoveStop={handleRemoveStop}
              onSelectStop={handleHighlightStop}
              onStopsChange={applyDraftStops}
              selectedStopId={selectedStopId}
              showDayToggle={showDayToggle}
              stops={draftItinerary.stops}
            />
            <div className="px-5">
              <PremiumButton className="w-full" onClick={() => setAddPlaceOpen(true)} variant="ghost">
                + 장소 추가
              </PremiumButton>
            </div>
            <AddPlaceSheet
              day={resolvedActiveDay}
              onAdd={(place) => {
                void addStopFromPlace(
                  draftItinerary.stops,
                  place,
                  resolvedActiveDay,
                  engineContext,
                ).then(
                  (nextStops) => {
                    applyDraftStops(nextStops);
                    setAddPlaceOpen(false);
                  },
                );
              }}
              onClose={() => setAddPlaceOpen(false)}
              open={addPlaceOpen}
              places={getAvailablePlacesToAdd(draftItinerary.stops, preferences.zoneId)}
            />
          </>
        ) : (
          <>
            <ItineraryFeasibilityPanel
              backgroundEnriching={backgroundEnriching}
              itinerary={displayItinerary}
            />
            <ItineraryResultTimeline
              claimedLocalOfferIds={claimedLocalOfferIds}
              confirmedPlaceIds={confirmedPlaceIds}
              dayFilter={mode === "view" ? dayFilter : resolvedActiveDay}
              items={displayItinerary.timeline}
              onClaimLocalOffer={onClaimLocalOffer}
              onSelectStop={handleHighlightStop}
              onViewLocalCoupons={onViewLocalCoupons}
              selectedStopId={selectedStopId}
              zoneId={preferences.zoneId}
            />
          </>
        )}

        <section className="mx-5 rounded-[var(--radius-card)] border border-pine/10 bg-paper p-4 shadow-[var(--shadow-card)]">
          <div className="flex gap-2">
            <Sparkles aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-pine" />
            <p className="text-sm leading-6 text-stone">{displayItinerary.aiExplanation}</p>
          </div>
          <p className="mt-3 text-xs text-stone">
            총 {displayItinerary.totalDuration} · 이동 {displayItinerary.movingTime} · 예약 필요{" "}
            {displayItinerary.reservationPlaceIds.length}곳
          </p>
        </section>

        {editMessage ? (
          <p className="text-center text-sm font-medium text-pine">{editMessage}</p>
        ) : null}
        {saveMessage && mode === "view" ? (
          <p className="text-center text-sm font-medium text-pine">{saveMessage}</p>
        ) : null}
        </div>
    </main>
  );
}

function SavedItineraryList({
  itineraries,
  onLoad,
  onDelete,
  mode = "picker",
  activeId,
}: {
  itineraries: Itinerary[];
  onLoad: (itinerary: Itinerary) => void;
  onDelete: (id: string) => void;
  mode?: "picker" | "compact";
  activeId?: string | null;
}) {
  const isPicker = mode === "picker";
  const collapsible = !isPicker && itineraries.length > 1;
  const [expanded, setExpanded] = useState(false);
  const isExpanded = isPicker || !collapsible || expanded;
  const latestSaved = itineraries[0];

  return (
    <section className={cn("space-y-3", !isPicker && "px-5")}>
      {collapsible ? (
        <button
          aria-expanded={isExpanded}
          className="flex w-full items-center gap-3 rounded-[var(--radius-card)] border border-pine/10 bg-paper px-4 py-4 text-left shadow-[var(--shadow-card)]"
          onClick={() => setExpanded((current) => !current)}
          type="button"
        >
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
              저장한 일정
            </p>
            <p className="mt-1 text-base font-semibold text-ink">
              {isExpanded ? "목록 접기" : `${itineraries.length}개 저장됨`}
            </p>
            {!isExpanded && latestSaved ? (
              <p className="mt-1 truncate text-sm text-stone">{latestSaved.title}</p>
            ) : null}
          </div>
          <span className="shrink-0 rounded-full bg-pine/10 px-2.5 py-1 text-xs font-semibold text-pine">
            {itineraries.length}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-5 shrink-0 text-stone transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </button>
      ) : null}

      {isExpanded ? (
        <div className="space-y-3">
          {itineraries.map((saved) => {
            const isActive = activeId === saved.id;

            return (
              <div className="relative" key={saved.id}>
                <TravelCardButton
                  className={cn(
                    "w-full text-left",
                    isActive && "ring-2 ring-pine/30",
                  )}
                  onClick={() => onLoad(saved)}
                  selected={isActive}
                >
                  <div className="p-5 pr-14">
                    <p className={travelCardClass.eyebrow}>{saved.totalDuration}</p>
                    <h2 className="mt-2 text-xl font-semibold leading-7 text-ink">
                      {saved.title}
                    </h2>
                    <p className={cn("mt-2", travelCardClass.subtitle)}>{saved.summary}</p>
                    {isPicker ? (
                      <p className="mt-3 text-xs font-semibold text-pine">탭하여 불러오기</p>
                    ) : null}
                  </div>
                </TravelCardButton>
                <button
                  aria-label={`${saved.title} 삭제`}
                  className="absolute right-3 top-3 flex size-10 items-center justify-center rounded-full text-stone transition-colors hover:bg-pine/8 hover:text-ink"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (
                      window.confirm(`"${saved.title}"을(를) 저장 목록에서 삭제할까요?`)
                    ) {
                      onDelete(saved.id);
                    }
                  }}
                  type="button"
                >
                  <Trash2 aria-hidden="true" className="size-4" strokeWidth={1.75} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function CareScreen({
  status,
  alerts,
  tickets,
  itinerary,
  hubBookings,
  claimedLocalOfferIds,
  preferences,
  reservations,
  engineContext,
  onAlertAction,
  onCreateItinerary,
  onOpenItinerary,
  onOpenHubReservations,
  onBookIntercityTransport,
  onCheckInTicket,
}: {
  status: ReturnType<typeof generateTodayCareStatus>;
  alerts: CareAlert[];
  tickets: ReturnType<typeof useTripStore.getState>["qrTickets"];
  itinerary?: Itinerary;
  hubBookings: ReturnType<typeof useTripStore.getState>["hubBookings"];
  claimedLocalOfferIds: string[];
  preferences: TripPreferences;
  reservations: ReturnType<typeof useTripStore.getState>["reservations"];
  engineContext: ReturnType<typeof buildEngineContextFromTripStore>;
  onAlertAction: (alert: CareAlert) => void;
  onCreateItinerary: () => void;
  onOpenItinerary: () => void;
  onOpenHubReservations: () => void;
  onBookIntercityTransport: () => void;
  onCheckInTicket: (ticketId: string) => boolean;
}) {
  const [enhancements, setEnhancements] = useState<CareEnhancements>({
    preferences,
    engineContext,
  });
  const [aiCareAlerts, setAiCareAlerts] = useState<CareAlert[] | null>(null);
  const [ruleAlerts, setRuleAlerts] = useState<CareAlert[]>([]);

  const carePhase: "no-itinerary" | TripExecutionPhase = !itinerary
    ? "no-itinerary"
    : getTripExecutionPhase(preferences.travelDate, preferences.duration);
  const isTripDay = carePhase === "trip-day";

  useEffect(() => {
    if (!isTripDay) {
      return;
    }

    let cancelled = false;

    Promise.all([
      fetchShortWeatherForecast(),
      fetchMidWeatherForecast(),
      preferences.transportation === "public-transit"
        ? fetchTagoArrivals(demoTransitHub.primaryStop.nodeId)
        : Promise.resolve([]),
    ]).then(([weatherShort, weatherMid, transitArrivals]) => {
      if (cancelled) return;
      setEnhancements({
        preferences,
        engineContext,
        weatherShort,
        weatherMid,
        transitArrivals,
      });
    });

    return () => {
      cancelled = true;
    };
  }, [preferences, engineContext, isTripDay]);

  useEffect(() => {
    if (!itinerary || !isTripDay) {
      setAiCareAlerts(null);
      return;
    }

    let cancelled = false;
    generateAiCareAlerts({
      itinerary,
      preferences,
      reservations,
      hubBookings,
      claimedLocalOfferIds,
    })
      .then((result) => {
        if (!cancelled) setAiCareAlerts(result.alerts);
      })
      .catch(() => {
        if (!cancelled) setAiCareAlerts(null);
      });

    return () => {
      cancelled = true;
    };
  }, [itinerary, preferences, reservations, hubBookings, claimedLocalOfferIds, isTripDay]);

  useEffect(() => {
    if (!isTripDay) {
      setRuleAlerts([]);
      return;
    }

    let cancelled = false;
    void generateDayCareSuggestions(
      itinerary,
      reservations,
      hubBookings,
      claimedLocalOfferIds,
      enhancements,
    ).then((alerts) => {
      if (!cancelled) setRuleAlerts(alerts);
    });
    return () => {
      cancelled = true;
    };
  }, [
    itinerary,
    reservations,
    hubBookings,
    claimedLocalOfferIds,
    enhancements,
    isTripDay,
  ]);

  const displayAlerts = aiCareAlerts?.length ? aiCareAlerts : ruleAlerts;

  const claimedOffers = routeLocalOffers.filter((offer) =>
    claimedLocalOfferIds.includes(offer.id),
  );
  const totalBookings = status.completedReservations + status.hubBookings;
  const showTransit =
    preferences.transportation === "public-transit" || enhancements.transitArrivals?.length;

  const todayRouteStops = useMemo(() => {
    if (!itinerary) return [];
    const activeDay = getActiveTripDayNumber(preferences.travelDate) ?? 1;
    const activeDayStops = itinerary.stops.filter((stop) => stop.day === activeDay);
    return activeDayStops.length > 0 ? activeDayStops : itinerary.stops;
  }, [itinerary, preferences.travelDate]);

  if (carePhase === "no-itinerary") {
    return (
      <main className="space-y-6 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <SectionHeader
          description="일정을 만들면 날씨·이동·QR·대체 코스까지 당일 케어가 연결됩니다."
          eyebrow="Day-of Care"
          title="당일 케어"
        />
        <TravelCardShell>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-stone">
              여행 일정이 없어도 괜찮아요. 장소를 둘러보거나 맞춤 일정을 만든 뒤, 여행 당일에 이
              화면에서 실행 안내를 받을 수 있습니다.
            </p>
            <PremiumButton className="w-full" onClick={onCreateItinerary}>
              맞춤 일정 만들기
            </PremiumButton>
          </div>
        </TravelCardShell>
      </main>
    );
  }

  if (carePhase === "before-trip") {
    const tripEndDate = getTripEndDateIso(preferences.travelDate, preferences.duration);
    return (
      <main className="space-y-6 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <SectionHeader
          description="여행 당일에 날씨·이동·QR·대체 코스 안내가 이 화면에서 열립니다."
          eyebrow="Trip Care"
          title="여행 준비"
        />
        <TravelCardShell>
          <div className="space-y-4 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
              다가오는 일정
            </p>
            <p className="text-sm leading-6 text-stone">
              {preferences.travelDate}
              {tripEndDate !== preferences.travelDate.slice(0, 10)
                ? ` – ${tripEndDate}`
                : ""}{" "}
              · {getDurationLabel(preferences.duration)} · 예약 {totalBookings}건 · 일정 예약 대기{" "}
              {status.pendingItineraryReservations}건
            </p>
            <p className="text-sm leading-6 text-stone">
              출발 전에는 일정과 예약만 정리해 두시면 됩니다. 당일 케어는 여행 첫날부터 자동으로
              연결됩니다.
            </p>
            <div className="flex flex-col gap-2">
              <PremiumButton className="w-full" onClick={onOpenItinerary}>
                일정 확인
              </PremiumButton>
              <PremiumButton className="w-full" onClick={onOpenHubReservations} variant="ghost">
                예약 보기
              </PremiumButton>
            </div>
          </div>
        </TravelCardShell>
      </main>
    );
  }

  if (carePhase === "after-trip") {
    return (
      <main className="space-y-6 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
        <SectionHeader
          description="저장된 일정과 예약 내역은 계속 확인할 수 있습니다."
          eyebrow="Trip Care"
          title="여행이 끝났어요"
        />
        <TravelCardShell>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-stone">
              {preferences.travelDate}에 시작한 {getDurationLabel(preferences.duration)} 일정이
              지났습니다. 다음 강원 여행을 준비할 때 새 일정을 만들어 주세요.
            </p>
            <PremiumButton className="w-full" onClick={onOpenItinerary} variant="ghost">
              지난 일정 보기
            </PremiumButton>
          </div>
        </TravelCardShell>
      </main>
    );
  }

  return (
    <main className="space-y-6 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <TravelCardShell variant="dark">
        <div className="p-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
          Day-of Care
        </p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight">{status.headline}</h1>
        <p className="mt-3 text-sm leading-6 text-mist">{status.nextAction}</p>
        <p className="mt-2 text-xs text-mist/90">
          단기·중기 예보를 함께 보고 일정을 조정하세요.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="확정 예약" value={`${totalBookings}건`} />
          <Metric
            label="일정 예약 대기"
            value={`${status.pendingItineraryReservations}건`}
            light
          />
        </div>
        </div>
      </TravelCardShell>

      <PremiumButton className="w-full" onClick={onOpenItinerary} variant="ghost">
        실행 일정 보기
      </PremiumButton>

      <CareWeatherPanel
        enabled
        regionLabel={travelZoneShortLabels[preferences.zoneId] ?? mvpRegion.name}
      />
      {showTransit ? (
        <CareTransitPanel onBookIntercityTransport={onBookIntercityTransport} />
      ) : null}

      <CareAlertList alerts={displayAlerts} onAction={onAlertAction} />

      {claimedOffers.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="경로 쿠폰 보관함" />
          {claimedOffers.map((offer) => (
            <TravelCardShell key={offer.id}>
              <div className="p-4">
                <p className="text-sm font-semibold text-ink">{offer.name}</p>
                <p className="mt-1 text-sm text-stone">{offer.couponLabel}</p>
                <p className="mt-1 text-xs text-pine">{offer.routeNote}</p>
              </div>
            </TravelCardShell>
          ))}
        </section>
      ) : null}

      {hubBookings.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="숙소·교통 예약" />
          {hubBookings.map((booking) => (
            <TravelCardButton key={booking.id} onClick={onOpenHubReservations}>
              <div className="p-4 text-left">
                <p className="text-sm font-semibold text-ink">{booking.title}</p>
                <p className="mt-1 text-xs text-stone">{booking.detailSummary}</p>
                <p className="mt-2 text-xs font-medium text-pine">
                  {booking.bookingNumber} · {booking.payment.method}
                </p>
              </div>
            </TravelCardButton>
          ))}
        </section>
      ) : null}

      {tickets.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader title="입장 QR" />
          {tickets.map((ticket) => (
            <QRTicketCard
              key={ticket.id}
              onCheckIn={onCheckInTicket}
              ticket={ticket}
            />
          ))}
        </section>
      ) : null}

      {itinerary && todayRouteStops.length > 0 ? (
        <section className="space-y-3">
          <SectionHeader
            description="Kakao Maps로 오늘 방문 순서와 이동 동선을 확인합니다."
            title="오늘 경로"
          />
          <RoutePreviewCard enableMap stops={todayRouteStops} />
          {preferences.transportation === "public-transit" ? (
            <LocalTransitRoutePanel embedded />
          ) : null}
        </section>
      ) : null}
    </main>
  );
}

function Metric({
  label,
  value,
  light = false,
}: {
  label: string;
  value: string;
  light?: boolean;
}) {
  return (
    <div className={cn("rounded-2xl p-4", light ? "bg-ivory/10" : "bg-ivory/10")}>
      <div className="flex items-center gap-2 text-mist">
        <Clock aria-hidden="true" className="size-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <TravelCardShell className="text-center">
      <div className="p-6">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className={cn("mt-2", travelCardClass.subtitle)}>{description}</p>
      <ChevronRight aria-hidden="true" className="mx-auto mt-5 size-5 text-pine" />
      </div>
    </TravelCardShell>
  );
}

function TripFlowChrome({
  current,
  onBack,
  onCancel,
  backLabel = "뒤로",
}: {
  current?: 1 | 2 | 3 | 4;
  onBack?: () => void;
  onCancel: () => void;
  backLabel?: string;
}) {
  return (
    <div className="sticky top-0 z-10 bg-ivory/95 backdrop-blur">
      <div className="flex items-center justify-between px-3 pb-1 pt-2">
        {onBack ? (
          <button
            className="flex items-center gap-0.5 rounded-full px-2 py-1.5 text-sm font-medium text-pine"
            onClick={onBack}
            type="button"
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
            {backLabel}
          </button>
        ) : (
          <span aria-hidden="true" className="w-16" />
        )}
        <button
          className="rounded-full px-3 py-1.5 text-sm text-stone"
          onClick={onCancel}
          type="button"
        >
          취소
        </button>
      </div>
      {current ? <TripFlowHeader current={current} compact /> : null}
    </div>
  );
}

function TripFlowHeader({ current, compact }: { current: 1 | 2 | 3 | 4; compact?: boolean }) {
  const steps = ["머물 곳", "가고 싶은 곳", "먹을 곳", "일정 완성"] as const;
  return (
    <div className={cn(compact ? "px-5 pb-3" : "sticky top-0 z-10 bg-ivory/95 px-5 pb-3 pt-2 backdrop-blur")}>
      <div className="grid grid-cols-4 gap-1">
        {steps.map((label, index) => {
          const stepNumber = (index + 1) as 1 | 2 | 3 | 4;
          const active = stepNumber <= current;
          return (
            <div className="space-y-1 text-center" key={label}>
              <div className={cn("h-1 rounded-full", active ? "bg-pine" : "bg-pine/15")} />
              <p className={cn("text-[11px]", active ? "font-semibold text-pine" : "text-stone")}>
                {label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
