"use client";

import { MapPin } from "lucide-react";
import {
  TravelCardMedia,
  TravelCardShell,
  travelCardClass,
} from "@/components/ui/TravelCard";
import type { Place } from "@/types/travel";

interface AiChatPlaceStripProps {
  places: Place[];
  onOpenPlace: (placeId: string) => void;
  onOpenReservation?: (placeId: string) => void;
}

export function AiChatPlaceStrip({
  places,
  onOpenPlace,
  onOpenReservation,
}: AiChatPlaceStripProps) {
  if (places.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-medium text-stone">관련 장소</p>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {places.map((place) => (
          <article className="w-[min(72vw,220px)] shrink-0" key={place.id}>
            <TravelCardShell className="overflow-hidden">
              <TravelCardMedia
                gradient={place.gradient}
                heightClassName="h-24"
                imageAlt={place.name}
                imageUrl={place.imageUrl}
              />
              <div className={travelCardClass.body}>
                <p className="text-[10px] font-semibold text-pine">{place.signature}</p>
                <h3 className="mt-0.5 line-clamp-1 text-sm font-semibold text-ink">
                  {place.name}
                </h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    className="inline-flex items-center gap-1 rounded-full border border-pine/15 bg-paper px-2.5 py-1 text-[11px] font-medium text-pine"
                    onClick={() => onOpenPlace(place.id)}
                    type="button"
                  >
                    <MapPin aria-hidden="true" className="size-3" />
                    상세
                  </button>
                  {place.reservationRequired && onOpenReservation ? (
                    <button
                      className="rounded-full bg-pine px-2.5 py-1 text-[11px] font-medium text-ivory"
                      onClick={() => onOpenReservation(place.id)}
                      type="button"
                    >
                      예약
                    </button>
                  ) : null}
                </div>
              </div>
            </TravelCardShell>
          </article>
        ))}
      </div>
    </div>
  );
}
