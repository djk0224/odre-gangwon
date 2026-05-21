import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  eyebrow,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
          {eyebrow}
        </p>
      ) : null}
      <h2 className="text-2xl font-semibold leading-tight text-ink">{title}</h2>
      {description ? (
        <p className="text-sm leading-6 text-stone">{description}</p>
      ) : null}
    </div>
  );
}
