import Image from "next/image";
import { ChevronRight, ExternalLink, Route } from "lucide-react";
import type { FeaturedNatureRoadSegment } from "@/services/natureRoadCatalog";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";

interface NatureRoadSegmentCardProps {
  segment: FeaturedNatureRoadSegment;
  onClick: () => void;
}

export function NatureRoadSegmentCard({ segment, onClick }: NatureRoadSegmentCardProps) {
  return (
    <TravelCardShell
      interactive
      className="cursor-pointer text-left"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="relative min-h-[140px] overflow-hidden bg-pine-deep">
        {segment.heroImageUrl ? (
          <Image
            src={segment.heroImageUrl}
            alt={`${segment.title} 대표 이미지`}
            fill
            className="object-cover"
            sizes="(max-width: 430px) 100vw, 430px"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-pine-deep via-pine to-mist" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-pine-deep/90 via-pine-deep/35 to-transparent" />
        <div className="relative flex h-full min-h-[140px] flex-col justify-between p-5 text-ivory">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sand">
                {segment.eyebrow}
              </p>
              <p className="mt-2 text-xl font-semibold leading-snug">{segment.title}</p>
            </div>
            <Route className="h-6 w-6 shrink-0 text-sand/90" strokeWidth={1.5} />
          </div>
          <p className="text-xs text-mist">{segment.phaseLabel}</p>
        </div>
      </div>
      <div className={travelCardClass.body}>
        <ExpandableText className={travelCardClass.subtitle}>
          {segment.description}
        </ExpandableText>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-pine">
          {segment.distanceKm > 0 ? (
            <span className="rounded-full bg-pine/8 px-2.5 py-1">{segment.distanceKm}km</span>
          ) : null}
          <span className="rounded-full bg-pine/8 px-2.5 py-1">{segment.durationLabel}</span>
          <span className="rounded-full bg-pine/8 px-2.5 py-1 line-clamp-1">{segment.routeHint}</span>
        </div>
        <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-pine">
          {segment.executablePlan ? "AI 드라이브 코스 만들기" : "코스 미리보기 · 공식 사이트"}
          <ChevronRight className="h-4 w-4" />
        </p>
        <a
          href={segment.officialUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(event) => event.stopPropagation()}
          className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-stone hover:text-pine"
        >
          공식 코스 보기
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <p className="mt-1 text-[10px] text-stone">{segment.attribution}</p>
      </div>
    </TravelCardShell>
  );
}
