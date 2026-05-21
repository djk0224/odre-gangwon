import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "pine" | "ivory" | "ghost";

interface PremiumButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  pine: "bg-pine text-ivory shadow-[0_12px_28px_rgba(47,74,58,0.22)] hover:bg-pine-deep",
  ivory: "bg-ivory text-pine-deep shadow-[0_12px_28px_rgba(0,0,0,0.16)] hover:bg-paper",
  ghost: "border border-pine/20 bg-transparent text-pine hover:bg-pine/5",
};

export function PremiumButton({
  children,
  className,
  variant = "pine",
  type = "button",
  ...props
}: PremiumButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex min-h-12 items-center justify-center rounded-2xl px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        variantClass[variant],
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
