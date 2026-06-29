"use client";

import { X } from "lucide-react";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { getPlaceCategoryLabel } from "@/lib/placeLabels";
import { cn } from "@/lib/utils";
import type { ItineraryDay, Place } from "@/types/travel";

interface AddPlaceSheetProps {
  day: ItineraryDay;
  open: boolean;
  places: Place[];
  onAdd: (place: Place) => void;
  onClose: () => void;
}

export function AddPlaceSheet({ day, open, places, onAdd, onClose }: AddPlaceSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-4 pb-24 pt-10">
      <div className="max-h-[70vh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-ivory shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-pine/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Add Place</p>
            <h2 className="text-lg font-semibold text-ink">Day {day} 장소 추가</h2>
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

        <ul className="max-h-[52vh] space-y-2 overflow-y-auto px-5 py-4">
          {places.length === 0 ? (
            <li className="rounded-xl border border-pine/10 bg-paper p-4 text-sm text-stone">
              추가할 수 있는 장소가 없습니다.
            </li>
          ) : (
            places.map((place) => (
              <li key={place.id}>
                <button
                  className="flex w-full items-center gap-3 rounded-xl border border-pine/10 bg-paper p-3 text-left"
                  onClick={() => onAdd(place)}
                  type="button"
                >
                  <PlaceThumbnail
                    className="shrink-0 rounded-lg"
                    heightClassName="size-12"
                    place={place}
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{place.name}</p>
                    <p className="text-xs text-stone">
                      {getPlaceCategoryLabel(place.category)} · {place.estimatedDuration}
                    </p>
                  </div>
                </button>
              </li>
            ))
          )}
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
