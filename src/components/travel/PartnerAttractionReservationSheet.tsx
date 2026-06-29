"use client";

import { useEffect, useState } from "react";
import { QRTicketCard } from "@/components/travel/QRTicketCard";
import { ReservationPaymentPanel } from "@/components/travel/ReservationPaymentPanel";
import { ReservationSlotPicker } from "@/components/travel/ReservationSlotPicker";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardChip, TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";
import {
  estimateAttractionAmount,
  formatKrw,
  getPaymentMethodLabel,
  type PaymentMethodId,
} from "@/lib/paymentQuote";
import { cn } from "@/lib/utils";
import type { Place, QRTicket } from "@/types/travel";

interface PartnerAttractionReservationSheetProps {
  open: boolean;
  place?: Place;
  selectedSlotId?: string;
  confirmed?: boolean;
  ticket?: QRTicket;
  travelers?: number;
  paidAmount?: number;
  paymentMethod?: string;
  onClose: () => void;
  onSelectSlot: (slotId: string) => void;
  onConfirm: (payment: { amount: number; method: string }) => void;
}

type AttractionStep = "details" | "payment";

const PARTNER_DISCOUNT = 2000;

export function PartnerAttractionReservationSheet({
  open,
  place,
  selectedSlotId,
  confirmed = false,
  ticket,
  travelers = 2,
  paidAmount,
  paymentMethod,
  onClose,
  onSelectSlot,
  onConfirm,
}: PartnerAttractionReservationSheetProps) {
  const [step, setStep] = useState<AttractionStep>("details");

  const selectedSlot = place?.availableSlots.find((slot) => slot.id === selectedSlotId);
  const amount = place ? estimateAttractionAmount(place, selectedSlot, travelers) : 0;
  const payableTotal = Math.max(0, amount - PARTNER_DISCOUNT);
  const slotSummary = selectedSlot ? `${selectedSlot.label} 입장` : "시간대를 선택해 주세요";

  useEffect(() => {
    if (open) setStep("details");
  }, [open, place?.id, confirmed]);

  if (!open || !place) return null;

  function handleGoToPayment() {
    if (!selectedSlotId) return;
    setStep("payment");
  }

  function handlePaid(method: PaymentMethodId) {
    onConfirm({
      amount: payableTotal,
      method: getPaymentMethodLabel(method),
    });
    setStep("details");
  }

  const eyebrow = confirmed
    ? "Booking Confirmed"
    : step === "payment"
      ? "Payment"
      : "Partner Reservation";

  const footer =
    !confirmed && step === "details" ? (
      <PremiumButton className="w-full" disabled={!selectedSlotId} onClick={handleGoToPayment}>
        {selectedSlotId
          ? `결제하기 · ${formatKrw(payableTotal)}`
          : "시간대를 선택해 주세요"}
      </PremiumButton>
    ) : null;

  return (
    <BottomSheet
      eyebrow={eyebrow}
      footer={footer}
      onClose={onClose}
      open={open}
      subtitle={
        confirmed
          ? "결제가 완료되었고 QR 티켓이 발급되었습니다."
          : "시간대를 선택한 뒤 결제하면 예약이 확정됩니다."
      }
      title={place.name}
    >
      <TravelCardShell>
        <div className={cn(travelCardClass.body, "flex items-center gap-3")}>
          <PlaceThumbnail
            className="shrink-0 rounded-lg"
            heightClassName="size-12"
            place={place}
          />
          <div>
            <p className={travelCardClass.subtitle}>{place.signature}</p>
            <div className="mt-2">
              <TravelCardChip tone="accent">제휴 · QR 입장</TravelCardChip>
            </div>
          </div>
        </div>
      </TravelCardShell>

      {confirmed && ticket ? (
        <>
          {paidAmount ? (
            <TravelCardShell>
              <div className={travelCardClass.body}>
                <p className="text-sm font-semibold text-pine">결제 완료</p>
                <p className="mt-1 text-sm text-ink">
                  {formatKrw(paidAmount)}
                  {paymentMethod ? ` · ${paymentMethod}` : ""}
                </p>
              </div>
            </TravelCardShell>
          ) : null}
          <QRTicketCard ticket={ticket} />
        </>
      ) : null}

      {!confirmed && step === "payment" ? (
        <ReservationPaymentPanel
          amount={amount}
          discountAmount={PARTNER_DISCOUNT}
          discountLabel="제휴 명소 할인"
          onBack={() => setStep("details")}
          onPaid={handlePaid}
          summary={`${slotSummary} · ${travelers}명`}
          title={place.name}
        />
      ) : null}

      {!confirmed && step === "details" ? (
        <ReservationSlotPicker
          onSelectSlot={onSelectSlot}
          placeId={place.id}
          selectedSlotId={selectedSlotId}
          slots={place.availableSlots}
        />
      ) : null}
    </BottomSheet>
  );
}
