import type { ReservationHubCategory, ReservationOffer } from "@/types/reservationHub";

export interface OfferBookingDraft {
  date: string;
  guests: number;
  checkOutDate?: string;
  roomType?: string;
  transportDirection?: "one-way" | "round-trip";
  timeSlot?: string;
  pickupLocation?: string;
  returnDate?: string;
  partySize?: number;
  sessionSlot?: string;
  note?: string;
}

export const defaultTravelDate = "2026-05-22";

export function createOfferBookingDraft(
  offer: ReservationOffer,
  travelers = 2,
): OfferBookingDraft {
  const base: OfferBookingDraft = {
    date: defaultTravelDate,
    guests: travelers,
    partySize: travelers,
  };

  switch (offer.category) {
    case "stay":
      return {
        ...base,
        checkOutDate: "2026-05-23",
        roomType: "오션뷰 디럭스",
      };
    case "transport":
      return {
        ...base,
        transportDirection: "one-way",
        timeSlot: offer.id.includes("ktx") ? "09:12" : "10:30",
      };
    case "rental":
      return {
        ...base,
        pickupLocation: offer.id.includes("suv") ? "동해시 픽업" : "삼척역 픽업",
        returnDate: "2026-05-23",
        timeSlot: "09:00",
      };
    case "dining":
      return {
        ...base,
        partySize: travelers,
        timeSlot: "18:30",
      };
    case "activity":
      return {
        ...base,
        sessionSlot: "오후 14:00",
        partySize: travelers,
      };
    default:
      return base;
  }
}

export function validateOfferBookingDraft(
  category: ReservationHubCategory,
  draft: OfferBookingDraft,
): string | null {
  if (!draft.date) return "날짜를 선택해 주세요.";

  switch (category) {
    case "stay":
      if (!draft.checkOutDate) return "체크아웃 날짜를 선택해 주세요.";
      if (draft.checkOutDate <= draft.date) return "체크아웃은 체크인 이후여야 합니다.";
      if (!draft.roomType) return "객실 타입을 선택해 주세요.";
      if (draft.guests < 1) return "인원을 선택해 주세요.";
      return null;
    case "transport":
      if (!draft.timeSlot) return "출발 시간을 선택해 주세요.";
      if (!draft.transportDirection) return "편도/왕복을 선택해 주세요.";
      if (draft.guests < 1) return "승객 수를 선택해 주세요.";
      return null;
    case "rental":
      if (!draft.pickupLocation) return "픽업 장소를 선택해 주세요.";
      if (!draft.timeSlot) return "픽업 시간을 선택해 주세요.";
      if (!draft.returnDate) return "반납 날짜를 선택해 주세요.";
      if (draft.returnDate < draft.date) return "반납일은 픽업일 이후여야 합니다.";
      return null;
    case "dining":
      if (!draft.timeSlot) return "방문 시간을 선택해 주세요.";
      if ((draft.partySize ?? 0) < 1) return "인원을 선택해 주세요.";
      return null;
    case "activity":
      if (!draft.sessionSlot) return "체험 회차를 선택해 주세요.";
      if ((draft.partySize ?? 0) < 1) return "참가 인원을 선택해 주세요.";
      return null;
    default:
      return null;
  }
}

function formatShortDate(value: string): string {
  const [, month, day] = value.split("-");
  return `${month}.${day}`;
}

export function buildOfferBookingSummary(
  offer: ReservationOffer,
  draft: OfferBookingDraft,
): string {
  switch (offer.category) {
    case "stay":
      return `${formatShortDate(draft.date)} 체크인 · ${formatShortDate(draft.checkOutDate ?? "")} 체크아웃 · ${draft.guests}명 · ${draft.roomType}`;
    case "transport":
      return `${formatShortDate(draft.date)} · ${draft.transportDirection === "round-trip" ? "왕복" : "편도"} · ${draft.timeSlot} · ${draft.guests}명`;
    case "rental":
      return `${formatShortDate(draft.date)} ${draft.timeSlot} 픽업 · ${draft.pickupLocation} · ${formatShortDate(draft.returnDate ?? "")} 반납`;
    case "dining":
      return `${formatShortDate(draft.date)} ${draft.timeSlot} · ${draft.partySize}명`;
    case "activity":
      return `${formatShortDate(draft.date)} ${draft.sessionSlot} · ${draft.partySize}명`;
    default:
      return `${formatShortDate(draft.date)} · ${draft.guests}명`;
  }
}

export function getOfferBookingNumber(offer: ReservationOffer): string {
  const prefix = offer.category.slice(0, 3).toUpperCase();
  return `ODRE-${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
}
