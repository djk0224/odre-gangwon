"use client";

import { cn } from "@/lib/utils";

interface ReservationSummaryBarProps {
  bookableCount: number;
  confirmedCount: number;
  pendingCount: number;
  qrCount: number;
  onClick?: () => void;
}

export function ReservationSummaryBar({
  bookableCount,
  confirmedCount,
  pendingCount,
  qrCount,
  onClick,
}: ReservationSummaryBarProps) {
  const content =
    confirmedCount === 0 ? (
      <>
        <span className="font-semibold text-ink">제휴 {bookableCount}곳</span>
        <span className="text-stone"> · 시간대를 선택해 예약하세요</span>
      </>
    ) : pendingCount > 0 ? (
      <>
        <span className="font-semibold text-pine">확정 {confirmedCount}</span>
        <span className="text-stone"> · 예약 대기 {pendingCount}</span>
        {qrCount > 0 ? <span className="text-stone"> · QR {qrCount}</span> : null}
      </>
    ) : (
      <>
        <span className="font-semibold text-pine">예약 완료</span>
        {qrCount > 0 ? <span className="text-stone"> · QR {qrCount}장</span> : null}
      </>
    );

  if (onClick) {
    return (
      <button
        className="w-full rounded-xl border border-pine/10 bg-paper px-4 py-3 text-left text-sm"
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <div className={cn("rounded-xl border border-pine/10 bg-paper px-4 py-3 text-sm")}>
      {content}
    </div>
  );
}
