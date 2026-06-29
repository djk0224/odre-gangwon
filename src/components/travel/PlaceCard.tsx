import {
  TravelCardMedia,
  TravelCardSelectIndicator,
  TravelCardShell,
  TravelCardChip,
  travelCardClass,
} from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { Place } from "@/types/travel";

interface PlaceCardProps {
  place: Place;
  selected?: boolean;
}

export function PlaceCard({ place, selected = false }: PlaceCardProps) {
  return (
    <TravelCardShell interactive selected={selected}>
      <TravelCardMedia
        gradient={place.gradient}
        heightClassName="h-36"
        imageAlt={place.name}
        imageUrl={place.imageUrl}
      />
      <div className={travelCardClass.body}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-pine">{place.signature}</p>
            <h3 className="mt-1 text-lg font-semibold leading-6 text-ink">{place.name}</h3>
          </div>
          <TravelCardSelectIndicator selected={selected} />
        </div>
        <p className={cn("mt-2", travelCardClass.subtitle)}>{place.recommendationReason}</p>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <TravelCardChip>{place.estimatedDuration}</TravelCardChip>
          {place.reservationRequired ? (
            <TravelCardChip tone="accent">예약 필요</TravelCardChip>
          ) : null}
          {place.partner ? <TravelCardChip tone="neutral">제휴</TravelCardChip> : null}
        </div>
      </div>
    </TravelCardShell>
  );
}
