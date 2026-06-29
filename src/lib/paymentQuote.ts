import type { OfferBookingDraft } from "@/lib/offerReservationForm";
import type { ReservationOffer } from "@/types/reservationHub";
import type { Place, ReservationSlot } from "@/types/travel";

export type PaymentMethodId = "kakao" | "naver" | "card";

export const paymentMethods: Array<{ id: PaymentMethodId; label: string }> = [
  { id: "kakao", label: "카카오페이" },
  { id: "naver", label: "네이버페이" },
  { id: "card", label: "신용/체크카드" },
];

export function formatKrw(amount: number): string {
  return `₩${amount.toLocaleString("ko-KR")}`;
}

function nightsBetween(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn).getTime();
  const end = new Date(checkOut).getTime();
  const diff = Math.max(end - start, 0);
  return Math.max(1, Math.round(diff / (1000 * 60 * 60 * 24)));
}

export function estimateOfferAmount(offer: ReservationOffer, draft: OfferBookingDraft): number {
  switch (offer.category) {
    case "stay": {
      const nights = nightsBetween(draft.date, draft.checkOutDate ?? draft.date);
      const roomMultiplier =
        draft.roomType === "패밀리 스위트" ? 1.35 : draft.roomType === "오션뷰 디럭스" ? 1.15 : 1;
      return Math.round(128000 * nights * roomMultiplier);
    }
    case "transport": {
      const base = offer.id.includes("ktx") ? 28600 : 12000;
      const multiplier = draft.transportDirection === "round-trip" ? 2 : 1;
      return base * multiplier * Math.max(1, draft.guests);
    }
    case "rental": {
      const base = offer.id.includes("suv") ? 92000 : 68000;
      const days = nightsBetween(draft.date, draft.returnDate ?? draft.date);
      return base * days;
    }
    case "dining":
      return 18000 * Math.max(1, draft.partySize ?? draft.guests);
    case "activity":
      return (offer.id.includes("kayak") ? 45000 : 38000) * Math.max(1, draft.partySize ?? draft.guests);
    default:
      return 0;
  }
}

const attractionBasePrice: Record<string, number> = {
  hwanseongul: 18000,
  "samcheok-cable": 24000,
};

export function estimateAttractionAmount(
  place: Place,
  slot: ReservationSlot | undefined,
  travelers: number,
): number {
  const base = attractionBasePrice[place.id] ?? 20000;
  const crowdMultiplier =
    slot?.crowdLevel === "very-high" ? 1.1 : slot?.crowdLevel === "high" ? 1.05 : 1;
  return Math.round(base * Math.max(1, travelers) * crowdMultiplier);
}

export function getPaymentMethodLabel(method: PaymentMethodId): string {
  return paymentMethods.find((item) => item.id === method)?.label ?? "카드";
}
