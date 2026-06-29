import { resolveZoneHeroMeta } from "@/data/zoneHeroImages";
import type { TravelZoneId } from "@/types/travel";
import { ZoneHeroMedia } from "@/components/travel/ZoneHeroMedia";

interface ZoneHeroBannerProps {
  zoneId: TravelZoneId;
  label: string;
  intent: string;
  gradient: string;
  executable: boolean;
}

export function ZoneHeroBanner({
  zoneId,
  label,
  intent,
  gradient,
  executable,
}: ZoneHeroBannerProps) {
  const meta = resolveZoneHeroMeta(zoneId);

  return (
    <div className="overflow-hidden rounded-2xl border border-pine/10 bg-paper shadow-[var(--shadow-card)]">
      <ZoneHeroMedia
        gradient={gradient}
        heightClassName="h-36"
        imageAlt={label}
        imageUrl={meta?.imageUrl}
        overlay
      />
      <div className="p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pine">
          {executable ? "실행 가능 권역" : "카탈로그 준비 중"}
        </p>
        <p className="mt-1 text-xl font-semibold text-ink">{label}</p>
        <p className="mt-1 text-sm text-stone">{intent}</p>
        {meta?.placeName ? (
          <p className="mt-2 text-[11px] text-stone/90">
            대표 장소 · {meta.placeName}
          </p>
        ) : null}
      </div>
    </div>
  );
}
