import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface MobileFrameProps {
  children: ReactNode;
  className?: string;
}

export function MobileFrame({ children, className }: MobileFrameProps) {
  return (
    <div
      className={cn(
        "relative mx-auto min-h-screen w-full max-w-[430px] overflow-hidden bg-ivory shadow-[var(--shadow-soft)] sm:min-h-[860px] sm:rounded-[2rem] sm:border sm:border-white/70",
        className,
      )}
    >
      {children}
    </div>
  );
}
