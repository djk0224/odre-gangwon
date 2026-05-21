import { useState } from "react";
import { KakaoRouteMap } from "@/components/travel/KakaoRouteMap";
import type { ItineraryStop } from "@/types/travel";

interface RoutePreviewCardProps {
  stops: ItineraryStop[];
  enableMap?: boolean;
}

export function RoutePreviewCard({ stops, enableMap = false }: RoutePreviewCardProps) {
  const [fallbackReason, setFallbackReason] = useState("");

  return (
    <section className="overflow-hidden rounded-3xl border border-pine/10 bg-paper shadow-[var(--shadow-card)]">
      {enableMap && !fallbackReason ? (
        <KakaoRouteMap stops={stops} onFallback={setFallbackReason} />
      ) : (
        <FallbackRouteGraphic stops={stops} />
      )}
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
          Route Preview
        </p>
        <h3 className="mt-1 text-xl font-semibold text-ink">
          {enableMap && !fallbackReason ? "Kakao Maps 경로 프리뷰" : "지도 fallback 경로 프리뷰"}
        </h3>
        <p className="mt-2 text-sm leading-6 text-stone">
          {fallbackReason
            ? "API 키가 없거나 SDK를 불러오지 못하면 데모가 깨지지 않도록 시각화 경로를 유지합니다."
            : "선택한 장소 좌표를 기준으로 일정 순서와 이동 흐름을 보여줍니다."}
        </p>
      </div>
    </section>
  );
}

function FallbackRouteGraphic({ stops }: { stops: ItineraryStop[] }) {
  return (
    <div className="relative h-56 bg-[linear-gradient(135deg,#d8e3ea_0%,#f8f5ee_48%,#e8ddc8_100%)]">
      <div className="absolute left-8 right-8 top-1/2 h-px -translate-y-1/2 bg-pine/30" />
      {stops.map((stop, index) => (
        <div
          className="absolute flex size-9 items-center justify-center rounded-full border border-pine bg-ivory text-sm font-semibold text-pine shadow-sm"
          key={stop.id}
          style={{
            left: `${14 + index * (72 / Math.max(stops.length - 1, 1))}%`,
            top: `${34 + (index % 2) * 28}%`,
          }}
          title={stop.placeName}
        >
          {stop.order}
        </div>
      ))}
    </div>
  );
}
