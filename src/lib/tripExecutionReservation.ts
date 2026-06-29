import type {
  CheckInStatus,
  QRTicket,
  ReservationExecutionStatus,
  ReservationRecord,
} from "@/types/travel";

export const reservationExecutionLabels: Record<ReservationExecutionStatus, string> = {
  slot_selected: "슬롯 선택",
  payment_pending: "결제 대기",
  confirmed: "예약 확정",
  qr_issued: "QR 발급",
  checked_in: "입장 완료",
  cancelled: "취소",
};

export function mapCheckInToExecutionStatus(
  checkIn: CheckInStatus,
): ReservationExecutionStatus {
  switch (checkIn) {
    case "pending":
      return "confirmed";
    case "ready":
      return "qr_issued";
    case "checked-in":
      return "checked_in";
  }
}

export function nextCheckInStatus(current: CheckInStatus): CheckInStatus | null {
  if (current === "pending") return "ready";
  if (current === "ready") return "checked-in";
  return null;
}

export function canCheckInTicket(ticket: QRTicket): boolean {
  return ticket.checkInStatus === "ready";
}

export function applyCheckInToTicket(ticket: QRTicket): QRTicket {
  const next = nextCheckInStatus(ticket.checkInStatus);
  if (!next) return ticket;
  return { ...ticket, checkInStatus: next };
}

export function syncReservationExecutionStatus(
  reservation: ReservationRecord,
  ticket?: QRTicket,
): ReservationExecutionStatus {
  if (reservation.executionStatus === "cancelled") return "cancelled";
  if (ticket?.checkInStatus === "checked-in") return "checked_in";
  if (ticket?.checkInStatus === "ready") return "qr_issued";
  if (ticket) return "confirmed";
  return reservation.executionStatus ?? "confirmed";
}
