import { TravelCardMedia } from "@/components/ui/TravelCard";
import type { Place } from "@/types/travel";

interface PlaceThumbnailProps {
  place: Place;
  className?: string;
  heightClassName?: string;
}

/** 장소 카드·시트용 썸네일 — imageUrl 우선, 없으면 그라데이션 */
export function PlaceThumbnail({
  place,
  className,
  heightClassName = "size-16",
}: PlaceThumbnailProps) {
  return (
    <TravelCardMedia
      className={className}
      gradient={place.gradient}
      heightClassName={heightClassName}
      imageAlt={place.name}
      imageUrl={place.imageUrl}
    />
  );
}
