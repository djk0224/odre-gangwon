"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultCareAlerts, defaultPreferences } from "@/data/mockTravelData";
import { generateDayCareSuggestions, type CareEnhancements } from "@/services/careService";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import {
  appendBehaviorEvent,
  buildBehaviorProfile,
  createBehaviorEvent,
  emptyBehaviorProfile,
} from "@/services/engines/behaviorLogEngine";
import { refreshClientItineraryFeasibility } from "@/lib/executionKernel/verifyItinerary";
import { buildItineraryTimeline, repairItinerary } from "@/services/itineraryRepair";
import { confirmReservation } from "@/services/reservationService";
import type { HubReservationBooking, ReservationOffer } from "@/types/reservationHub";
import {
  enrichPreferencesFromRegionalContext,
  migratePersistedPreferences,
} from "@/lib/regionalPreferences";
import type {
  BehaviorEvent,
  BehaviorEventType,
  BehaviorProfile,
  BehaviorTabId,
} from "@/types/behavior";
import {
  earnRegionStampOnReservation,
  resolveStampZoneFromHubOffer,
  resolveStampZoneFromPlaceId,
} from "@/lib/regionStamp";
import { applyCheckInToTicket } from "@/lib/tripExecutionReservation";
import {
  applySameLodgingToAllNights,
  createLodgingPlanForDuration,
  depotFromOffer,
  emptyLodgingPlan,
} from "@/lib/tripLodgingPlan";
import { issueGangwonPass } from "@/services/gangwonPassService";
import { getPassBenefit } from "@/data/gangwonPassCatalog";
import { stampMilestones } from "@/data/mockRegionalFraming";
import type { ActiveGangwonPass } from "@/types/gangwonPass";
import type {
  CareAlert,
  Itinerary,
  ItineraryDay,
  QRTicket,
  ReservationRecord,
  ReservationSlot,
  SelectionIntent,
  SelectionState,
  TravelZoneId,
  TripLodgingDepot,
  TripLodgingPlan,
  TripPreferences,
} from "@/types/travel";
import type { OdreNotePlanContext } from "@/lib/odreNotePlanBridge";
import { isDemoUserLoggedIn } from "@/lib/demoAuthGate";

function withClientFeasibility(
  itinerary: Itinerary | undefined,
  preferences: TripPreferences,
  reservations: ReservationRecord[],
  qrTickets: QRTicket[],
): Itinerary | undefined {
  if (!itinerary) return undefined;
  return refreshClientItineraryFeasibility(itinerary, preferences, {
    reservations,
    qrTickets,
  });
}

interface TripState {
  preferences: TripPreferences;
  itinerary?: Itinerary;
  /** '실행 일정으로 담기' 또는 저장 일정 불러오기 후에만 true */
  activeItineraryCommitted: boolean;
  savedItineraries: Itinerary[];
  reservations: ReservationRecord[];
  qrTickets: QRTicket[];
  careAlerts: CareAlert[];
  selectedSlotByPlace: Record<string, string>;
  savedPlaceIds: string[];
  recentPlaceIds: string[];
  behaviorEvents: BehaviorEvent[];
  behaviorProfile: BehaviorProfile;
  sessionId: string;
  hubBookings: HubReservationBooking[];
  regionStampIds: TravelZoneId[];
  regionStampCollectedAt: Partial<Record<TravelZoneId, string>>;
  claimedStampMilestones: number[];
  gangwonPass?: ActiveGangwonPass;
  claimedLocalOfferIds: string[];
  /** 다음 일정 생성 시 첫 stop으로 고정할 장소 */
  itineraryAnchorPlaceId: string | null;
  lodgingPlan: TripLodgingPlan;
  useLodgingBasedRoutes: boolean;
  selectedPlaceState: Record<
    string,
    {
      intent: SelectionIntent;
      state: SelectionState;
      lockedDay?: ItineraryDay;
      lockedOrder?: number;
      lockedTime?: string;
      updatedAt: string;
    }
  >;
  /** 오드레 노트 → 일정 플로우 (persist 제외, 세션 전용) */
  odreNotePlanContext: OdreNotePlanContext | null;
  setItineraryAnchorPlace: (placeId: string | null) => void;
  setLodgingPlan: (plan: TripLodgingPlan) => void;
  setUseLodgingBasedRoutes: (enabled: boolean) => void;
  setPlaceSelection: (
    placeId: string,
    input: {
      intent: SelectionIntent;
      state?: SelectionState;
      lockedDay?: ItineraryDay;
      lockedOrder?: number;
      lockedTime?: string;
    },
  ) => void;
  clearPlaceSelection: (placeId: string) => void;
  clearAllPlaceSelections: () => void;
  setOdreNotePlanContext: (context: OdreNotePlanContext | null) => void;
  clearOdreNotePlanContext: () => void;
  setLodgingForNight: (nightIndex: number, depot: TripLodgingDepot | null) => void;
  setDefaultLodgingDepot: (depot: TripLodgingDepot | null) => void;
  applySameLodgingAllNights: (depot: TripLodgingDepot) => void;
  setPreferences: (preferences: TripPreferences) => void;
  collectRegionStamp: (zoneId: TravelZoneId) => boolean;
  claimStampMilestone: (milestoneCount: number) => boolean;
  purchaseGangwonPass: (planId: string, paymentMethod: string) => boolean;
  redeemGangwonPassBenefit: (benefitId: string) => boolean;
  claimLocalOffer: (offerId: string) => void;
  toggleSavedPlace: (placeId: string) => boolean;
  isPlaceSaved: (placeId: string) => boolean;
  clearSavedPlaces: () => void;
  trackRecentPlace: (placeId: string) => void;
  trackBehavior: (
    type: BehaviorEventType,
    payload?: {
      placeId?: string;
      query?: string;
      tab?: BehaviorTabId;
      metadata?: Record<string, string>;
    },
  ) => void;
  setItinerary: (itinerary: Itinerary, options?: { resetReservations?: boolean }) => void;
  clearActiveItinerary: () => void;
  updateItinerary: (itinerary: Itinerary) => void;
  saveCurrentItinerary: () => boolean;
  deleteSavedItinerary: (id: string) => void;
  loadItinerary: (itinerary: Itinerary) => void;
  selectSlot: (placeId: string, slotId: string) => void;
  confirmPlaceReservation: (
    placeId: string,
    payment: { amount: number; method: string },
  ) => string | null;
  checkInQrTicket: (ticketId: string) => boolean;
  confirmHubOffer: (
    offer: ReservationOffer,
    details: {
      detailSummary: string;
      bookingNumber: string;
      payment: { amount: number; method: string };
    },
  ) => boolean;
  refreshCareAlerts: () => void;
  resetTrip: () => void;
}

function careEnhancementsFromState(state: TripState): CareEnhancements {
  return {
    preferences: state.preferences,
    engineContext: buildEngineContextFromTripStore({
      preferences: state.preferences,
      savedPlaceIds: state.savedPlaceIds,
      recentPlaceIds: state.recentPlaceIds,
      itineraryAnchorPlaceId: state.itineraryAnchorPlaceId,
      lodgingPlan: state.lodgingPlan,
      selectedPlaceState: state.selectedPlaceState,
      behaviorProfile: state.behaviorProfile,
      behaviorEvents: state.behaviorEvents,
    }),
  };
}

function scheduleCareAlertsRefresh(
  get: () => TripState,
  set: (partial: Partial<TripState>) => void,
) {
  const state = get();
  void generateDayCareSuggestions(
    state.itinerary,
    state.reservations,
    state.hubBookings ?? [],
    state.claimedLocalOfferIds ?? [],
    careEnhancementsFromState(state),
  ).then((careAlerts) => set({ careAlerts }));
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      activeItineraryCommitted: false,
      savedItineraries: [],
      reservations: [],
      qrTickets: [],
      careAlerts: defaultCareAlerts,
      selectedSlotByPlace: {},
      savedPlaceIds: [],
      recentPlaceIds: [],
      behaviorEvents: [],
      behaviorProfile: emptyBehaviorProfile(),
      sessionId: `sess-${Date.now()}`,
      hubBookings: [],
      regionStampIds: [],
      regionStampCollectedAt: {},
      claimedStampMilestones: [],
      gangwonPass: undefined,
      claimedLocalOfferIds: [],
      itineraryAnchorPlaceId: null,
      lodgingPlan: emptyLodgingPlan(),
      useLodgingBasedRoutes: true,
      selectedPlaceState: {},
      odreNotePlanContext: null,

      setItineraryAnchorPlace: (placeId) => set({ itineraryAnchorPlaceId: placeId }),

      setLodgingPlan: (plan) => set({ lodgingPlan: plan }),

      setUseLodgingBasedRoutes: (enabled) => set({ useLodgingBasedRoutes: enabled }),

      setPlaceSelection: (placeId, input) =>
        set((state) => ({
          selectedPlaceState: {
            ...state.selectedPlaceState,
            [placeId]: {
              intent: input.intent,
              state:
                input.state ??
                (input.intent === "must_go"
                  ? "fixed"
                  : input.intent === "exclude"
                    ? "deferred"
                    : "included"),
              lockedDay: input.lockedDay,
              lockedOrder: input.lockedOrder,
              lockedTime: input.lockedTime,
              updatedAt: new Date().toISOString(),
            },
          },
        })),

      clearPlaceSelection: (placeId) =>
        set((state) => {
          const next = { ...state.selectedPlaceState };
          delete next[placeId];
          return { selectedPlaceState: next };
        }),

      clearAllPlaceSelections: () => set({ selectedPlaceState: {} }),

      setOdreNotePlanContext: (context) => set({ odreNotePlanContext: context }),

      clearOdreNotePlanContext: () => set({ odreNotePlanContext: null }),

      setLodgingForNight: (nightIndex, depot) => {
        const state = get();
        const plan = createLodgingPlanForDuration(state.preferences.duration, state.lodgingPlan);
        if (!depot) {
          set({ lodgingPlan: plan });
          return;
        }
        const nights = plan.nights.map((night) =>
          night.nightIndex === nightIndex ? { ...night, depot } : night,
        );
        set({
          lodgingPlan: {
            mode: "per_night",
            nights,
            defaultDepot: nights.length === 1 ? depot : plan.defaultDepot,
          },
        });
      },

      setDefaultLodgingDepot: (depot) => {
        const state = get();
        if (!depot) {
          set({ lodgingPlan: emptyLodgingPlan() });
          return;
        }
        set({
          lodgingPlan: applySameLodgingToAllNights(
            state.lodgingPlan,
            depot,
            state.preferences.duration,
          ),
        });
      },

      applySameLodgingAllNights: (depot) => {
        const state = get();
        set({
          lodgingPlan: applySameLodgingToAllNights(
            state.lodgingPlan,
            depot,
            state.preferences.duration,
          ),
        });
      },

      setPreferences: (preferences) => {
        const enriched = enrichPreferencesFromRegionalContext(preferences);
        const state = get();
        const zoneChanged = enriched.zoneId !== state.preferences.zoneId;
        set({
          preferences: enriched,
          lodgingPlan: createLodgingPlanForDuration(
            enriched.duration,
            zoneChanged ? emptyLodgingPlan() : state.lodgingPlan,
          ),
        });
      },

      collectRegionStamp: (zoneId) => {
        const state = get();
        if (state.regionStampIds.includes(zoneId)) {
          return false;
        }
        const collectedAt = new Date().toISOString();
        set({
          regionStampIds: [...state.regionStampIds, zoneId],
          regionStampCollectedAt: {
            ...state.regionStampCollectedAt,
            [zoneId]: collectedAt,
          },
        });
        return true;
      },

      claimStampMilestone: (milestoneCount) => {
        const state = get();
        if (state.claimedStampMilestones.includes(milestoneCount)) {
          return false;
        }
        const milestone = stampMilestones.find((item) => item.count === milestoneCount);
        if (!milestone || state.regionStampIds.length < milestoneCount) {
          return false;
        }
        set({
          claimedStampMilestones: [...state.claimedStampMilestones, milestoneCount],
        });
        if (milestoneCount === 3 && !state.claimedLocalOfferIds.includes("local-mukho-roastery")) {
          set({
            claimedLocalOfferIds: [...state.claimedLocalOfferIds, "local-mukho-roastery"],
          });
        }
        return true;
      },

      purchaseGangwonPass: (planId, paymentMethod) => {
        const state = get();
        const pass = issueGangwonPass(planId, state.preferences, paymentMethod);
        if (!pass) return false;
        set({ gangwonPass: pass });
        return true;
      },

      redeemGangwonPassBenefit: (benefitId) => {
        const state = get();
        if (!state.gangwonPass) return false;
        if (state.gangwonPass.redeemedBenefitIds.includes(benefitId)) {
          return false;
        }
        const benefit = getPassBenefit(benefitId);
        if (!benefit) return false;

        if (benefit.localOfferId && !state.claimedLocalOfferIds.includes(benefit.localOfferId)) {
          get().claimLocalOffer(benefit.localOfferId);
        }

        set({
          gangwonPass: {
            ...state.gangwonPass,
            redeemedBenefitIds: [...state.gangwonPass.redeemedBenefitIds, benefitId],
          },
        });
        return true;
      },

      claimLocalOffer: (offerId) => {
        set((state) => {
          if (state.claimedLocalOfferIds.includes(offerId)) {
            return state;
          }
          return { claimedLocalOfferIds: [...state.claimedLocalOfferIds, offerId] };
        });
        scheduleCareAlertsRefresh(get, set);
      },

      toggleSavedPlace: (placeId) => {
        if (!isDemoUserLoggedIn()) return false;
        set((state) => {
          const exists = state.savedPlaceIds.includes(placeId);
          const event = createBehaviorEvent(
            exists ? "place_unsave" : "place_save",
            { placeId },
          );
          const behaviorEvents = appendBehaviorEvent(state.behaviorEvents, event);
          return {
            savedPlaceIds: exists
              ? state.savedPlaceIds.filter((id) => id !== placeId)
              : [...state.savedPlaceIds, placeId],
            behaviorEvents,
            behaviorProfile: buildBehaviorProfile(behaviorEvents),
          };
        });
        return true;
      },

      isPlaceSaved: (placeId) => get().savedPlaceIds.includes(placeId),

      clearSavedPlaces: () => set({ savedPlaceIds: [] }),

      trackRecentPlace: (placeId) =>
        set((state) => ({
          recentPlaceIds: [
            placeId,
            ...state.recentPlaceIds.filter((id) => id !== placeId),
          ].slice(0, 10),
        })),

      trackBehavior: (type, payload) =>
        set((state) => {
          const event = createBehaviorEvent(type, payload);
          const behaviorEvents = appendBehaviorEvent(state.behaviorEvents, event);
          return {
            behaviorEvents,
            behaviorProfile: buildBehaviorProfile(behaviorEvents),
          };
        }),

      setItinerary: (itinerary, options?: { resetReservations?: boolean }) => {
        const state = get();
        const repaired = repairItinerary(itinerary);
        const placeIds = new Set(repaired.stops.map((stop) => stop.placeId));

        const reservations = options?.resetReservations
          ? []
          : state.reservations.filter((item) => placeIds.has(item.placeId));
        const qrTickets = options?.resetReservations
          ? []
          : state.qrTickets.filter((item) => placeIds.has(item.placeId));
        const selectedSlotByPlace = options?.resetReservations
          ? {}
          : Object.fromEntries(
              Object.entries(state.selectedSlotByPlace).filter(([placeId]) =>
                placeIds.has(placeId),
              ),
            );

        const nextItinerary = withClientFeasibility(
          repaired,
          state.preferences,
          reservations,
          qrTickets,
        );
        set({
          itinerary: nextItinerary,
          activeItineraryCommitted: true,
          reservations,
          qrTickets,
          selectedSlotByPlace,
        });
        scheduleCareAlertsRefresh(get, set);
      },

      clearActiveItinerary: () =>
        set({
          itinerary: undefined,
          activeItineraryCommitted: false,
          reservations: [],
          qrTickets: [],
          selectedSlotByPlace: {},
          careAlerts: defaultCareAlerts,
          selectedPlaceState: {},
        }),

      updateItinerary: (itinerary) => {
        const repaired = repairItinerary(itinerary);
        const state = get();
        const placeIds = new Set(repaired.stops.map((stop) => stop.placeId));

        const reservations = state.reservations.filter((item) => placeIds.has(item.placeId));
        const qrTickets = state.qrTickets.filter((item) => placeIds.has(item.placeId));
        const selectedSlotByPlace = Object.fromEntries(
          Object.entries(state.selectedSlotByPlace).filter(([placeId]) => placeIds.has(placeId)),
        );

        const nextItinerary = withClientFeasibility(
          repaired,
          state.preferences,
          reservations,
          qrTickets,
        );
        set({
          itinerary: nextItinerary,
          activeItineraryCommitted: true,
          reservations,
          qrTickets,
          selectedSlotByPlace,
        });
        scheduleCareAlertsRefresh(get, set);
      },

      saveCurrentItinerary: () => {
        const current = get().itinerary;
        if (!current) return false;

        set((state) => {
          const withoutDuplicate = state.savedItineraries.filter((item) => item.id !== current.id);
          return {
            savedItineraries: [{ ...current, id: `${current.id}-saved-${Date.now()}` }, ...withoutDuplicate].slice(
              0,
              8,
            ),
          };
        });

        return true;
      },

      deleteSavedItinerary: (id) =>
        set((state) => ({
          savedItineraries: state.savedItineraries.filter((item) => item.id !== id),
        })),

      loadItinerary: (itinerary) => {
        const repaired = repairItinerary(itinerary);
        set({
          itinerary: repaired,
          activeItineraryCommitted: true,
        });
        scheduleCareAlertsRefresh(get, set);
      },

      selectSlot: (placeId, slotId) =>
        set((state) => ({
          selectedSlotByPlace: { ...state.selectedSlotByPlace, [placeId]: slotId },
        })),

      confirmPlaceReservation: (placeId, payment) => {
        const state = get();
        const slotId = state.selectedSlotByPlace[placeId];
        if (!slotId) return "시간대를 선택한 뒤 다시 시도해 주세요.";

        const result = confirmReservation(
          {
            placeId,
            slotId,
            travelers: state.preferences.travelers,
            payment,
          },
          { existingReservations: state.reservations },
        );

        if (!result.ok) return result.error;

        const reservations = [
          ...state.reservations.filter((item) => item.placeId !== placeId),
          result.reservation,
        ];
        const qrTickets = [
          ...state.qrTickets.filter((item) => item.placeId !== placeId),
          result.ticket,
        ];

        const confirmEvent = createBehaviorEvent("reservation_confirm", { placeId });
        const qrEvent = createBehaviorEvent("qr_issued", { placeId });
        const behaviorEvents = appendBehaviorEvent(
          appendBehaviorEvent(state.behaviorEvents, confirmEvent),
          qrEvent,
        );

        let nextItinerary = state.itinerary;
        if (state.itinerary) {
          const stops = state.itinerary.stops.map((stop) =>
            stop.placeId === placeId
              ? {
                  ...stop,
                  crowdLevel: result.reservation.crowdLevel,
                  expectedWait: result.reservation.expectedWait,
                }
              : stop,
          );
          nextItinerary = {
            ...state.itinerary,
            stops,
            timeline: buildItineraryTimeline(stops, state.preferences),
          };
        }

        const feasibilityItinerary = withClientFeasibility(
          nextItinerary,
          state.preferences,
          reservations,
          qrTickets,
        );

        set({
          itinerary: feasibilityItinerary,
          reservations,
          qrTickets,
          behaviorEvents,
          behaviorProfile: buildBehaviorProfile(behaviorEvents),
        });
        scheduleCareAlertsRefresh(get, set);
        earnRegionStampOnReservation(
          get().collectRegionStamp,
          resolveStampZoneFromPlaceId(placeId),
        );

        return null;
      },

      checkInQrTicket: (ticketId) => {
        const state = get();
        const ticket = state.qrTickets.find((item) => item.id === ticketId);
        if (!ticket) return false;

        const updated = applyCheckInToTicket(ticket);
        if (updated.checkInStatus === ticket.checkInStatus) return false;

        const qrTickets = state.qrTickets.map((item) =>
          item.id === ticketId ? updated : item,
        );

        const reservations = state.reservations.map((reservation) =>
          reservation.id === ticket.reservationId
            ? {
                ...reservation,
                executionStatus: "checked_in" as const,
              }
            : reservation,
        );

        const checkInEvent = createBehaviorEvent("qr_checkin", {
          placeId: ticket.placeId,
        });
        const behaviorEvents = appendBehaviorEvent(state.behaviorEvents, checkInEvent);

        const nextItinerary = withClientFeasibility(
          state.itinerary,
          state.preferences,
          reservations,
          qrTickets,
        );

        set({
          itinerary: nextItinerary,
          qrTickets,
          reservations,
          behaviorEvents,
          behaviorProfile: buildBehaviorProfile(behaviorEvents),
        });
        scheduleCareAlertsRefresh(get, set);
        return true;
      },

      confirmHubOffer: (offer, details) => {
        const state = get();
        const exists = state.hubBookings.some((item) => item.offerId === offer.id);
        if (exists) return false;

        const bookingId = `hub-${offer.id}-${Date.now()}`;
        const hubBookings = [
          {
            id: bookingId,
            category: offer.category,
            offerId: offer.id,
            title: offer.title,
            subtitle: offer.subtitle,
            detailSummary: details.detailSummary,
            bookingNumber: details.bookingNumber,
            payment: {
              amount: details.payment.amount,
              method: details.payment.method,
              paidAt: new Date().toISOString(),
            },
            confirmedAt: new Date().toISOString(),
            coordinates: offer.coordinates,
            address: offer.address ?? offer.description,
          },
          ...state.hubBookings,
        ];

        const updates: Partial<TripState> = { hubBookings };
        if (offer.category === "stay") {
          const depot = depotFromOffer(
            {
              id: offer.id,
              title: offer.title,
              description: offer.description,
              coordinates: offer.coordinates,
              address: offer.address,
            },
            "hub_booking",
          );
          if (depot) {
            depot.hubBookingId = bookingId;
            const stayCount = state.hubBookings.filter((b) => b.category === "stay").length;
            const nightIndex = Math.max(1, stayCount + 1);
            const plan = createLodgingPlanForDuration(
              state.preferences.duration,
              state.lodgingPlan,
            );
            if (plan.nights.length === 0) {
              updates.lodgingPlan = applySameLodgingToAllNights(
                plan,
                depot,
                state.preferences.duration,
              );
            } else {
              const nights = plan.nights.map((night) =>
                night.nightIndex === nightIndex ? { ...night, depot } : night,
              );
              updates.lodgingPlan = { mode: "per_night", nights };
            }
            updates.useLodgingBasedRoutes = true;
          }
        }

        set(updates);
        scheduleCareAlertsRefresh(get, set);
        earnRegionStampOnReservation(
          get().collectRegionStamp,
          resolveStampZoneFromHubOffer(offer, state.preferences),
        );

        return true;
      },

      refreshCareAlerts: () => {
        scheduleCareAlertsRefresh(get, set);
      },

      resetTrip: () =>
        set({
          preferences: defaultPreferences,
          itinerary: undefined,
          activeItineraryCommitted: false,
          reservations: [],
          qrTickets: [],
          selectedSlotByPlace: {},
          hubBookings: [],
          regionStampIds: [],
          regionStampCollectedAt: {},
          claimedStampMilestones: [],
          gangwonPass: undefined,
          claimedLocalOfferIds: [],
          itineraryAnchorPlaceId: null,
          lodgingPlan: emptyLodgingPlan(),
          useLodgingBasedRoutes: true,
          selectedPlaceState: {},
          odreNotePlanContext: null,
          careAlerts: defaultCareAlerts,
        }),
    }),
    {
      name: "odre-trip-store",
      partialize: (state) => ({
        preferences: state.preferences,
        savedItineraries: state.savedItineraries,
        itinerary: state.itinerary,
        activeItineraryCommitted: state.activeItineraryCommitted,
        reservations: state.reservations,
        qrTickets: state.qrTickets,
        selectedSlotByPlace: state.selectedSlotByPlace,
        savedPlaceIds: state.savedPlaceIds,
        recentPlaceIds: state.recentPlaceIds,
        behaviorEvents: state.behaviorEvents,
        behaviorProfile: state.behaviorProfile,
        sessionId: state.sessionId,
        hubBookings: state.hubBookings,
        regionStampIds: state.regionStampIds,
        regionStampCollectedAt: state.regionStampCollectedAt,
        claimedStampMilestones: state.claimedStampMilestones,
        gangwonPass: state.gangwonPass,
        claimedLocalOfferIds: state.claimedLocalOfferIds,
        lodgingPlan: state.lodgingPlan,
        useLodgingBasedRoutes: state.useLodgingBasedRoutes,
        selectedPlaceState: state.selectedPlaceState,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        try {
          state.preferences = migratePersistedPreferences(
            state.preferences as Parameters<typeof migratePersistedPreferences>[0],
          );
        } catch {
          state.preferences = defaultPreferences;
        }
        state.regionStampIds = state.regionStampIds ?? [];
        state.regionStampCollectedAt = state.regionStampCollectedAt ?? {};
        state.claimedStampMilestones = state.claimedStampMilestones ?? [];
        state.claimedLocalOfferIds = state.claimedLocalOfferIds ?? [];
        state.lodgingPlan = state.lodgingPlan ?? emptyLodgingPlan();
        state.useLodgingBasedRoutes = state.useLodgingBasedRoutes ?? true;
        state.selectedPlaceState = state.selectedPlaceState ?? {};
        state.lodgingPlan = createLodgingPlanForDuration(
          state.preferences.duration,
          state.lodgingPlan,
        );
        state.behaviorEvents = state.behaviorEvents ?? [];
        state.behaviorProfile =
          state.behaviorProfile ??
          (state.behaviorEvents.length
            ? buildBehaviorProfile(state.behaviorEvents)
            : emptyBehaviorProfile());
        state.sessionId = state.sessionId ?? `sess-${Date.now()}`;
        if (state.itinerary) {
          state.itinerary = repairItinerary(state.itinerary);
        }
        const hasTripProgress =
          (state.reservations?.length ?? 0) > 0 || (state.qrTickets?.length ?? 0) > 0;
        if (state.itinerary && state.activeItineraryCommitted !== true) {
          if (hasTripProgress) {
            state.activeItineraryCommitted = true;
          } else {
            state.itinerary = undefined;
            state.reservations = [];
            state.qrTickets = [];
            state.selectedSlotByPlace = {};
          }
        }
        state.activeItineraryCommitted = state.activeItineraryCommitted ?? false;
        state.hubBookings = (state.hubBookings ?? []).map((booking) => ({
          ...booking,
          detailSummary: booking.detailSummary ?? booking.subtitle,
          bookingNumber: booking.bookingNumber ?? `ODRE-${booking.category.toUpperCase()}`,
          payment: booking.payment ?? {
            amount: 0,
            method: "카드",
            paidAt: booking.confirmedAt,
          },
        }));
        state.reservations = (state.reservations ?? []).map((reservation) => ({
          ...reservation,
          payment: reservation.payment ?? {
            amount: 0,
            method: "카드",
            paidAt: reservation.confirmedAt,
          },
        }));
        state.careAlerts = defaultCareAlerts;
        void generateDayCareSuggestions(
          state.itinerary,
          state.reservations,
          state.hubBookings ?? [],
          state.claimedLocalOfferIds ?? [],
          careEnhancementsFromState(state as TripState),
        ).then((careAlerts) => {
          state.careAlerts = careAlerts;
        });
      },
    },
  ),
);

export function getSelectedSlot(
  placeId: string,
  slots: ReservationSlot[],
  selectedSlotByPlace: Record<string, string>,
): ReservationSlot | undefined {
  const slotId = selectedSlotByPlace[placeId];
  if (!slotId) return undefined;
  return slots.find((slot) => slot.id === slotId);
}
