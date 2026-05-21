import { Check, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/travel";

interface PlaceCardProps {
  place: Place;
  selected?: boolean;
}

export function PlaceCard({ place, selected = false }: PlaceCardProps) {
  return (
    <article
      className={cn(
        "grid grid-cols-[104px_1fr] overflow-hidden rounded-3xl border bg-paper shadow-[var(--shadow-card)]",
        selected ? "border-pine" : "border-pine/10",
      )}
    >
      <div className={cn("min-h-36 bg-gradient-to-br", place.gradient)} />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-stone">{place.signature}</p>
            <h3 className="mt-1 text-lg font-semibold leading-6 text-ink">
              {place.name}
            </h3>
          </div>
          <span
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-full border",
              selected ? "border-pine bg-pine text-ivory" : "border-pine/10 text-transparent",
            )}
          >
            <Check aria-hidden="true" className="size-4" />
          </span>
        </div>
        <p className="text-sm leading-5 text-stone">{place.recommendationReason}</p>
        <div className="flex items-center gap-2 text-xs font-medium text-pine">
          <Clock aria-hidden="true" className="size-3.5" />
          <span>{place.estimatedDuration}</span>
          <span className="text-stone">· {place.distanceNote}</span>
        </div>
      </div>
    </article>
  );
}
