import type { TravelZoneId } from "@/types/travel";

export type ReservationHubCategory =
  | "stay"
  | "transport"
  | "rental"
  | "dining"
  | "activity"
  | "attraction";

export interface ReservationHubCategoryMeta {
  id: ReservationHubCategory;
  label: string;
  description: string;
}

export type ReservationOfferSource =
  | "mock"
  | "tour-gw"
  | "gangwon-restaurant"
  | "sbiz-stroll";

export interface ReservationOfferCoordinates {
  lat: number;
  lng: number;
}

export interface ReservationOffer {
  id: string;
  category: ReservationHubCategory;
  title: string;
  subtitle: string;
  description: string;
  priceLabel: string;
  badge?: string;
  gradient: string;
  meta?: string;
  imageUrl?: string;
  source?: ReservationOfferSource;
  externalId?: string;
  coordinates?: ReservationOfferCoordinates;
  address?: string;
  /** 숙소·교통 등 권역 필터용 */
  zoneId?: TravelZoneId;
}

export interface HubReservationPayment {
  amount: number;
  method: string;
  paidAt: string;
}

export interface HubReservationBooking {
  id: string;
  category: ReservationHubCategory;
  offerId: string;
  title: string;
  subtitle: string;
  detailSummary: string;
  bookingNumber: string;
  payment: HubReservationPayment;
  confirmedAt: string;
  coordinates?: ReservationOfferCoordinates;
  address?: string;
}
