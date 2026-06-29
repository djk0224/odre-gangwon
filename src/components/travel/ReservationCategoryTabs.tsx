"use client";

import { reservationHubCategories } from "@/data/mockReservationOffers";
import { cn } from "@/lib/utils";
import type { ReservationHubCategory } from "@/types/reservationHub";

interface ReservationCategoryTabsProps {
  activeCategory: ReservationHubCategory;
  counts: Partial<Record<ReservationHubCategory, number>>;
  onChange: (category: ReservationHubCategory) => void;
}

export function ReservationCategoryTabs({
  activeCategory,
  counts,
  onChange,
}: ReservationCategoryTabsProps) {
  return (
    <div
      className="min-w-0 w-full overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [touch-action:pan-x] [&::-webkit-scrollbar]:hidden"
      role="tablist"
    >
      <div className="inline-flex gap-2 px-5 pb-1">
        {reservationHubCategories.map((category) => {
          const active = activeCategory === category.id;
          const count = counts[category.id] ?? 0;

          return (
            <button
              className={cn(
                "shrink-0 rounded-full px-4 py-2.5 text-left transition-colors",
                active ? "bg-pine text-ivory" : "border border-pine/12 bg-paper text-ink",
              )}
              key={category.id}
              onClick={() => onChange(category.id)}
              role="tab"
              aria-selected={active}
              type="button"
            >
              <span className="block whitespace-nowrap text-sm font-semibold">
                {category.label}
              </span>
              <span
                className={cn(
                  "mt-0.5 block whitespace-nowrap text-[10px]",
                  active ? "text-ivory/80" : "text-stone",
                )}
              >
                {category.description}
                {count > 0 ? ` · ${count}` : ""}
              </span>
            </button>
          );
        })}
        <span aria-hidden="true" className="inline-block w-5 shrink-0" />
      </div>
    </div>
  );
}
