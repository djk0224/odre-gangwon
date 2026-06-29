import { cn } from "@/lib/utils";

interface ZoneHeroMediaProps {
  gradient: string;
  imageUrl?: string;
  imageAlt?: string;
  className?: string;
  heightClassName?: string;
  overlay?: boolean;
}

export function ZoneHeroMedia({
  gradient,
  imageUrl,
  imageAlt = "",
  className,
  heightClassName = "h-14",
  overlay = false,
}: ZoneHeroMediaProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl", heightClassName, className)}>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt={imageAlt} className="h-full w-full object-cover" src={imageUrl} />
      ) : (
        <div className={cn("h-full w-full bg-gradient-to-br", gradient)} />
      )}
      {overlay && imageUrl ? (
        <div className="absolute inset-0 bg-gradient-to-t from-pine-deep/55 via-transparent to-transparent" />
      ) : null}
    </div>
  );
}
