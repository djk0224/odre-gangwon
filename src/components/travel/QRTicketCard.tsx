import { QrCode } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { cn } from "@/lib/utils";
import {
  TravelCardShell,
  TravelCardChip,
  travelCardClass,
} from "@/components/ui/TravelCard";
import { canCheckInTicket } from "@/lib/tripExecutionReservation";
import type { QRTicket } from "@/types/travel";

interface QRTicketCardProps {
  ticket: QRTicket;
  onCheckIn?: (ticketId: string) => void;
}

const statusLabel = {
  pending: "발급 대기",
  ready: "입장 준비",
  "checked-in": "입장 완료",
} as const;

export function QRTicketCard({ ticket, onCheckIn }: QRTicketCardProps) {
  const checkInReady = canCheckInTicket(ticket);

  return (
    <TravelCardShell variant="dark">
      <div className="flex items-start justify-between gap-3 p-5 pb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist">
            QR Ticket
          </p>
          <h3 className="mt-1 text-xl font-semibold">{ticket.placeName}</h3>
          <p className="mt-1 text-sm text-mist">{ticket.slotLabel}</p>
        </div>
        <TravelCardChip tone="ink">{statusLabel[ticket.checkInStatus]}</TravelCardChip>
      </div>

      <div className="mx-5 mb-5 flex flex-col items-center rounded-[var(--radius-card)] border border-ivory/12 bg-ivory/8 p-6">
        <div className="flex size-28 items-center justify-center rounded-2xl border border-dashed border-ivory/30 bg-ivory/6">
          <QrCode aria-hidden="true" className="size-16 text-ivory/90" />
        </div>
        <p className="text-xs font-medium text-mist">예약번호</p>
        <p className="mt-1 text-lg font-semibold tracking-[0.12em]">{ticket.reservationNumber}</p>
      </div>

      {checkInReady && onCheckIn ? (
        <div className="border-t border-ivory/10 px-5 py-4">
          <PremiumButton className="w-full" onClick={() => onCheckIn(ticket.id)} variant="ivory">
            입장 확인 (체크인)
          </PremiumButton>
        </div>
      ) : null}

      {ticket.checkInStatus === "checked-in" ? (
        <p className={cn(travelCardClass.subtitle, "px-5 pb-4 text-center text-mist")}>
          입장이 완료되었습니다.
        </p>
      ) : null}
    </TravelCardShell>
  );
}
