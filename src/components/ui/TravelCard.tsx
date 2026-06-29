import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const travelCardClass = {
  shell:
    "overflow-hidden rounded-[var(--radius-card)] border border-pine/10 bg-paper shadow-[var(--shadow-card)]",
  shellDark:
    "overflow-hidden rounded-[var(--radius-card)] bg-pine-deep text-ivory shadow-[var(--shadow-card)]",
  shellInteractive:
    "transition-[border-color,box-shadow,transform] duration-200 active:scale-[0.995]",
  shellSelected: "border-pine shadow-[0_0_0_3px_rgba(47,74,58,0.12)]",
  body: "p-4",
  bodyLg: "p-5",
  eyebrow: "text-[11px] font-semibold uppercase tracking-[0.16em] text-pine",
  title: "text-[17px] font-semibold leading-6 tracking-[-0.01em] text-ink",
  subtitle: "text-sm leading-5 text-stone",
  meta: "text-xs font-medium text-stone",
  divider: "border-t border-pine/8",
} as const;

interface TravelCardShellProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  selected?: boolean;
  interactive?: boolean;
  variant?: "default" | "dark";
  as?: "article" | "section" | "div";
}

export function TravelCardShell({
  children,
  className,
  selected = false,
  interactive = false,
  variant = "default",
  as: Tag = "article",
  ...props
}: TravelCardShellProps) {
  return (
    <Tag
      className={cn(
        variant === "dark" ? travelCardClass.shellDark : travelCardClass.shell,
        interactive && travelCardClass.shellInteractive,
        selected && travelCardClass.shellSelected,
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}

interface TravelCardButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  selected?: boolean;
}

export function TravelCardButton({
  children,
  className,
  selected = false,
  type = "button",
  ...props
}: TravelCardButtonProps) {
  return (
    <button
      className={cn(
        travelCardClass.shell,
        "w-full text-left",
        travelCardClass.shellInteractive,
        selected && travelCardClass.shellSelected,
        className,
      )}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}

export function TravelCardMedia({
  gradient,
  imageUrl,
  imageAlt = "",
  className,
  heightClassName = "h-[7.5rem]",
}: {
  gradient: string;
  imageUrl?: string;
  imageAlt?: string;
  className?: string;
  heightClassName?: string;
}) {
  if (imageUrl) {
    return (
      <div className={cn("relative w-full overflow-hidden", heightClassName, className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt={imageAlt} className="h-full w-full object-cover" src={imageUrl} />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "w-full bg-gradient-to-br",
        heightClassName,
        gradient,
        className,
      )}
    />
  );
}

export function TravelCardSectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className={travelCardClass.bodyLg}>
      {eyebrow ? <p className={travelCardClass.eyebrow}>{eyebrow}</p> : null}
      <h3 className={cn("font-semibold text-ink", eyebrow ? "mt-1 text-xl" : "text-xl")}>
        {title}
      </h3>
      {description ? (
        <p className={cn("mt-2", travelCardClass.subtitle)}>{description}</p>
      ) : null}
    </div>
  );
}

export function TravelCardSelectIndicator({
  selected = false,
  disabled = false,
}: {
  selected?: boolean;
  disabled?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
        selected
          ? "border-pine bg-pine text-ivory"
          : "border-pine/15 bg-ivory text-transparent",
        disabled && "opacity-50",
      )}
    >
      <Check aria-hidden="true" className="size-4" />
    </span>
  );
}

export function TravelCardOrderBadge({
  order,
  active = true,
}: {
  order: number;
  active?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
        active ? "bg-pine text-ivory" : "border border-pine/15 bg-ivory text-pine",
      )}
    >
      {order}
    </span>
  );
}

export function TravelCardTimeBadge({ time }: { time: string }) {
  return (
    <span className="flex w-[3.25rem] shrink-0 flex-col items-center justify-center rounded-xl bg-ivory px-1 py-2 text-center">
      <span className="text-sm font-bold leading-none text-pine">{time}</span>
    </span>
  );
}

export function TravelCardChip({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "ink";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        tone === "accent" && "bg-pine/10 text-pine",
        tone === "ink" && "bg-ink text-ivory",
        tone === "neutral" && "bg-ivory text-stone",
      )}
    >
      {children}
    </span>
  );
}

interface TravelCardRowProps {
  order?: number;
  time?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  footer?: ReactNode;
  trailing?: ReactNode;
  selected?: boolean;
}

export function TravelCardRow({
  order,
  time,
  eyebrow,
  title,
  description,
  meta,
  footer,
  trailing,
  selected = false,
}: TravelCardRowProps) {
  return (
    <div
      className={cn(
        "flex gap-3 p-4",
        selected && "bg-pine/[0.03]",
      )}
    >
      {order !== undefined ? <TravelCardOrderBadge order={order} /> : null}
      {time ? <TravelCardTimeBadge time={time} /> : null}
      <div className="min-w-0 flex-1">
        {eyebrow ? (
          <p className="text-[11px] font-semibold text-pine">{eyebrow}</p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <h4 className={travelCardClass.title}>{title}</h4>
          {trailing}
        </div>
        {description ? (
          <p className={cn("mt-1", travelCardClass.subtitle)}>{description}</p>
        ) : null}
        {meta ? <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{meta}</div> : null}
        {footer ? <div className="mt-2">{footer}</div> : null}
      </div>
    </div>
  );
}

export function TravelCardList({ children }: { children: ReactNode }) {
  return <div className={cn("divide-y", travelCardClass.divider)}>{children}</div>;
}
