import { pickRouteLocalOffers } from "@/data/mockLocalCommerce";
import { resolveEffectiveThemes } from "@/lib/regionalPreferences";
import { getDefaultItineraryDays } from "@/lib/travelDuration";
import type {
  ItineraryDay,
  ItineraryTimelineItem,
  LocalCommerceOffer,
  TripPreferences,
} from "@/types/travel";

function toLocalTimelineItem(
  offer: LocalCommerceOffer,
  day: ItineraryDay,
  order: number,
): ItineraryTimelineItem {
  return {
    id: `local-${offer.id}-day${day}`,
    kind: "local",
    day,
    order,
    title: offer.name,
    description: `${offer.routeNote} · ${offer.couponLabel}`,
    duration: offer.category === "market" ? "30분" : "20분",
    localOffer: offer,
  };
}

export function injectLocalOffersIntoTimeline(
  baseTimeline: ItineraryTimelineItem[],
  preferences: TripPreferences,
): ItineraryTimelineItem[] {
  const offers = pickRouteLocalOffers(
    resolveEffectiveThemes(preferences),
    preferences.season,
    preferences.pace === "packed" ? 1 : 2,
    preferences.zoneId,
  );

  if (offers.length === 0) {
    return baseTimeline;
  }

  const output: ItineraryTimelineItem[] = [];

  for (const day of getDefaultItineraryDays(preferences.duration)) {
    const dayItems = baseTimeline.filter((item) => (item.day ?? 1) === day);
    if (dayItems.length === 0) {
      continue;
    }

    if (dayItems.length < 2) {
      output.push(...dayItems);
      continue;
    }

    const offer = day === 1 ? offers[0] : offers[1];
    if (!offer) {
      output.push(...dayItems);
      continue;
    }

    const insertAt = Math.min(2, dayItems.length - 1);

    dayItems.forEach((item, index) => {
      output.push(item);
      if (index === insertAt - 1) {
        const nextOrder = item.order ?? index + 1;
        output.push(
          toLocalTimelineItem(
            offer,
            day,
            nextOrder + 0.5,
          ),
        );
      }
    });
  }

  return output.length > 0 ? output : baseTimeline;
}
