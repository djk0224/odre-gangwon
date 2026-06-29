"use client";

import { cn } from "@/lib/utils";
import type { ItineraryDay } from "@/types/travel";

export type ItineraryDayFilter = ItineraryDay | "all";

interface DayTabsProps {
  days: ItineraryDay[];
  active: ItineraryDayFilter;
  onChange: (value: ItineraryDayFilter) => void;
  /** 1박2일 등 복수 Day일 때 맨 앞에 「전체」 탭 */
  includeAll?: boolean;
}

export function DayTabs({ days, active, onChange, includeAll = false }: DayTabsProps) {
  const tabs: Array<{ id: ItineraryDayFilter; label: string }> = [
    ...(includeAll ? [{ id: "all" as const, label: "전체" }] : []),
    ...days.map((day) => ({ id: day, label: `Day ${day}` })),
  ];

  return (
    <div className="flex gap-2 overflow-x-auto px-5 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {tabs.map((tab) => {
        const isActive = active === tab.id;
        return (
          <button
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-pine text-ivory"
                : "border border-pine/15 bg-paper text-stone",
            )}
            key={tab.id}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
