"use client";

import { CalendarDays, Home, Map, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavItem = "home" | "recommendations" | "saved" | "map";

const navItems = [
  { id: "home", label: "홈", icon: Home },
  { id: "recommendations", label: "추천", icon: Sparkles },
  { id: "saved", label: "일정", icon: CalendarDays },
  { id: "map", label: "지도", icon: Map },
] satisfies Array<{
  id: BottomNavItem;
  label: string;
  icon: typeof Home;
}>;

interface BottomNavProps {
  activeItem: BottomNavItem;
  onNavigate: (item: BottomNavItem) => void;
}

export function BottomNav({ activeItem, onNavigate }: BottomNavProps) {
  return (
    <nav className="absolute inset-x-0 bottom-0 border-t border-pine/10 bg-ivory/92 px-5 py-3 backdrop-blur">
      <div className="grid grid-cols-4 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.id;
          return (
            <button
              key={item.id}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-medium text-stone transition-colors",
                active && "bg-pine text-ivory",
              )}
              onClick={() => onNavigate(item.id)}
              type="button"
            >
              <Icon aria-hidden="true" className="size-4" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
