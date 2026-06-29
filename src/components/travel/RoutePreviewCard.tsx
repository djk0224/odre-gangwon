"use client";

import { useState } from "react";
import { KakaoRouteMap } from "@/components/travel/KakaoRouteMap";
import type { Coordinates, ItineraryDay, ItineraryStop } from "@/types/travel";

interface RoutePreviewCardProps {
  stops: ItineraryStop[];
  enableMap?: boolean;
  lodgingAnchorsByDay?: Partial<Record<ItineraryDay, { start?: Coordinates; end?: Coordinates }>>;
  highlightStopId?: string | null;
  onHighlightStop?: (stopId: string) => void;
}

/** 일정 화면 상단 지도 — 방문 동선만 표시 */
export function RoutePreviewCard({
  stops,
  enableMap = false,
  lodgingAnchorsByDay,
  highlightStopId = null,
  onHighlightStop,
}: RoutePreviewCardProps) {
  const [fallbackReason, setFallbackReason] = useState("");

  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] border border-pine/10 bg-paper shadow-[var(--shadow-card)]">
      {enableMap && !fallbackReason ? (
        <KakaoRouteMap
          highlightStopId={highlightStopId}
          lodgingAnchorsByDay={lodgingAnchorsByDay}
          onFallback={setFallbackReason}
          onHighlightStop={onHighlightStop}
          stops={stops}
        />
      ) : (
        <FallbackRouteGraphic highlightStopId={highlightStopId} stops={stops} />
      )}
      {fallbackReason ? (
        <p className="border-t border-pine/8 px-4 py-2 text-[11px] leading-snug text-stone">
          지도를 불러오지 못해 동선 미리보기로 표시합니다.
        </p>
      ) : null}
    </div>
  );
}

function FallbackRouteGraphic({
  stops,
  highlightStopId = null,
}: {
  stops: ItineraryStop[];
  highlightStopId?: string | null;
}) {
  return (
    <div className="relative h-52 bg-[linear-gradient(135deg,#d8e3ea_0%,#f8f5ee_48%,#e8ddc8_100%)]">
      <div className="absolute inset-x-6 top-1/2 h-px -translate-y-1/2 bg-pine/25" />
      {[...stops]
        .sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.order - b.order;
        })
        .map((stop, index) => (
          <div
            className={`absolute flex size-8 items-center justify-center rounded-full text-sm font-bold text-ivory shadow-sm transition-transform ${
              highlightStopId === stop.id
                ? "scale-110 bg-ink ring-2 ring-pine"
                : "bg-pine"
            }`}
            key={stop.id}
            style={{
              left: `${12 + index * (76 / Math.max(stops.length - 1, 1))}%`,
              top: `${32 + (index % 2) * 26}%`,
            }}
            title={stop.placeName}
          >
            {index + 1}
          </div>
        ))}
    </div>
  );
}
