"use client";

import { Store, Ticket } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardChip } from "@/components/ui/TravelCard";
import { cn } from "@/lib/utils";
import type { ItineraryTimelineItem } from "@/types/travel";

interface LocalRouteOfferCardProps {
  item: ItineraryTimelineItem;
  claimed: boolean;
  onClaim: (offerId: string) => void;
  onViewWallet?: () => void;
}

const categoryLabel = {
  market: "전통시장",
  cafe: "로컬 카페",
  restaurant: "맛집",
} as const;

export function LocalRouteOfferCard({
  item,
  claimed,
  onClaim,
  onViewWallet,
}: LocalRouteOfferCardProps) {
  const offer = item.localOffer;
  if (!offer) return null;

  return (
    <article className="relative rounded-[var(--radius-card)] border border-sand bg-[linear-gradient(135deg,#f8f5ee_0%,#e8ddc8_100%)] p-3 shadow-[var(--shadow-card)]">
      <div className="absolute -left-[1.35rem] top-4 flex size-7 items-center justify-center rounded-full bg-sand text-pine">
        <Store className="size-3.5" strokeWidth={2} />
      </div>
      <div className="flex gap-3">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-pine/10 text-pine">
          <Ticket className="size-5" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pine">
                경로 주변 로컬
              </p>
              <h3 className="mt-0.5 text-base font-semibold text-ink">{item.title}</h3>
            </div>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-stone">{item.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <TravelCardChip tone="accent">{categoryLabel[offer.category]}</TravelCardChip>
            <TravelCardChip>{offer.couponLabel}</TravelCardChip>
            <TravelCardChip tone="neutral">{offer.discount}</TravelCardChip>
            <TravelCardChip>{item.duration}</TravelCardChip>
          </div>
          {claimed ? (
            <div className="mt-3 flex gap-2">
              <PremiumButton className="flex-1" disabled variant="ghost">
                저장됨
              </PremiumButton>
              {onViewWallet ? (
                <PremiumButton className="flex-1" onClick={onViewWallet} variant="pine">
                  보관함
                </PremiumButton>
              ) : null}
            </div>
          ) : (
            <PremiumButton className="mt-3 w-full" onClick={() => onClaim(offer.id)} variant="pine">
              경로 쿠폰 받기
            </PremiumButton>
          )}
        </div>
      </div>
    </article>
  );
}
