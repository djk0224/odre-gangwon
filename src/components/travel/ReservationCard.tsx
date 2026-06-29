"use client";

import { QRTicketCard } from "@/components/travel/QRTicketCard";
import { ReservationSlotPicker } from "@/components/travel/ReservationSlotPicker";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardChip, TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { Place, QRTicket, ReservationSlot } from "@/types/travel";

export type ReservationCardContext = "hub" | "itinerary";

interface ReservationPlaceCardProps {
  place: Place;
  slots: ReservationSlot[];
  selectedSlotId?: string;
  confirmed?: boolean;
  ticket?: QRTicket;
  context?: ReservationCardContext;
  inCurrentItinerary?: boolean;
  onSelectSlot: (slotId: string) => void;
  onConfirm: () => void;
}

export function ReservationPlaceCard({
  place,
  slots,
  selectedSlotId,
  confirmed = false,
  ticket,
  context = "hub",
  inCurrentItinerary = false,
  onSelectSlot,
  onConfirm,
}: ReservationPlaceCardProps) {
  return (
    <div className="space-y-3">
      <TravelCardShell>
        <div className={cn(travelCardClass.bodyLg, "pb-3")}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className={travelCardClass.eyebrow}>
                {place.partner ? "제휴 명소" : "예약 안내"}
              </p>
              <h3 className="mt-1 text-xl font-semibold text-ink">{place.name}</h3>
              <p className={cn("mt-1", travelCardClass.subtitle)}>{place.signature}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <TravelCardChip tone={place.partner ? "accent" : "neutral"}>
                {place.partner ? "제휴" : "일반"}
              </TravelCardChip>
              {inCurrentItinerary ? (
                <TravelCardChip tone="accent">이번 일정</TravelCardChip>
              ) : null}
            </div>
          </div>
        </div>

        <ReservationSlotPicker
          disabled={confirmed}
          onSelectSlot={onSelectSlot}
          placeId={place.id}
          selectedSlotId={selectedSlotId}
          slots={slots}
        />
      </TravelCardShell>

      {!confirmed ? (
        <PremiumButton className="w-full" onClick={onConfirm}>
          {context === "hub" ? `${place.name} 예약 확정` : `${place.name} 예약 확정`}
        </PremiumButton>
      ) : (
        <p className="text-center text-sm font-medium text-pine">예약 완료 · QR 발급됨</p>
      )}

      {ticket ? <QRTicketCard ticket={ticket} /> : null}
    </div>
  );
}
