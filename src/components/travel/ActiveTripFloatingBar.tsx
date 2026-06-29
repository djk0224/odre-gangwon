import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActiveTripFloatingBarProps {
  title: string;
  eyebrow?: string;
  status?: string;
  onClick?: () => void;
  className?: string;
}

export function ActiveTripFloatingBar({
  title,
  eyebrow = "오늘의 실행 일정",
  status = "실행 중",
  onClick,
  className,
}: ActiveTripFloatingBarProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-2.5 rounded-full border border-pine/12 bg-ivory/95 px-3.5 py-2 text-left shadow-[var(--shadow-soft)] backdrop-blur-sm transition-colors hover:border-pine/20",
        className,
      )}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-pine" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pine">
          {eyebrow}
        </p>
        <p className="truncate text-xs font-semibold text-ink">{title}</p>
      </div>
      <span className="shrink-0 text-[10px] font-medium text-stone">{status}</span>
      <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-stone" />
    </button>
  );
}
