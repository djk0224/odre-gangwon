"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { PlaceThumbnail } from "@/components/travel/PlaceThumbnail";
import { CrowdBadge } from "@/components/ui/CrowdBadge";
import { TravelCardChip } from "@/components/ui/TravelCard";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import { cn } from "@/lib/utils";
import { getPlaceCategoryLabel } from "@/lib/placeLabels";
import type { ItineraryDay, ItineraryStop } from "@/types/travel";

interface ItineraryEditStopRowProps {
  stop: ItineraryStop;
  order: number;
  showDayToggle: boolean;
  itineraryDays: ItineraryDay[];
  selected?: boolean;
  onSelect?: () => void;
  onRemove: (stopId: string) => void;
  onDayChange: (stopId: string, day: ItineraryDay) => void;
}

export function ItineraryEditStopRow({
  stop,
  order,
  showDayToggle,
  itineraryDays,
  selected = false,
  onSelect,
  onRemove,
  onDayChange,
}: ItineraryEditStopRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const dayIndex = itineraryDays.indexOf(stop.day);
  const nextDay: ItineraryDay =
    dayIndex >= 0
      ? itineraryDays[(dayIndex + 1) % itineraryDays.length]
      : itineraryDays[0] ?? 1;
  const place = getCatalogPlaceById(stop.placeId);

  return (
    <article
      className={cn(
        "relative flex gap-2 rounded-[var(--radius-card)] border bg-paper p-3 shadow-[var(--shadow-card)] transition-shadow",
        isDragging && "z-10 opacity-90 ring-2 ring-pine/20",
        onSelect ? "cursor-pointer" : "",
        selected ? "border-pine ring-2 ring-pine/25" : "border-pine/10",
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
      ref={setNodeRef}
      role={onSelect ? "button" : undefined}
      style={style}
      tabIndex={onSelect ? 0 : undefined}
    >
      <button
        aria-label={`${stop.placeName} 순서 변경`}
        className="mt-1 flex size-8 shrink-0 touch-none items-center justify-center rounded-lg text-stone"
        onClick={(event) => event.stopPropagation()}
        type="button"
        {...attributes}
        {...listeners}
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>

      {place ? (
        <PlaceThumbnail
          className="shrink-0 rounded-xl"
          heightClassName="size-14"
          place={place}
        />
      ) : null}

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-medium text-stone">
              {order}. {getPlaceCategoryLabel(stop.category)} · Day {stop.day}
            </p>
            <h3 className="text-base font-semibold text-ink">{stop.placeName}</h3>
          </div>
          <button
            aria-label={`${stop.placeName} 삭제`}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-stone hover:bg-pine/8 hover:text-pine"
            onClick={(event) => {
              event.stopPropagation();
              onRemove(stop.id);
            }}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {showDayToggle ? (
            <button
              className="rounded-lg border border-pine/15 px-2 py-1.5 text-xs font-medium text-pine"
              onClick={(event) => {
                event.stopPropagation();
                onDayChange(stop.id, nextDay);
              }}
              type="button"
            >
              Day {nextDay}로 이동
            </button>
          ) : null}

          {stop.reservationRequired ? (
            <TravelCardChip tone="accent">예약 필요</TravelCardChip>
          ) : null}
          {stop.partner ? <TravelCardChip tone="neutral">제휴</TravelCardChip> : null}
        </div>

        {stop.crowdLevel ? (
          <CrowdBadge
            level={stop.crowdLevel}
            wait={stop.expectedWait}
            confidence={stop.crowdConfidence}
            compact
          />
        ) : null}

        {stop.movementNote ? (
          <p className="text-xs font-medium text-pine">{stop.movementNote}</p>
        ) : null}
      </div>
    </article>
  );
}
