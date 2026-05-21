import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(216,227,234,0.68),transparent_32rem),linear-gradient(180deg,#f8f5ee,#eee5d6)] px-0 text-ink sm:px-6 sm:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
