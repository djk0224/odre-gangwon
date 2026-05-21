import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ToggleCardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  title: string;
  description?: string;
  selected?: boolean;
  children?: ReactNode;
}

export function ToggleCard({
  title,
  description,
  selected = false,
  children,
  className,
  type = "button",
  ...props
}: ToggleCardProps) {
  return (
    <button
      className={cn(
        "w-full rounded-2xl border bg-paper p-4 text-left transition-colors",
        selected ? "border-pine shadow-[var(--shadow-card)]" : "border-pine/10 hover:border-pine/30",
        className,
      )}
      type={type}
      {...props}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-stone">{description}</p>
          ) : null}
        </div>
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full border",
            selected ? "border-pine bg-pine text-ivory" : "border-pine/15 text-transparent",
          )}
        >
          <Check aria-hidden="true" className="size-3.5" />
        </span>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </button>
  );
}
