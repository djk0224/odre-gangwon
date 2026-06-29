"use client";

import { ClipboardCheck, Home, Mail, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type BottomNavItem = "home" | "places" | "newsletter" | "reservation" | "care";

const navItems = [
  { id: "home", label: "홈", icon: Home },
  { id: "places", label: "장소", icon: MapPin },
  { id: "newsletter", label: "뉴스레터", icon: Mail },
  { id: "reservation", label: "예약", icon: ClipboardCheck },
  { id: "care", label: "케어", icon: Sparkles },
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
    <nav className="z-30 shrink-0 border-t border-pine/10 bg-ivory/92 px-5 py-3 backdrop-blur pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="grid grid-cols-5 gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = activeItem === item.id;
          return (
            <button
              key={item.id}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium text-stone transition-colors",
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
