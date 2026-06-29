import type { ReservationHubCategory } from "@/types/reservationHub";
import type { TravelZoneId } from "@/types/travel";

export interface GangwonPassPlan {
  id: string;
  label: string;
  durationDays: number;
  price: number;
  description: string;
}

export interface GangwonPassBenefit {
  id: string;
  title: string;
  description: string;
  discountLabel: string;
  category: "attraction" | "cafe" | "local" | "hub";
  placeId?: string;
  localOfferId?: string;
  hubCategory?: ReservationHubCategory;
}

export interface ActiveGangwonPass {
  planId: string;
  planLabel: string;
  amount: number;
  purchasedAt: string;
  validUntil: string;
  passNumber: string;
  redeemedBenefitIds: string[];
}

export interface RegionStampRecord {
  zoneId: TravelZoneId;
  collectedAt: string;
  source: "manual" | "zone-select" | "itinerary";
}
