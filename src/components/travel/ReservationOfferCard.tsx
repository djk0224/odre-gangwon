"use client";

import Image from "next/image";
import { Check } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardChip, travelCardClass } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { ReservationOffer } from "@/types/reservationHub";

interface ReservationOfferCardProps {
  offer: ReservationOffer;
  confirmed?: boolean;
  detailSummary?: string;
  paidAmount?: number;
  paymentMethod?: string;
  onBook: () => void;
}

export function ReservationOfferCard({
  offer,
  confirmed = false,
  detailSummary,
  paidAmount,
  paymentMethod,
  onBook,
}: ReservationOfferCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-pine/10 bg-paper shadow-[var(--shadow-card)]">
      <div className="flex gap-3 p-4">
        {offer.imageUrl ? (
          <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-mist">
            <Image
              alt=""
              className="object-cover"
              fill
              sizes="64px"
              src={offer.imageUrl}
              unoptimized
            />
          </div>
        ) : (
          <div className={cn("size-16 shrink-0 rounded-lg bg-gradient-to-br", offer.gradient)} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={travelCardClass.eyebrow}>{offer.subtitle}</p>
              <h3 className="mt-1 text-base font-semibold text-ink">{offer.title}</h3>
            </div>
            {offer.badge ? <TravelCardChip tone="accent">{offer.badge}</TravelCardChip> : null}
          </div>
          <p className={cn("mt-2 line-clamp-2", travelCardClass.subtitle)}>{offer.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-pine">{offer.priceLabel}</span>
            {offer.meta ? <span className={travelCardClass.meta}>{offer.meta}</span> : null}
          </div>
        </div>
      </div>

      {confirmed ? (
        <div className="border-t border-pine/8 px-4 py-3">
          <div className="flex items-start gap-2 text-sm font-medium text-pine">
            <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div>
              <p>예약이 확정되었습니다</p>
              {detailSummary ? (
                <p className="mt-1 text-xs font-normal leading-5 text-stone">{detailSummary}</p>
              ) : null}
              {paidAmount ? (
                <p className="mt-1 text-xs font-normal leading-5 text-stone">
                  결제 {paidAmount.toLocaleString("ko-KR")}원
                  {paymentMethod ? ` · ${paymentMethod}` : ""}
                </p>
              ) : null}
            </div>
          </div>
          <PremiumButton className="mt-3 w-full" onClick={onBook} variant="ghost">
            예약 내역 확인
          </PremiumButton>
        </div>
      ) : (
        <div className="border-t border-pine/8 px-4 py-3">
          <PremiumButton className="w-full" onClick={onBook} variant="ghost">
            {offer.title} 예약하기
          </PremiumButton>
        </div>
      )}
    </article>
  );
}
