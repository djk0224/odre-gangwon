export type BehaviorEventType =
  | "place_view"
  | "place_save"
  | "place_unsave"
  | "search_submit"
  | "itinerary_generate"
  | "itinerary_save"
  | "reservation_confirm"
  | "qr_issued"
  | "qr_checkin"
  | "tab_view"
  | "ai_chat_message"
  | "review_submit"
  | "review_like"
  | "review_comment";

export type BehaviorTabId =
  | "home"
  | "community"
  | "newsletter"
  | "reservation"
  | "care"
  | "places";

export interface BehaviorEvent {
  id: string;
  type: BehaviorEventType;
  timestamp: string;
  placeId?: string;
  query?: string;
  tab?: BehaviorTabId;
  metadata?: Record<string, string>;
}

export interface BehaviorProfile {
  placeAffinity: Record<string, number>;
  categoryAffinity: Record<string, number>;
  themeAffinity: Record<string, number>;
  recentIntentTags: string[];
  lastUpdatedAt: string;
}
