import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type {
  BehaviorEvent,
  BehaviorEventType,
  BehaviorProfile,
  BehaviorTabId,
} from "@/types/behavior";
import type { PlaceCategory, TripTheme } from "@/types/travel";

const MAX_EVENTS = 500;
const EVENT_WEIGHTS: Partial<Record<BehaviorEventType, number>> = {
  place_view: 1,
  place_save: 4,
  place_unsave: -2,
  search_submit: 2,
  itinerary_generate: 3,
  itinerary_save: 5,
  reservation_confirm: 8,
  qr_issued: 6,
  tab_view: 0.2,
  ai_chat_message: 1.5,
  review_submit: 4,
  review_like: 1,
  review_comment: 1.5,
};

const THEME_BY_CATEGORY: Partial<Record<PlaceCategory, TripTheme>> = {
  cave: "history",
  sea: "nature",
  observatory: "nature",
  "cable-car": "activity",
  market: "culture",
  restaurant: "culture",
  cafe: "rest",
  experience: "experience",
  trail: "rest",
};

function decayFactor(timestamp: string, nowMs: number): number {
  const ageHours = (nowMs - new Date(timestamp).getTime()) / (1000 * 60 * 60);
  if (ageHours <= 24) return 1;
  if (ageHours <= 72) return 0.7;
  if (ageHours <= 168) return 0.45;
  return 0.25;
}

export function createBehaviorEvent(
  type: BehaviorEventType,
  payload?: {
    placeId?: string;
    query?: string;
    tab?: BehaviorTabId;
    metadata?: Record<string, string>;
  },
): BehaviorEvent {
  return {
    id: `beh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: new Date().toISOString(),
    placeId: payload?.placeId,
    query: payload?.query?.slice(0, 120),
    tab: payload?.tab,
    metadata: payload?.metadata,
  };
}

export function appendBehaviorEvent(
  events: BehaviorEvent[],
  event: BehaviorEvent,
): BehaviorEvent[] {
  return [...events, event].slice(-MAX_EVENTS);
}

export function buildBehaviorProfile(events: BehaviorEvent[]): BehaviorProfile {
  const nowMs = Date.now();
  const placeAffinity: Record<string, number> = {};
  const categoryAffinity: Record<string, number> = {};
  const themeAffinity: Record<string, number> = {};
  const tagCounts: Record<string, number> = {};

  for (const event of events) {
    const weight = (EVENT_WEIGHTS[event.type] ?? 1) * decayFactor(event.timestamp, nowMs);
    if (weight <= 0) continue;

    if (event.placeId) {
      placeAffinity[event.placeId] = (placeAffinity[event.placeId] ?? 0) + weight;
      const place = getCatalogPlaceById(event.placeId);
      if (place) {
        categoryAffinity[place.category] = (categoryAffinity[place.category] ?? 0) + weight;
        const theme = THEME_BY_CATEGORY[place.category];
        if (theme) {
          themeAffinity[theme] = (themeAffinity[theme] ?? 0) + weight;
        }
      }
    }

    if (event.type === "search_submit" && event.query) {
      const tokens = event.query.split(/\s+/).filter((t) => t.length >= 2);
      for (const token of tokens.slice(0, 6)) {
        tagCounts[token] = (tagCounts[token] ?? 0) + weight;
      }
    }

    if (event.type === "ai_chat_message" && event.metadata?.intent) {
      tagCounts[event.metadata.intent] = (tagCounts[event.metadata.intent] ?? 0) + weight;
    }
  }

  const recentIntentTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);

  return {
    placeAffinity,
    categoryAffinity,
    themeAffinity,
    recentIntentTags,
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function emptyBehaviorProfile(): BehaviorProfile {
  return {
    placeAffinity: {},
    categoryAffinity: {},
    themeAffinity: {},
    recentIntentTags: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}
