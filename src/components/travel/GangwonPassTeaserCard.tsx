import { ChevronRight, Ticket } from "lucide-react";
import type { ZonePassTeaser } from "@/data/zoneHomeCatalog";
import { TravelCardButton, travelCardClass } from "@/components/ui/TravelCard";

interface GangwonPassTeaserCardProps {
  pass: ZonePassTeaser;
  owned?: boolean;
  passNumber?: string;
  onClick: () => void;
}

export function GangwonPassTeaserCard({
  pass,
  owned = false,
  passNumber,
  onClick,
}: GangwonPassTeaserCardProps) {
  return (
    <TravelCardButton onClick={onClick} className="text-left">
      <div className="flex items-start gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pine/10 text-pine">
          <Ticket className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className={travelCardClass.eyebrow}>강원 혜택 연동</p>
          <p className="mt-1 text-[17px] font-semibold text-ink">{pass.name}</p>
          <p className="mt-1 text-sm text-stone">{pass.subtitle}</p>
          <ul className="mt-2 space-y-0.5 text-xs text-stone">
            {pass.benefits.map((benefit) => (
              <li key={benefit}>· {benefit}</li>
            ))}
          </ul>
          <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-pine">
            {owned
              ? `연동됨${passNumber ? ` · ${passNumber}` : ""} · 혜택 사용`
              : `${pass.priceHint} · 혜택 연동하기`}
            <ChevronRight className="h-4 w-4" />
          </p>
        </div>
      </div>
    </TravelCardButton>
  );
}
