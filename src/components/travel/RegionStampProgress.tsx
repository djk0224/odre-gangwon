"use client";

import { useEffect, useState } from "react";
import { stampMilestones } from "@/data/mockRegionalFraming";
import { getTravelZonesWithHeroes } from "@/data/zoneHeroImages";
import { subscribeCatalog } from "@/lib/catalogRuntime";
import { isTravelZoneAvailable } from "@/lib/gangwonZoneAvailability";
import type { TravelZoneId } from "@/types/travel";
import { ZoneHeroMedia } from "@/components/travel/ZoneHeroMedia";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";

interface RegionStampProgressProps {
  stampedZoneIds: TravelZoneId[];
  collectedAtByZone: Partial<Record<TravelZoneId, string>>;
  claimedMilestoneCounts: number[];
  activeZoneId?: TravelZoneId;
  onClaimMilestone: (milestoneCount: number) => void;
  className?: string;
}

function formatCollectedDate(iso?: string): string | null {
  if (!iso) return null;
  const parts = iso.slice(0, 10).split("-");
  if (parts.length !== 3) return null;
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(month) || !Number.isFinite(day)) return null;
  return `${month}월 ${day}일`;
}

export function RegionStampProgress({
  stampedZoneIds,
  collectedAtByZone,
  claimedMilestoneCounts,
  activeZoneId,
  onClaimMilestone,
  className,
}: RegionStampProgressProps) {
  const [catalogRevision, setCatalogRevision] = useState(0);

  useEffect(() => subscribeCatalog(() => setCatalogRevision((value) => value + 1)), []);

  const zones = getTravelZonesWithHeroes();
  const count = stampedZoneIds.length;
  const nextMilestone =
    stampMilestones.find((milestone) => milestone.count > count) ?? stampMilestones.at(-1);

  return (
    <TravelCardShell className={className}>
      <div className={travelCardClass.body}>
        <p className={travelCardClass.eyebrow}>강원 권역 스탬프</p>
        <p className="mt-1 text-[17px] font-semibold text-ink">
          {count}개 권역 방문
          {nextMilestone ? ` · 다음 혜택 ${nextMilestone.count}개` : " · 완료"}
        </p>
        <p className="mt-1 text-xs text-stone">
          실행 권역에서 숙소·체험·관광지 등 예약을 확정하면 해당 권역 스탬프가 자동으로
          적립됩니다.
        </p>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5">
          {zones.map((zone) => {
            const stamped = stampedZoneIds.includes(zone.id);
            const isActive = zone.id === activeZoneId;
            const collectedLabel = formatCollectedDate(collectedAtByZone[zone.id]);

            return (
              <div
                className={cn(
                  "min-w-[4.5rem] shrink-0 text-center",
                  stamped ? "opacity-100" : "opacity-75",
                )}
                key={zone.id}
              >
                <ZoneHeroMedia
                  className={cn(
                    "mx-auto w-[4.5rem] rounded-lg",
                    stamped && "ring-2 ring-pine ring-offset-1",
                    isActive && !stamped && "ring-2 ring-pine/40 ring-offset-1",
                  )}
                  gradient={zone.gradient}
                  heightClassName="h-12"
                  imageAlt={zone.label}
                  imageUrl={zone.imageUrl}
                />
                <p className="mt-1 text-[9px] font-semibold text-ink">
                  {zone.label.split("·")[0]?.trim()}
                </p>
                <p className="text-[9px] text-stone">
                  {stamped
                    ? collectedLabel ?? "예약 인증"
                    : isTravelZoneAvailable(zone.id)
                      ? "예약 시 적립"
                      : "준비 중"}
                </p>
              </div>
            );
          })}
        </div>

        <ul className="mt-4 space-y-2">
          {stampMilestones.map((milestone) => {
            const unlocked = count >= milestone.count;
            const claimed = claimedMilestoneCounts.includes(milestone.count);

            return (
              <li
                className={cn(
                  "rounded-xl border px-3 py-2.5",
                  unlocked ? "border-pine/15 bg-pine/5" : "border-pine/8 bg-ivory",
                )}
                key={milestone.count}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p
                      className={cn(
                        "text-sm font-semibold",
                        unlocked ? "text-pine" : "text-ink",
                      )}
                    >
                      {milestone.count}개 권역 → {milestone.reward}
                    </p>
                    <p className="mt-0.5 text-xs text-stone">
                      {claimed
                        ? "보상 수령 완료"
                        : unlocked
                          ? "지금 받을 수 있어요"
                          : `${milestone.count - count}개 더 필요`}
                    </p>
                  </div>
                  {unlocked && !claimed ? (
                    <PremiumButton
                      onClick={() => onClaimMilestone(milestone.count)}
                      variant="ghost"
                    >
                      받기
                    </PremiumButton>
                  ) : null}
                  {claimed ? (
                    <span className="text-xs font-semibold text-pine">완료</span>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </TravelCardShell>
  );
}
