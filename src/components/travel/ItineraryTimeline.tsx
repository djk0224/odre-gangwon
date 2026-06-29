import { CrowdBadge } from "@/components/ui/CrowdBadge";
import {
  TravelCardChip,
  TravelCardList,
  TravelCardOrderBadge,
  TravelCardSectionHeader,
  TravelCardShell,
  travelCardClass,
} from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { ItineraryTimelineItem } from "@/types/travel";

interface ItineraryTimelineProps {
  items: ItineraryTimelineItem[];
}

export function ItineraryTimeline({ items }: ItineraryTimelineProps) {
  return (
    <TravelCardShell>
      <TravelCardSectionHeader
        description="방문 순서대로 정리된 실행 일정입니다."
        eyebrow="Itinerary"
        title="오늘의 일정"
      />

      <TravelCardList>
        {items.map((item, index) => (
          <div className="flex gap-3 p-4" key={item.id}>
            <TravelCardOrderBadge order={index + 1} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className={travelCardClass.title}>{item.title}</h4>
              </div>
              <p className={cn("mt-1", travelCardClass.subtitle)}>{item.description}</p>
              <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                <TravelCardChip>{item.duration}</TravelCardChip>
                {item.travelLegToNext ? (
                  <TravelCardChip tone="neutral">{item.travelLegToNext}</TravelCardChip>
                ) : null}
                {item.reservationRequired ? (
                  <TravelCardChip tone="accent">예약 필요</TravelCardChip>
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
          </div>
        ))}
      </TravelCardList>
    </TravelCardShell>
  );
}
