"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  eyebrow = "Sheet",
  children,
  footer,
  className,
}: BottomSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        aria-label="시트 닫기"
        className="absolute inset-0 bg-ink/40"
        onClick={onClose}
        type="button"
      />
      <div
        className={cn(
          "relative mx-auto flex w-full max-w-[430px] max-h-[min(88vh,720px)] flex-col overflow-hidden rounded-t-3xl bg-ivory shadow-[var(--shadow-soft)] animate-sheet-up",
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex shrink-0 items-start justify-between border-b border-pine/10 px-5 py-4">
          <div className="min-w-0 pr-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">{eyebrow}</p>
            <h2 className="text-lg font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 text-xs text-stone">{subtitle}</p> : null}
          </div>
          <button
            aria-label="닫기"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-stone hover:bg-pine/8"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

        {footer ? (
          <div className="shrink-0 border-t border-pine/10 bg-ivory px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
