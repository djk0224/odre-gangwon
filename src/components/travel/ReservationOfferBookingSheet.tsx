"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Minus, Plus } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PreferenceChip } from "@/components/ui/PreferenceChip";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";
import { ReservationPaymentPanel } from "@/components/travel/ReservationPaymentPanel";
import {
  buildOfferBookingSummary,
  createOfferBookingDraft,
  validateOfferBookingDraft,
  type OfferBookingDraft,
} from "@/lib/offerReservationForm";
import {
  estimateOfferAmount,
  formatKrw,
  getPaymentMethodLabel,
  type PaymentMethodId,
} from "@/lib/paymentQuote";
import { cn } from "@/lib/utils";
import type { HubReservationBooking, ReservationOffer } from "@/types/reservationHub";

interface ReservationOfferBookingSheetProps {
  open: boolean;
  offer?: ReservationOffer;
  booking?: HubReservationBooking;
  defaultTravelers?: number;
  onClose: () => void;
  onConfirm: (
    offerId: string,
    draft: OfferBookingDraft,
    payment: { amount: number; method: string },
  ) => void;
}

type BookingStep = "details" | "payment";

const roomTypes = ["스탠다드", "오션뷰 디럭스", "패밀리 스위트"];
const ktxTimes = ["07:30", "09:12", "13:45", "18:20"];
const shuttleTimes = ["09:30", "10:30", "13:00", "15:30"];
const pickupTimes = ["09:00", "10:00", "11:00", "14:00"];
const diningTimes = ["11:30", "13:00", "18:00", "18:30", "19:30"];
const activitySessions = ["오전 10:00", "오후 14:00", "오후 16:30"];

export function ReservationOfferBookingSheet({
  open,
  offer,
  booking,
  defaultTravelers = 2,
  onClose,
  onConfirm,
}: ReservationOfferBookingSheetProps) {
  const [draft, setDraft] = useState<OfferBookingDraft | null>(null);
  const [step, setStep] = useState<BookingStep>("details");
  const [error, setError] = useState("");

  const readonly = Boolean(booking);
  const activeOffer = offer;

  useEffect(() => {
    if (!open || !activeOffer) {
      setDraft(null);
      setStep("details");
      setError("");
      return;
    }

    setDraft(createOfferBookingDraft(activeOffer, defaultTravelers));
    setStep("details");
    setError("");
  }, [open, activeOffer, defaultTravelers]);

  if (!open || (!activeOffer && !booking)) return null;

  const displayTitle = booking?.title ?? activeOffer?.title ?? "";
  const displaySubtitle = booking?.subtitle ?? activeOffer?.subtitle ?? "";
  const displayGradient = activeOffer?.gradient ?? "from-pine to-mist";

  function updateDraft<K extends keyof OfferBookingDraft>(key: K, value: OfferBookingDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
    setError("");
  }

  function handleGoToPayment() {
    if (!activeOffer || !draft) return;

    const validationError = validateOfferBookingDraft(activeOffer.category, draft);
    if (validationError) {
      setError(validationError);
      return;
    }

    setStep("payment");
  }

  function handlePaid(method: PaymentMethodId) {
    if (!activeOffer || !draft) return;

    const amount = estimateOfferAmount(activeOffer, draft);
    const discount = activeOffer.badge === "제휴" ? 2000 : 0;
    const total = Math.max(0, amount - discount);

    onConfirm(activeOffer.id, draft, {
      amount: total,
      method: getPaymentMethodLabel(method),
    });
    setStep("details");
  }

  const paymentAmount = activeOffer && draft ? estimateOfferAmount(activeOffer, draft) : 0;
  const partnerDiscount = activeOffer?.badge === "제휴" ? 2000 : 0;
  const payableTotal = Math.max(0, paymentAmount - partnerDiscount);

  const footer =
    !readonly && step === "details" && draft && activeOffer ? (
      <PremiumButton className="w-full" onClick={handleGoToPayment}>
        결제하기 · {formatKrw(payableTotal)}
      </PremiumButton>
    ) : null;

  return (
    <BottomSheet
      eyebrow={readonly ? "Booking Confirmed" : step === "payment" ? "Payment" : "Booking"}
      footer={footer}
      onClose={onClose}
      open={open}
      subtitle={displaySubtitle}
      title={displayTitle}
    >
      <div className="space-y-4">
        {activeOffer ? (
          <TravelCardShell>
            <div className={cn(travelCardClass.body, "flex gap-3")}>
              <div className={cn("size-12 shrink-0 rounded-lg bg-gradient-to-br", displayGradient)} />
              <div>
                <p className={travelCardClass.subtitle}>{activeOffer.description}</p>
                <p className="mt-2 text-sm font-semibold text-pine">{activeOffer.priceLabel}</p>
              </div>
            </div>
          </TravelCardShell>
        ) : null}

        {readonly && booking ? (
          <TravelCardShell>
            <div className={travelCardClass.bodyLg}>
              <p className="text-sm font-semibold text-pine">예약 확정</p>
              <p className="mt-2 text-sm leading-6 text-ink">{booking.detailSummary}</p>
              <p className="mt-4 text-xs text-stone">예약번호</p>
              <p className="mt-1 text-lg font-semibold tracking-[0.08em] text-ink">
                {booking.bookingNumber}
              </p>
              <p className="mt-4 text-xs text-stone">결제 완료</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {formatKrw(booking.payment.amount)} · {booking.payment.method}
              </p>
            </div>
          </TravelCardShell>
        ) : null}

        {!readonly && step === "payment" && draft && activeOffer ? (
          <ReservationPaymentPanel
            amount={paymentAmount}
            discountAmount={partnerDiscount}
            discountLabel="ODRÉ 제휴 할인"
            onBack={() => setStep("details")}
            onPaid={handlePaid}
            summary={buildOfferBookingSummary(activeOffer, draft)}
            title={activeOffer.title}
          />
        ) : null}

        {!readonly && step === "details" && draft && activeOffer ? (
          <>
            {activeOffer.category === "stay" ? (
              <StayFields draft={draft} onChange={updateDraft} />
            ) : null}
            {activeOffer.category === "transport" ? (
              <TransportFields draft={draft} offerId={activeOffer.id} onChange={updateDraft} />
            ) : null}
            {activeOffer.category === "rental" ? (
              <RentalFields draft={draft} onChange={updateDraft} />
            ) : null}
            {activeOffer.category === "dining" ? (
              <DiningFields draft={draft} onChange={updateDraft} />
            ) : null}
            {activeOffer.category === "activity" ? (
              <ActivityFields draft={draft} onChange={updateDraft} />
            ) : null}

            <label className="block">
              <span className="text-sm font-semibold text-ink">요청사항 (선택)</span>
              <textarea
                className="mt-2 w-full rounded-2xl border border-pine/10 bg-paper px-4 py-3 text-sm text-ink outline-none"
                onChange={(event) => updateDraft("note", event.target.value)}
                placeholder="알레르기, 좌석 요청, 픽업 메모 등"
                rows={2}
                value={draft.note ?? ""}
              />
            </label>

            {error ? <p className="text-sm font-medium text-pine">{error}</p> : null}

            <div className="rounded-xl border border-pine/10 bg-paper px-4 py-3 text-sm text-stone">
              <span className="font-semibold text-ink">예약 요약</span>
              <p className="mt-1 text-ink">{buildOfferBookingSummary(activeOffer, draft)}</p>
            </div>
          </>
        ) : null}
      </div>
    </BottomSheet>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="mt-2 flex items-center gap-3 rounded-2xl border border-pine/10 bg-paper px-4 py-3">
        <CalendarDays aria-hidden="true" className="size-4 text-pine" />
        <input
          className="w-full bg-transparent text-sm font-medium text-ink outline-none"
          onChange={(event) => onChange(event.target.value)}
          type="date"
          value={value}
        />
      </div>
    </label>
  );
}

function CounterField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-pine/10 bg-paper px-4 py-4">
      <p className="text-sm font-semibold text-ink">{label}</p>
      <div className="flex items-center gap-3">
        <button
          className="flex size-9 items-center justify-center rounded-full bg-pine/8 text-pine"
          onClick={() => onChange(Math.max(1, value - 1))}
          type="button"
        >
          <Minus aria-hidden="true" className="size-4" />
        </button>
        <span className="w-7 text-center text-lg font-semibold">{value}</span>
        <button
          className="flex size-9 items-center justify-center rounded-full bg-pine text-ivory"
          onClick={() => onChange(value + 1)}
          type="button"
        >
          <Plus aria-hidden="true" className="size-4" />
        </button>
      </div>
    </div>
  );
}

function StayFields({
  draft,
  onChange,
}: {
  draft: OfferBookingDraft;
  onChange: <K extends keyof OfferBookingDraft>(key: K, value: OfferBookingDraft[K]) => void;
}) {
  return (
    <section className="space-y-4">
      <DateField label="체크인" onChange={(value) => onChange("date", value)} value={draft.date} />
      <DateField
        label="체크아웃"
        onChange={(value) => onChange("checkOutDate", value)}
        value={draft.checkOutDate ?? ""}
      />
      <CounterField label="숙박 인원" onChange={(value) => onChange("guests", value)} value={draft.guests} />
      <div>
        <p className="text-sm font-semibold text-ink">객실 타입</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {roomTypes.map((room) => (
            <PreferenceChip
              key={room}
              onClick={() => onChange("roomType", room)}
              selected={draft.roomType === room}
            >
              {room}
            </PreferenceChip>
          ))}
        </div>
      </div>
    </section>
  );
}

function TransportFields({
  draft,
  offerId,
  onChange,
}: {
  draft: OfferBookingDraft;
  offerId: string;
  onChange: <K extends keyof OfferBookingDraft>(key: K, value: OfferBookingDraft[K]) => void;
}) {
  const times = offerId.includes("ktx") ? ktxTimes : shuttleTimes;

  return (
    <section className="space-y-4">
      <DateField label="이용 날짜" onChange={(value) => onChange("date", value)} value={draft.date} />
      <div>
        <p className="text-sm font-semibold text-ink">구간</p>
        <div className="mt-3">
          <SelectionGrid
            columns={2}
            onChange={(value) => onChange("transportDirection", value)}
            options={[
              { id: "one-way", label: "편도" },
              { id: "round-trip", label: "왕복" },
            ]}
            value={draft.transportDirection ?? "one-way"}
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">출발 시간</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {times.map((time) => (
            <PreferenceChip
              key={time}
              onClick={() => onChange("timeSlot", time)}
              selected={draft.timeSlot === time}
            >
              {time}
            </PreferenceChip>
          ))}
        </div>
      </div>
      <CounterField label="승객 수" onChange={(value) => onChange("guests", value)} value={draft.guests} />
    </section>
  );
}

function RentalFields({
  draft,
  onChange,
}: {
  draft: OfferBookingDraft;
  onChange: <K extends keyof OfferBookingDraft>(key: K, value: OfferBookingDraft[K]) => void;
}) {
  const locations = ["삼척역 픽업", "동해시 픽업", "장호항 픽업"];

  return (
    <section className="space-y-4">
      <DateField label="픽업 날짜" onChange={(value) => onChange("date", value)} value={draft.date} />
      <div>
        <p className="text-sm font-semibold text-ink">픽업 시간</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pickupTimes.map((time) => (
            <PreferenceChip
              key={time}
              onClick={() => onChange("timeSlot", time)}
              selected={draft.timeSlot === time}
            >
              {time}
            </PreferenceChip>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold text-ink">픽업 장소</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {locations.map((location) => (
            <PreferenceChip
              key={location}
              onClick={() => onChange("pickupLocation", location)}
              selected={draft.pickupLocation === location}
            >
              {location}
            </PreferenceChip>
          ))}
        </div>
      </div>
      <DateField
        label="반납 날짜"
        onChange={(value) => onChange("returnDate", value)}
        value={draft.returnDate ?? ""}
      />
    </section>
  );
}

function DiningFields({
  draft,
  onChange,
}: {
  draft: OfferBookingDraft;
  onChange: <K extends keyof OfferBookingDraft>(key: K, value: OfferBookingDraft[K]) => void;
}) {
  return (
    <section className="space-y-4">
      <DateField label="방문 날짜" onChange={(value) => onChange("date", value)} value={draft.date} />
      <div>
        <p className="text-sm font-semibold text-ink">방문 시간</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {diningTimes.map((time) => (
            <PreferenceChip
              key={time}
              onClick={() => onChange("timeSlot", time)}
              selected={draft.timeSlot === time}
            >
              {time}
            </PreferenceChip>
          ))}
        </div>
      </div>
      <CounterField
        label="방문 인원"
        onChange={(value) => onChange("partySize", value)}
        value={draft.partySize ?? draft.guests}
      />
    </section>
  );
}

function ActivityFields({
  draft,
  onChange,
}: {
  draft: OfferBookingDraft;
  onChange: <K extends keyof OfferBookingDraft>(key: K, value: OfferBookingDraft[K]) => void;
}) {
  return (
    <section className="space-y-4">
      <DateField label="체험 날짜" onChange={(value) => onChange("date", value)} value={draft.date} />
      <div>
        <p className="text-sm font-semibold text-ink">체험 회차</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {activitySessions.map((session) => (
            <PreferenceChip
              key={session}
              onClick={() => onChange("sessionSlot", session)}
              selected={draft.sessionSlot === session}
            >
              {session}
            </PreferenceChip>
          ))}
        </div>
      </div>
      <CounterField
        label="참가 인원"
        onChange={(value) => onChange("partySize", value)}
        value={draft.partySize ?? draft.guests}
      />
    </section>
  );
}
