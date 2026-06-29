"use client";

import { useEffect, useState } from "react";
import { Lock } from "lucide-react";
import { getTravelZonesWithHeroes } from "@/data/zoneHeroImages";
import { subscribeCatalog } from "@/lib/catalogRuntime";
import { isTravelZoneAvailable } from "@/lib/gangwonZoneAvailability";
import type { TravelZoneId } from "@/types/travel";
import { ZoneHeroMedia } from "@/components/travel/ZoneHeroMedia";
import { cn } from "@/lib/utils";

interface TravelZonePickerProps {
  selected: TravelZoneId;
  onSelect: (zoneId: TravelZoneId) => void;
  onLockedAttempt?: (zoneLabel: string) => void;
  className?: string;
}

export function TravelZonePicker({
  selected,
  onSelect,
  onLockedAttempt,
  className,
}: TravelZonePickerProps) {
  const [catalogRevision, setCatalogRevision] = useState(0);

  useEffect(() => subscribeCatalog(() => setCatalogRevision((value) => value + 1)), []);

  const zones = getTravelZonesWithHeroes();

  return (
    <div className={className}>
      <div className="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
        {zones.map((zone) => {
          const isSelected = zone.id === selected;
          const isLocked = !isTravelZoneAvailable(zone.id);

          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  onLockedAttempt?.(zone.label);
                }
                onSelect(zone.id);
              }}
              className={cn(
                "min-w-[140px] shrink-0 rounded-2xl border p-2.5 text-left transition-[border-color,box-shadow,transform]",
                isSelected
                  ? "border-pine shadow-[0_0_0_3px_rgba(47,74,58,0.12)]"
                  : "border-pine/10 bg-paper",
                isLocked && !isSelected && "opacity-85",
                "active:scale-[0.99]",
              )}
            >
              <ZoneHeroMedia
                gradient={zone.gradient}
                heightClassName="h-[4.5rem]"
                imageAlt={zone.label}
                imageUrl={zone.imageUrl}
                overlay
              />
              <div className="mt-2 flex items-start justify-between gap-1 px-0.5">
                <p className="text-sm font-semibold text-ink">{zone.label}</p>
                {isLocked ? (
                  <Lock className="h-3.5 w-3.5 shrink-0 text-stone" aria-hidden />
                ) : null}
              </div>
              <p className="px-0.5 text-[11px] text-stone">{zone.intent}</p>
              <p className="mt-1 px-0.5 text-[10px] font-medium text-pine">
                {isLocked ? "불러오는 중" : "실행 가능"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
