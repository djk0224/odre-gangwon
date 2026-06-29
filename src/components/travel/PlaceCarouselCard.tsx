"use client";

import { Heart } from "lucide-react";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { cn } from "@/lib/utils";
import { getPlaceCategoryLabel } from "@/lib/placeLabels";
import { useTripStore } from "@/stores/tripStore";
import type { Place } from "@/types/travel";

interface PlaceCarouselCardProps {
  place: Place;
  widthClassName?: string;
  onOpen?: (placeId: string) => void;
  onToggleSave?: () => void;
}

export function PlaceCarouselCard({
  place,
  widthClassName = "w-[9.5rem]",
  onOpen,
  onToggleSave,
}: PlaceCarouselCardProps) {
  const isSaved = useTripStore((state) => state.savedPlaceIds.includes(place.id));
  const toggleSavedPlace = useTripStore((state) => state.toggleSavedPlace);

  function handleToggle() {
    toggleSavedPlace(place.id);
    onToggleSave?.();
  }

  return (
    <article className={cn("shrink-0 cursor-pointer", widthClassName)}>
      <div
        className="block w-full text-left"
        onClick={() => onOpen?.(place.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen?.(place.id);
          }
        }}
        role="button"
        tabIndex={0}
      >
      <div className="relative overflow-hidden rounded-[var(--radius-card)]">
        <PlaceThumbnail
          className="w-full rounded-none"
          heightClassName="aspect-[4/5] w-full"
          place={place}
        />
        <button
          aria-label={isSaved ? `${place.name} 찜 해제` : `${place.name} 찜`}
          className={cn(
            "absolute right-2 top-2 flex size-7 items-center justify-center rounded-full shadow-sm",
            isSaved ? "bg-pine text-ivory" : "bg-paper/90 text-stone",
          )}
          onClick={(event) => {
            event.stopPropagation();
            handleToggle();
          }}
          type="button"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-3.5", isSaved && "fill-current")}
          />
        </button>
        {place.partner ? (
          <span className="absolute left-2 top-2 rounded-full bg-pine px-2 py-0.5 text-[10px] font-semibold text-ivory">
            제휴
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-ink">{place.name}</h3>
      <p className="mt-0.5 text-xs text-stone">
        {getPlaceCategoryLabel(place.category)} · {place.estimatedDuration}
      </p>
      </div>
    </article>
  );
}
