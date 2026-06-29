"use client";

import { Heart } from "lucide-react";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { cn } from "@/lib/utils";
import { getPlaceCategoryLabel } from "@/lib/placeLabels";
import { useTripStore } from "@/stores/tripStore";
import type { Place } from "@/types/travel";

interface PlaceListCardProps {
  place: Place;
  onOpen?: (placeId: string) => void;
  onToggleSave?: () => void;
  onRequireLogin?: () => void;
}

export function PlaceListCard({ place, onOpen, onToggleSave, onRequireLogin }: PlaceListCardProps) {
  const isSaved = useTripStore((state) => state.savedPlaceIds.includes(place.id));
  const toggleSavedPlace = useTripStore((state) => state.toggleSavedPlace);

  function handleToggle() {
    const ok = toggleSavedPlace(place.id);
    if (!ok) {
      onRequireLogin?.();
      return;
    }
    onToggleSave?.();
  }

  return (
    <article className="flex gap-3 rounded-xl border border-pine/10 bg-paper p-3 shadow-[var(--shadow-card)]">
      <button
        className="flex min-w-0 flex-1 gap-3 text-left"
        onClick={() => onOpen?.(place.id)}
        type="button"
      >
        <PlaceThumbnail className="shrink-0 rounded-lg" place={place} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-ink">{place.name}</h3>
              <p className="mt-0.5 text-xs text-stone">
                {getPlaceCategoryLabel(place.category)} · {place.estimatedDuration}
              </p>
            </div>
          </div>
          <p className="mt-2 line-clamp-2 text-xs leading-5 text-stone">{place.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {place.partner ? (
              <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[10px] font-semibold text-pine">
                제휴
              </span>
            ) : null}
            {place.reservationRequired ? (
              <span className="rounded-full bg-pine/10 px-2 py-0.5 text-[10px] font-semibold text-pine">
                예약 필요
              </span>
            ) : null}
          </div>
        </div>
      </button>
      <button
        aria-label={isSaved ? `${place.name} 찜 해제` : `${place.name} 찜`}
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full self-start",
          isSaved ? "bg-pine text-ivory" : "bg-ivory text-stone",
        )}
        onClick={handleToggle}
        type="button"
      >
        <Heart
          aria-hidden="true"
          className={cn("size-4", isSaved && "fill-current")}
        />
      </button>
    </article>
  );
}
