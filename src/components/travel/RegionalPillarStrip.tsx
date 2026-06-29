import { regionalPillars } from "@/data/mockRegionalFraming";
import { cn } from "@/lib/utils";

interface RegionalPillarStripProps {
  variant?: "onboarding" | "compact";
  className?: string;
}

export function RegionalPillarStrip({
  variant = "onboarding",
  className,
}: RegionalPillarStripProps) {
  const isOnboarding = variant === "onboarding";

  return (
    <div
      className={cn(
        "grid w-full grid-cols-5",
        isOnboarding ? "gap-1.5" : "gap-2",
        className,
      )}
    >
      {regionalPillars.map((pillar) => {
        const Icon = pillar.icon;
        return (
          <div
            key={pillar.id}
            className={cn(
              "flex min-w-0 flex-col items-center rounded-2xl border text-center",
              isOnboarding
                ? "border-ivory/12 bg-ivory/6 px-0.5 py-3"
                : "border-pine/10 bg-paper px-1 py-2.5 shadow-[var(--shadow-card)]",
            )}
          >
            <Icon
              className={cn(
                "shrink-0",
                isOnboarding ? "h-4 w-4 text-sand" : "h-3.5 w-3.5 text-pine",
              )}
              strokeWidth={1.75}
            />
            <p
              className={cn(
                "mt-1.5 w-full font-semibold leading-[1.15]",
                isOnboarding
                  ? "text-[9px] text-ivory [word-break:keep-all]"
                  : "text-[10px] text-ink",
              )}
            >
              {pillar.shortLabel}
            </p>
          </div>
        );
      })}
    </div>
  );
}
