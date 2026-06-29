import { cn } from "@/lib/utils";
import { getCrowdConfidenceLabel, getCrowdLabel } from "@/services/crowdService";
import type { CrowdConfidence, CrowdLevel } from "@/types/travel";

interface CrowdBadgeProps {
  level: CrowdLevel;
  wait?: string;
  confidence?: CrowdConfidence;
  compact?: boolean;
}

const levelStyles: Record<CrowdLevel, string> = {
  low: "bg-pine/10 text-pine",
  moderate: "bg-mist text-ink",
  high: "bg-sand text-ink",
  "very-high": "bg-ink text-ivory",
};

const confidenceStyles: Record<CrowdConfidence, string> = {
  high: "bg-pine/8 text-pine",
  medium: "bg-mist/80 text-stone",
  low: "border border-pine/12 bg-ivory text-stone",
};

export function CrowdBadge({ level, wait, confidence, compact = false }: CrowdBadgeProps) {
  return (
    <div className={cn("inline-flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      <span
        className={cn(
          "rounded-full px-2.5 py-1 text-[11px] font-semibold",
          levelStyles[level],
        )}
      >
        {getCrowdLabel(level)}
      </span>
      {wait ? (
        <span className={cn("text-[11px] font-medium text-stone", compact && "hidden sm:inline")}>
          대기 {wait}
        </span>
      ) : null}
      {confidence ? (
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
            confidenceStyles[confidence],
          )}
        >
          {getCrowdConfidenceLabel(confidence)}
        </span>
      ) : null}
    </div>
  );
}
