import type { HubReservationBooking } from "@/types/reservationHub";
import type { ReservationRecord } from "@/types/travel";

export function getTotalReservationCount(
  reservations: ReservationRecord[],
  hubBookings: HubReservationBooking[],
): number {
  return reservations.length + hubBookings.length;
}

export function getTripReservationStatusLabel(
  reservations: ReservationRecord[],
  hubBookings: HubReservationBooking[],
  pendingItineraryReservations = 0,
): string {
  const total = getTotalReservationCount(reservations, hubBookings);
  if (pendingItineraryReservations > 0) {
    return `예약 ${total}건 · 일정 ${pendingItineraryReservations}건 대기`;
  }
  if (total > 0) {
    return `예약 ${total}건`;
  }
  return "실행 중";
}
