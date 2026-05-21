import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PreferenceChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  selected?: boolean;
}

export function PreferenceChip({
  children,
  selected = false,
  className,
  type = "button",
  ...props
}: PreferenceChipProps) {
  return (
    <button
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        selected
          ? "border-pine bg-pine text-ivory"
          : "border-pine/15 bg-paper text-ink hover:border-pine/35 hover:bg-pine/5",
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
