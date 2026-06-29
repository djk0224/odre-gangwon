"use client";

import { Check } from "lucide-react";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardChip, travelCardClass } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/travel";

interface PartnerAttractionCardProps {
  place: Place;
  confirmed?: boolean;
  inCurrentItinerary?: boolean;
  onOpenReservation: () => void;
}

export function PartnerAttractionCard({
  place,
  confirmed = false,
  inCurrentItinerary = false,
  onOpenReservation,
}: PartnerAttractionCardProps) {
  return (
    <article className="overflow-hidden rounded-xl border border-pine/10 bg-paper shadow-[var(--shadow-card)]">
      <div className="flex gap-3 p-4">
        <PlaceThumbnail className="shrink-0 rounded-lg" place={place} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className={travelCardClass.eyebrow}>제휴 명소</p>
              <h3 className="mt-1 text-base font-semibold text-ink">{place.name}</h3>
            </div>
            <div className="flex flex-col items-end gap-1">
              <TravelCardChip tone="accent">제휴</TravelCardChip>
              {inCurrentItinerary ? (
                <TravelCardChip tone="accent">이번 일정</TravelCardChip>
              ) : null}
            </div>
          </div>
          <p className={cn("mt-2 line-clamp-2", travelCardClass.subtitle)}>{place.signature}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-pine">시간대 예약</span>
            <span className={travelCardClass.meta}>{place.estimatedDuration}</span>
          </div>
        </div>
      </div>

      {confirmed ? (
        <div className="border-t border-pine/8 px-4 py-3">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-pine">
            <Check aria-hidden="true" className="size-4" />
            예약 완료 · QR 발급됨
          </div>
          <PremiumButton className="w-full" onClick={onOpenReservation} variant="ghost">
            예약·QR 확인
          </PremiumButton>
        </div>
      ) : (
        <div className="border-t border-pine/8 px-4 py-3">
          <PremiumButton className="w-full" onClick={onOpenReservation} variant="ghost">
            {place.name} 예약하기
          </PremiumButton>
        </div>
      )}
    </article>
  );
}
