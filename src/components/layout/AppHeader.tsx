"use client";

import { ArrowLeft, CalendarPlus, Menu, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  canGoBack?: boolean;
  showMenuBadge?: boolean;
  onBack?: () => void;
  onHome?: () => void;
  onAiPlan?: () => void;
  onAiChat?: () => void;
  onSearch?: () => void;
  onMenu?: () => void;
}

function HeaderIconButton({
  label,
  icon: Icon,
  onClick,
  showBadge = false,
}: {
  label: string;
  icon: typeof Search;
  onClick?: () => void;
  showBadge?: boolean;
}) {
  return (
    <button
      aria-label={label}
      className="relative flex size-10 items-center justify-center rounded-full text-ink transition-colors hover:bg-pine/8"
      onClick={onClick}
      type="button"
    >
      <Icon aria-hidden="true" className="size-5" strokeWidth={1.75} />
      {showBadge ? (
        <span className="absolute right-2 top-2 size-2 rounded-full bg-[#E85D4C]" />
      ) : null}
    </button>
  );
}

export function AppHeader({
  canGoBack = false,
  showMenuBadge = false,
  onBack,
  onHome,
  onAiPlan,
  onAiChat,
  onSearch,
  onMenu,
}: AppHeaderProps) {
  return (
    <header className="z-20 flex shrink-0 items-center justify-between border-b border-pine/10 bg-ivory/92 px-4 py-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <button
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-full text-ink",
            !canGoBack && "pointer-events-none opacity-0",
          )}
          onClick={onBack}
          type="button"
        >
          <ArrowLeft aria-hidden="true" className="size-5" />
        </button>

        <button className="min-w-0 flex-1 text-center" onClick={onHome} type="button">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pine">
            ODRÉ GANGWON
          </p>
          <p className="text-xs text-stone">오드래강원</p>
        </button>
      </div>

      <div className="flex shrink-0 items-center">
        <HeaderIconButton icon={CalendarPlus} label="AI 계획" onClick={onAiPlan} />
        <HeaderIconButton icon={Sparkles} label="AI 비서" onClick={onAiChat} />
        <HeaderIconButton icon={Search} label="검색" onClick={onSearch} />
        <HeaderIconButton
          icon={Menu}
          label="마이메뉴"
          onClick={onMenu}
          showBadge={showMenuBadge}
        />
      </div>
    </header>
  );
}
