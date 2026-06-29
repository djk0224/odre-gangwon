"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import {
  TravelCardList,
  TravelCardRow,
  TravelCardSelectIndicator,
} from "@/components/ui/TravelCard";
import { generateCrowdGuidanceForPlace } from "@/services/aiRecommendationService";
import { getRemainingSeats, getReservationRate } from "@/services/crowdService";
import type { ReservationSlot } from "@/types/travel";

interface ReservationSlotPickerProps {
  slots: ReservationSlot[];
  selectedSlotId?: string;
  disabled?: boolean;
  placeId?: string;
  onSelectSlot: (slotId: string) => void;
}

export function ReservationSlotPicker({
  slots,
  selectedSlotId,
  disabled = false,
  placeId,
  onSelectSlot,
}: ReservationSlotPickerProps) {
  const [crowdSummary, setCrowdSummary] = useState("");
  const [recommendedSlotId, setRecommendedSlotId] = useState<string | undefined>();
  const didAutoSelectRef = useRef(false);

  useEffect(() => {
    if (!placeId) return;
    didAutoSelectRef.current = false;

    let cancelled = false;
    generateCrowdGuidanceForPlace(placeId)
      .then((result) => {
        if (cancelled) return;
        setCrowdSummary(result.summary);
        setRecommendedSlotId(result.recommendedSlotId);
        if (result.recommendedSlotId && !didAutoSelectRef.current && !selectedSlotId) {
          didAutoSelectRef.current = true;
          onSelectSlot(result.recommendedSlotId);
        }
      })
      .catch(() => {
        if (!cancelled) setCrowdSummary("");
      });

    return () => {
      cancelled = true;
    };
  }, [placeId, onSelectSlot, selectedSlotId]);

  return (
    <div className="space-y-3">
      {crowdSummary ? (
        <p className="flex items-start gap-1.5 rounded-xl bg-pine/6 px-3 py-2.5 text-xs leading-5 text-ink">
          <Sparkles aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-pine" />
          {crowdSummary}
        </p>
      ) : null}
      <TravelCardList>
        {slots.map((slot) => {
          const remaining = getRemainingSeats(slot);
          const selected = selectedSlotId === slot.id;
          const aiRecommended = recommendedSlotId === slot.id;

          return (
            <button
              className="w-full text-left disabled:cursor-default"
              disabled={disabled}
              key={slot.id}
              onClick={() => onSelectSlot(slot.id)}
              type="button"
            >
              <TravelCardRow
                description={`잔여 ${remaining}석 · 예약률 ${getReservationRate(slot)}%${
                  aiRecommended ? " · AI 추천" : ""
                }`}
                meta={<CrowdBadge level={slot.crowdLevel} wait={slot.expectedWait} compact />}
                selected={selected}
                time={slot.time}
                title={slot.label}
                trailing={
                  <TravelCardSelectIndicator disabled={disabled} selected={selected || disabled} />
                }
              />
            </button>
          );
        })}
      </TravelCardList>
    </div>
  );
}
