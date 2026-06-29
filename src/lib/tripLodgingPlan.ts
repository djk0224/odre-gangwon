import { getDayCountForDuration } from "@/lib/travelDuration";
import type {
  Coordinates,
  ItineraryDay,
  TravelDuration,
  TripLodgingDepot,
  TripLodgingNight,
  TripLodgingPlan,
} from "@/types/travel";

export function getNightCountForDuration(duration: TravelDuration): number {
  const dayCount = getDayCountForDuration(duration);
  return Math.max(0, dayCount - 1);
}

export function emptyLodgingPlan(): TripLodgingPlan {
  return { mode: "off", nights: [] };
}

export function createLodgingPlanForDuration(
  duration: TravelDuration,
  existing?: TripLodgingPlan,
): TripLodgingPlan {
  const nightCount = getNightCountForDuration(duration);
  if (nightCount === 0) {
    return emptyLodgingPlan();
  }

  const nights: TripLodgingNight[] = [];
  for (let i = 1; i <= nightCount; i += 1) {
    const prev = existing?.nights.find((n) => n.nightIndex === i);
    nights.push(
      prev ?? {
        nightIndex: i,
        depot: placeholderDepot(i),
      },
    );
  }

  if (existing?.mode === "single" && existing.defaultDepot) {
    return {
      mode: "single",
      defaultDepot: existing.defaultDepot,
      nights: nights.map((n) => ({ ...n, depot: existing.defaultDepot! })),
    };
  }

  const filled = nights.filter((n) => !isPlaceholderDepot(n.depot));
  if (filled.length === 0) {
    return { mode: "per_night", nights };
  }

  if (existing?.mode === "per_night") {
    return { mode: "per_night", nights };
  }

  return { mode: "per_night", nights };
}

function placeholderDepot(nightIndex: number): TripLodgingDepot {
  return {
    id: `lodging-slot-${nightIndex}`,
    name: `${nightIndex}박째 숙소 미지정`,
    coordinates: { lat: 0, lng: 0 },
    source: "manual_geocode",
  };
}

export function isPlaceholderDepot(depot: TripLodgingDepot): boolean {
  return (
    depot.id.startsWith("lodging-slot-") ||
    (depot.coordinates.lat === 0 && depot.coordinates.lng === 0)
  );
}

export function isLodgingPlanActive(plan: TripLodgingPlan | undefined): boolean {
  if (!plan || plan.mode === "off") return false;
  if (plan.mode === "single") {
    return Boolean(plan.defaultDepot && !isPlaceholderDepot(plan.defaultDepot));
  }
  return plan.nights.some((n) => !isPlaceholderDepot(n.depot));
}

export function resolveNightDepot(
  plan: TripLodgingPlan,
  nightIndex: number,
): TripLodgingDepot | null {
  if (plan.mode === "single" && plan.defaultDepot && !isPlaceholderDepot(plan.defaultDepot)) {
    return plan.defaultDepot;
  }
  const night = plan.nights.find((n) => n.nightIndex === nightIndex);
  if (!night || isPlaceholderDepot(night.depot)) return null;
  return night.depot;
}

export interface DayLodgingDepots {
  start: TripLodgingDepot | null;
  end: TripLodgingDepot | null;
  interHotelTransfer: boolean;
}

/** Day별 아침 출발·저녁 복귀 숙소 (2박3일 nights=[A,B] 기준) */
export function resolveDayLodgingDepots(
  day: ItineraryDay,
  plan: TripLodgingPlan,
  duration: TravelDuration,
): DayLodgingDepots {
  const dayCount = getDayCountForDuration(duration);
  if (!isLodgingPlanActive(plan) || day < 1 || day > dayCount) {
    return { start: null, end: null, interHotelTransfer: false };
  }

  if (plan.mode === "single" && plan.defaultDepot && !isPlaceholderDepot(plan.defaultDepot)) {
    return {
      start: plan.defaultDepot,
      end: plan.defaultDepot,
      interHotelTransfer: false,
    };
  }

  const nightCount = getNightCountForDuration(duration);
  const startNightIndex = day === 1 ? 1 : day - 1;
  const endNightIndex = Math.min(day, nightCount);

  const start = resolveNightDepot(plan, startNightIndex);
  const end = endNightIndex >= 1 ? resolveNightDepot(plan, endNightIndex) : start;

  const interHotelTransfer =
    Boolean(start && end && start.id !== end.id);

  return { start, end, interHotelTransfer };
}

export function depotFromOffer(
  offer: {
    id: string;
    title: string;
    description?: string;
    coordinates?: Coordinates;
    address?: string;
  },
  source: TripLodgingDepot["source"] = "wizard_offer",
): TripLodgingDepot | null {
  if (!offer.coordinates) return null;
  return {
    id: `lodging-${offer.id}`,
    name: offer.title,
    coordinates: offer.coordinates,
    address: offer.address ?? offer.description,
    source,
    offerId: offer.id,
  };
}

export function applySameLodgingToAllNights(
  plan: TripLodgingPlan,
  depot: TripLodgingDepot,
  duration: TravelDuration,
): TripLodgingPlan {
  const nightCount = getNightCountForDuration(duration);
  if (nightCount === 0) {
    return { mode: "single", defaultDepot: depot, nights: [] };
  }
  return {
    mode: "single",
    defaultDepot: depot,
    nights: Array.from({ length: nightCount }, (_, i) => ({
      nightIndex: i + 1,
      depot,
    })),
  };
}
