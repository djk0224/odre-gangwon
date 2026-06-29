"use client";

import { X } from "lucide-react";
import { PlaceListCard } from "@/components/travel/PlaceListCard";
import { PremiumButton } from "@/components/ui/PremiumButton";
import type { Place } from "@/types/travel";

interface PlaceBrowseSheetProps {
  open: boolean;
  title: string;
  zoneLabel: string;
  places: Place[];
  onClose: () => void;
  onOpenPlace?: (placeId: string) => void;
  onToggleSave?: () => void;
}

export function PlaceBrowseSheet({
  open,
  title,
  zoneLabel,
  places,
  onClose,
  onOpenPlace,
  onToggleSave,
}: PlaceBrowseSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-4 pb-24 pt-10">
      <div className="max-h-[78vh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-ivory shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-pine/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Explore</p>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            <p className="mt-1 text-xs text-stone">
              {zoneLabel} 권역 {places.length}곳 · 탐색
            </p>
          </div>
          <button
            aria-label="닫기"
            className="flex size-9 items-center justify-center rounded-full text-stone"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <ul className="max-h-[58vh] space-y-2 overflow-y-auto px-5 py-4">
          {places.map((place) => (
            <li key={place.id}>
              <PlaceListCard
                onOpen={onOpenPlace}
                onToggleSave={onToggleSave}
                place={place}
              />
            </li>
          ))}
        </ul>

        <div className="border-t border-pine/10 px-5 py-4">
          <PremiumButton className="w-full" onClick={onClose} variant="ghost">
            닫기
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}
