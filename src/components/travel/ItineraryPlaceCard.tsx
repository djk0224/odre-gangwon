import { BedDouble, UtensilsCrossed } from "lucide-react";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import { TravelCardChip, TravelCardMedia } from "@/components/ui/TravelCard";
import { getPlaceDisplayCategory, getPlaceZoneLabel } from "@/lib/placeLabels";
import { cn } from "@/lib/utils";
import type { ItineraryTimelineItem, Place } from "@/types/travel";

export type ItineraryStopMarker = "dining" | "lodging";

interface ItineraryPlaceCardProps {
  item: ItineraryTimelineItem;
  order: number;
  /** 지정 시 번호 대신 식당/숙소 마크 표시 */
  marker?: ItineraryStopMarker | null;
  place?: Place;
  reservationConfirmed?: boolean;
  zoneId?: Place["region"];
  selected?: boolean;
  onSelect?: () => void;
}

const selectionLabel: Partial<Record<NonNullable<ItineraryTimelineItem["selectionState"]>, string>> = {
  fixed: "고정",
  included: "포함",
  suggested: "추천",
  deferred: "이월",
  conflict: "충돌",
  weather_alternative: "날씨대안",
};

export function ItineraryPlaceCard({
  item,
  order,
  marker,
  place,
  reservationConfirmed = false,
  zoneId,
  selected = false,
  onSelect,
}: ItineraryPlaceCardProps) {
  const zoneLabel = getPlaceZoneLabel(place, zoneId);
  const categoryLabel = getPlaceDisplayCategory(place);
  return (
    <article
      className={cn(
        "relative flex gap-3 rounded-[var(--radius-card)] border bg-paper p-3 shadow-[var(--shadow-card)] transition-shadow",
        onSelect ? "cursor-pointer" : "",
        selected
          ? "border-pine ring-2 ring-pine/25"
          : "border-pine/10",
      )}
      onClick={onSelect}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {marker ? (
        <div
          aria-label={marker === "dining" ? "식당" : "숙소"}
          className="absolute -left-5 top-4 flex size-7 items-center justify-center rounded-full border border-pine/25 bg-ivory text-pine"
        >
          {marker === "dining" ? (
            <UtensilsCrossed aria-hidden="true" className="size-3.5" />
          ) : (
            <BedDouble aria-hidden="true" className="size-3.5" />
          )}
        </div>
      ) : (
        <div className="absolute -left-5 top-4 flex size-7 items-center justify-center rounded-full bg-pine text-xs font-bold text-ivory">
          {order}
        </div>
      )}
      {place ? (
        <PlaceThumbnail
          className="shrink-0 rounded-xl"
          heightClassName="size-[4.5rem]"
          place={place}
        />
      ) : (
        <TravelCardMedia
          className="shrink-0 rounded-xl"
          gradient="from-mist via-ivory to-sand"
          heightClassName="size-[4.5rem]"
          imageAlt={item.title}
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-stone">
              {categoryLabel} · {zoneLabel}
            </p>
            <h3 className="mt-0.5 text-base font-semibold text-ink">{item.title}</h3>
          </div>
        </div>
        <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-stone">
          <span className="font-semibold text-pine">추천</span> {item.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <TravelCardChip>{item.duration}</TravelCardChip>
          {item.selectionState ? (
            <TravelCardChip tone={item.selectionState === "deferred" || item.selectionState === "conflict" ? "accent" : "neutral"}>
              {selectionLabel[item.selectionState] ?? "상태"}
            </TravelCardChip>
          ) : null}
          {item.reservationRequired ? (
            reservationConfirmed ? (
              <TravelCardChip tone="neutral">예약 완료</TravelCardChip>
            ) : (
              <TravelCardChip tone="accent">예약 필요</TravelCardChip>
            )
          ) : null}
          {item.partner ? <TravelCardChip tone="neutral">제휴</TravelCardChip> : null}
        </div>
        {item.crowdLevel ? (
          <div className="mt-2">
            <CrowdBadge
              level={item.crowdLevel}
              wait={item.expectedWait}
              confidence={item.crowdConfidence}
              compact
            />
          </div>
        ) : null}
      </div>
    </article>
  );
}
