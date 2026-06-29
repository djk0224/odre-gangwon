import { ArrowUpRight } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import {
  TravelCardMedia,
  TravelCardShell,
  TravelCardChip,
  travelCardClass,
} from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { Region } from "@/types/travel";

interface RegionCardProps {
  region: Region;
  selected?: boolean;
  onSelect?: (region: Region) => void;
}

export function RegionCard({ region, selected = false, onSelect }: RegionCardProps) {
  return (
    <TravelCardShell interactive selected={selected}>
      <TravelCardMedia gradient={region.gradient} heightClassName="h-44" />
      <div className={travelCardClass.bodyLg}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className={travelCardClass.eyebrow}>{region.englishName}</p>
            <h3 className="mt-1 text-2xl font-semibold text-ink">{region.name}</h3>
          </div>
          <TravelCardChip tone="accent">MVP</TravelCardChip>
        </div>
        <p className="mt-3 text-base font-semibold leading-6 text-pine-deep">{region.headline}</p>
        <p className={cn("mt-2", travelCardClass.subtitle)}>{region.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {region.tags.map((tag) => (
            <TravelCardChip key={tag}>{tag}</TravelCardChip>
          ))}
        </div>
        <PremiumButton
          className="mt-5 w-full"
          onClick={onSelect ? () => onSelect(region) : undefined}
          variant="ghost"
        >
          지역 보기
          <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
        </PremiumButton>
      </div>
    </TravelCardShell>
  );
}
