import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Region } from "@/types/travel";
import { PremiumButton } from "@/components/ui/PremiumButton";

interface RegionCardProps {
  region: Region;
  selected?: boolean;
  onSelect?: (region: Region) => void;
}

export function RegionCard({ region, selected = false, onSelect }: RegionCardProps) {
  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border bg-paper shadow-[var(--shadow-card)]",
        selected ? "border-pine" : "border-pine/10",
      )}
    >
      <div className={cn("h-44 bg-gradient-to-br", region.gradient)} />
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-stone">
              {region.englishName}
            </p>
            <h3 className="mt-1 text-2xl font-semibold text-ink">{region.name}</h3>
          </div>
          <div className="rounded-full bg-pine/10 px-3 py-1 text-xs font-semibold text-pine">
            {region.matchScore}% match
          </div>
        </div>
        <div>
          <p className="text-base font-semibold leading-6 text-pine-deep">
            {region.headline}
          </p>
          <p className="mt-2 text-sm leading-6 text-stone">{region.description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {region.tags.map((tag) => (
            <span
              className="rounded-full bg-pine/7 px-3 py-1 text-xs font-medium text-pine"
              key={tag}
            >
              {tag}
            </span>
          ))}
        </div>
        <PremiumButton
          className="w-full"
          onClick={onSelect ? () => onSelect(region) : undefined}
          variant="ghost"
        >
          지역 큐레이션 보기
          <ArrowUpRight aria-hidden="true" className="ml-2 size-4" />
        </PremiumButton>
      </div>
    </article>
  );
}
