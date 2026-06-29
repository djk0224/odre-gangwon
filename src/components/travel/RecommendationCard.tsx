"use client";

import { Heart, MapPin, X } from "lucide-react";
import { TravelCardButton, TravelCardMedia, travelCardClass } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { SelectionIntent } from "@/types/travel";

interface RecommendationCardProps {
  placeId: string;
  title: string;
  emotionLine: string;
  badges: string[];
  gradient?: string;
  imageUrl?: string;
  selectionIntent?: SelectionIntent | null;
  onMustGo: () => void;
  onLike: () => void;
  onSkip: () => void;
  onOpenDetail?: () => void;
}

export function RecommendationCard({
  title,
  emotionLine,
  badges,
  gradient,
  imageUrl,
  selectionIntent = null,
  onMustGo,
  onLike,
  onSkip,
  onOpenDetail,
}: RecommendationCardProps) {
  const isMustGo = selectionIntent === "must_go";
  const isInterested = selectionIntent === "interested";

  return (
    <TravelCardButton onClick={onOpenDetail} selected={Boolean(selectionIntent && selectionIntent !== "exclude")}>
      <TravelCardMedia
        gradient={gradient ?? "from-pine-deep via-pine to-mist"}
        imageUrl={imageUrl}
        className="rounded-t-[var(--radius-card)]"
        imageAlt={title}
      />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-base font-semibold text-ink">{title}</p>
          {isMustGo ? (
            <span className="shrink-0 rounded-full bg-pine px-2 py-0.5 text-[10px] font-semibold text-ivory">
              꼭 갈래요
            </span>
          ) : isInterested ? (
            <span className="shrink-0 rounded-full bg-pine/10 px-2 py-0.5 text-[10px] font-semibold text-pine">
              가고 싶어요
            </span>
          ) : null}
        </div>
        <p className={travelCardClass.subtitle}>{emotionLine}</p>
        <div className="flex flex-wrap gap-1.5">
          {badges.slice(0, 3).map((badge) => (
            <span className="rounded-full bg-pine/8 px-2.5 py-1 text-[11px] font-medium text-pine" key={badge}>
              #{badge}
            </span>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-full border py-2 text-xs font-semibold",
              isMustGo
                ? "border-pine bg-pine text-ivory"
                : "border-pine/15 text-pine",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onMustGo();
            }}
            type="button"
          >
            <MapPin className="size-3.5" />
            꼭 갈래요
          </button>
          <button
            className={cn(
              "flex flex-1 items-center justify-center gap-1 rounded-full border py-2 text-xs font-semibold",
              isInterested
                ? "border-pine bg-pine/10 text-pine"
                : "border-pine/15 text-pine",
            )}
            onClick={(event) => {
              event.stopPropagation();
              onLike();
            }}
            type="button"
          >
            <Heart className={cn("size-3.5", isInterested && "fill-current")} />
            가고 싶어요
          </button>
          <button
            className="flex items-center justify-center rounded-full border border-pine/12 px-3 text-xs text-stone"
            onClick={(event) => {
              event.stopPropagation();
              onSkip();
            }}
            type="button"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </TravelCardButton>
  );
}
