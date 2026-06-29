"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: "sm" | "md";
  onChange?: (value: 1 | 2 | 3 | 4 | 5) => void;
  label?: string;
  className?: string;
}

export function StarRating({
  value,
  max = 5,
  size = "md",
  onChange,
  label = "별점",
  className,
}: StarRatingProps) {
  const interactive = Boolean(onChange);
  const iconClass = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div
      className={cn("inline-flex items-center gap-0.5", className)}
      role={interactive ? "radiogroup" : "img"}
      aria-label={interactive ? label : `${label} ${value}점`}
    >
      {Array.from({ length: max }, (_, index) => {
        const starValue = index + 1;
        const filled = starValue <= Math.round(value);
        return (
          <button
            key={starValue}
            aria-checked={interactive ? value === starValue : undefined}
            aria-label={`${starValue}점`}
            className={cn(
              "rounded p-0.5 transition-colors",
              interactive ? "hover:scale-105" : "pointer-events-none",
              filled ? "text-pine" : "text-stone/35",
            )}
            disabled={!interactive}
            onClick={() => onChange?.(starValue as 1 | 2 | 3 | 4 | 5)}
            role={interactive ? "radio" : undefined}
            type="button"
          >
            <Star
              aria-hidden="true"
              className={cn(iconClass, filled && "fill-pine/25")}
            />
          </button>
        );
      })}
    </div>
  );
}
