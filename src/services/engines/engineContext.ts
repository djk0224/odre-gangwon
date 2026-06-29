import {
  buildBehaviorProfile,
  emptyBehaviorProfile,
} from "@/services/engines/behaviorLogEngine";
import type { BehaviorEvent, BehaviorProfile } from "@/types/behavior";
import type {
  SelectionIntent,
  SelectionState,
  TripLodgingPlan,
  TripPreferences,
  TravelZoneId,
} from "@/types/travel";

export interface EngineContext {
  preferences: TripPreferences;
  zoneId: TravelZoneId;
  travelDate: string;
  behaviorProfile: BehaviorProfile;
  savedPlaceIds: string[];
  recentPlaceIds: string[];
  anchorPlaceId?: string | null;
  /** quick = Tour GW 혼잡 신호 생략 (일정 fast 경로) */
  crowdMode?: "quick" | "live";
  lodgingPlan?: TripLodgingPlan;
  selectedPlaceState?: Record<
    string,
    {
      intent: SelectionIntent;
      state: SelectionState;
      lockedDay?: 1 | 2 | 3 | 4;
      lockedOrder?: number;
      lockedTime?: string;
      updatedAt: string;
    }
  >;
}

export interface TripStoreEngineSlice {
  preferences: TripPreferences;
  savedPlaceIds: string[];
  recentPlaceIds: string[];
  itineraryAnchorPlaceId: string | null;
  lodgingPlan?: TripLodgingPlan;
  selectedPlaceState?: EngineContext["selectedPlaceState"];
  behaviorProfile?: BehaviorProfile;
}

export function buildEngineContextFromTripStore(state: {
  preferences: TripPreferences;
  savedPlaceIds: string[];
  recentPlaceIds: string[];
  itineraryAnchorPlaceId: string | null;
  lodgingPlan?: TripLodgingPlan;
  selectedPlaceState?: EngineContext["selectedPlaceState"];
  behaviorProfile?: BehaviorProfile;
  behaviorEvents?: BehaviorEvent[];
}): EngineContext {
  const behaviorProfile =
    state.behaviorProfile ??
    (state.behaviorEvents?.length
      ? buildBehaviorProfile(state.behaviorEvents)
      : emptyBehaviorProfile());

  return buildEngineContext(
    {
      preferences: state.preferences,
      savedPlaceIds: state.savedPlaceIds,
      recentPlaceIds: state.recentPlaceIds,
      itineraryAnchorPlaceId: state.itineraryAnchorPlaceId,
      lodgingPlan: state.lodgingPlan,
      selectedPlaceState: state.selectedPlaceState,
    },
    behaviorProfile,
  );
}

export function buildEngineContext(
  slice: TripStoreEngineSlice,
  behaviorProfile: BehaviorProfile,
): EngineContext {
  const preferences = slice.preferences;
  return {
    preferences,
    zoneId: preferences.zoneId,
    travelDate: preferences.travelDate,
    behaviorProfile,
    savedPlaceIds: slice.savedPlaceIds,
    recentPlaceIds: slice.recentPlaceIds,
    anchorPlaceId: slice.itineraryAnchorPlaceId,
    lodgingPlan: slice.lodgingPlan,
    selectedPlaceState: slice.selectedPlaceState,
  };
}
