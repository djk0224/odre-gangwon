import type { AiChatSlotKey } from "@/lib/aiChatReadiness";
import type { BehaviorProfile } from "@/types/behavior";
import type { HubReservationBooking } from "@/types/reservationHub";
import type {
  CompanionType,
  Itinerary,
  ReservationRecord,
  SeasonId,
  Transportation,
  TravelDuration,
  TravelZoneId,
  TripPace,
  TripPreferences,
  TripTheme,
} from "@/types/travel";

export type AiProvider = "openai" | "gemini" | "rules" | "ai+verified";

export interface AiItinerarySelection {
  placeIds: string[];
  explanation: string;
  alternatives: string[];
}

export interface AiPlaceSearchResult {
  placeIds: string[];
  summary: string;
  provider: AiProvider;
}

export interface AiCareSuggestion {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  actionLabel?: string;
}

export interface AiCrowdGuidance {
  summary: string;
  recommendedSlotId?: string;
  avoidSlotIds: string[];
  provider: AiProvider;
}

export interface AiChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiChatDaySection {
  label: string;
  items: string[];
}

export type AiChatSourceKind =
  | "catalog"
  | "nature-road"
  | "restaurant"
  | "commerce"
  | "faq"
  | "rag"
  | "weather"
  | "tago"
  | "ai-search";

export interface AiChatSource {
  id: string;
  label: string;
  kind: AiChatSourceKind;
}

export type AiChatActionType =
  | "open_place"
  | "open_reservation_place"
  | "open_reservation_hub"
  | "open_care"
  | "open_itinerary";

/** 채팅 툴이 당일 케어·예약 맥락에 쓸 앱 상태 (클라이언트 → API) */
export interface AiChatTripContext {
  itinerary?: Itinerary;
  reservations?: ReservationRecord[];
  hubBookings?: HubReservationBooking[];
  claimedLocalOfferIds?: string[];
  savedPlaceIds?: string[];
  recentPlaceIds?: string[];
  itineraryAnchorPlaceId?: string | null;
  behaviorProfile?: BehaviorProfile;
}

export interface AiChatAction {
  id: string;
  label: string;
  type: AiChatActionType;
  placeId?: string;
  /** 예약 허브 카테고리 (stay, dining, …) */
  hubCategory?: string;
}

export interface AiChatDisplayBlocks {
  headline: string;
  days: AiChatDaySection[];
  tips: string[];
  /** RAG·API 툴 출처 (컨시어지 모드) */
  sources?: AiChatSource[];
  /** 예약·장소 등 실행 CTA */
  actions?: AiChatAction[];
}

export type AiChatPhase = "clarify" | "confirm" | "propose" | "refine" | "info";

/** concierge = Q&A·툴 우선, planning = 일정 슬롯 수집 */
export type AiChatMode = "concierge" | "planning";

export interface AiChatSlots {
  duration?: TravelDuration;
  companion?: CompanionType;
  transportation?: Transportation;
  themes?: TripTheme[];
  travelDate?: string;
  season?: SeasonId;
  travelers?: number;
  pace?: TripPace;
  zoneId?: TravelZoneId;
}

export interface AiChatSession {
  slots: AiChatSlots;
  phase: AiChatPhase;
  mode?: AiChatMode;
  confirmed: boolean;
  lastProposedPlaceIds: string[];
  askedSlots: AiChatSlotKey[];
  /** 마지막 턴에서 호출한 컨시어지 툴 (디버그·UI) */
  lastToolCalls?: string[];
}

export interface AiQuickReply {
  id: string;
  label: string;
  slotPatch?: Partial<AiChatSlots>;
  action?: "confirm_go" | "reset_confirm";
}

export interface AiChatResponse {
  answer: string;
  phase: AiChatPhase;
  blocks: AiChatDisplayBlocks;
  quickReplies: AiQuickReply[];
  session: AiChatSession;
  slotsSummary: string;
  suggestedPlaceIds: string[];
  /** 일차 카드가 있고 카탈로그 장소 id가 잡혔을 때 실행 일정 생성 가능 */
  itineraryReady: boolean;
  mergedPreferences?: TripPreferences;
  provider: AiProvider;
  toolCalls?: string[];
}

export interface AiGenerationContext {
  preferences: TripPreferences;
  anchorPlaceId?: string | null;
  weatherSummary?: string | null;
}
