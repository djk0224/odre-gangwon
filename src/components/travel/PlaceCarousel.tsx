import { ChevronRight } from "lucide-react";
import { PlaceCarouselCard } from "@/components/travel/PlaceCarouselCard";
import type { Place } from "@/types/travel";

interface PlaceCarouselProps {
  title: string;
  places: Place[];
  onViewMore?: () => void;
  onOpenPlace?: (placeId: string) => void;
  onToggleSave?: () => void;
}

export function PlaceCarousel({
  title,
  places,
  onViewMore,
  onOpenPlace,
  onToggleSave,
}: PlaceCarouselProps) {
  if (places.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between px-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {onViewMore ? (
          <button
            className="flex items-center gap-0.5 text-xs font-semibold text-stone"
            onClick={onViewMore}
            type="button"
          >
            더보기
            <ChevronRight aria-hidden="true" className="size-3.5" />
          </button>
        ) : null}
      </div>
      <div className="flex gap-3 overflow-x-auto px-5 pb-1 scrollbar-none">
        {places.map((place) => (
          <PlaceCarouselCard
            key={place.id}
            onOpen={onOpenPlace}
            onToggleSave={onToggleSave}
            place={place}
          />
        ))}
      </div>
    </section>
  );
}
