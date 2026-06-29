import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  TravelCardButton,
  TravelCardSelectIndicator,
  travelCardClass,
} from "@/components/ui/TravelCard";
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
    <TravelCardButton className={className} selected={selected} type={type} {...props}>
      <div className="flex items-start justify-between gap-4 p-4">
        <div>
          <p className="text-sm font-semibold text-ink">{title}</p>
          {description ? (
            <p className={cn("mt-1", travelCardClass.meta)}>{description}</p>
          ) : null}
        </div>
        <TravelCardSelectIndicator selected={selected} />
      </div>
      {children ? <div className="border-t border-pine/8 px-4 pb-4">{children}</div> : null}
    </TravelCardButton>
  );
}
