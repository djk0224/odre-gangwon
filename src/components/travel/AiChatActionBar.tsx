"use client";

import type { AiChatAction } from "@/services/ai/types";
import type { ReservationHubCategory } from "@/types/reservationHub";

interface AiChatActionBarProps {
  actions: AiChatAction[];
  onOpenPlace: (placeId: string) => void;
  onOpenReservationPlace: (placeId: string) => void;
  onOpenReservationHub: (category: ReservationHubCategory) => void;
  onOpenCare?: () => void;
  onOpenItinerary?: () => void;
}

function hubCategoryFromAction(action: AiChatAction): ReservationHubCategory {
  const raw = action.hubCategory;
  if (
    raw === "stay" ||
    raw === "transport" ||
    raw === "rental" ||
    raw === "dining" ||
    raw === "activity" ||
    raw === "attraction"
  ) {
    return raw;
  }
  return "attraction";
}

function isPrimaryAction(type: AiChatAction["type"]) {
  return (
    type === "open_reservation_place" ||
    type === "open_care" ||
    type === "open_itinerary"
  );
}

export function AiChatActionBar({
  actions,
  onOpenPlace,
  onOpenReservationPlace,
  onOpenReservationHub,
  onOpenCare,
  onOpenItinerary,
}: AiChatActionBarProps) {
  if (actions.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <button
          className={
            isPrimaryAction(action.type)
              ? "rounded-full bg-pine px-3 py-1.5 text-xs font-medium text-ivory"
              : "rounded-full border border-pine/15 bg-paper px-3 py-1.5 text-xs font-medium text-pine"
          }
          key={action.id}
          onClick={() => {
            if (action.type === "open_place" && action.placeId) {
              onOpenPlace(action.placeId);
              return;
            }
            if (action.type === "open_reservation_place" && action.placeId) {
              onOpenReservationPlace(action.placeId);
              return;
            }
            if (action.type === "open_reservation_hub") {
              onOpenReservationHub(hubCategoryFromAction(action));
              return;
            }
            if (action.type === "open_care") {
              onOpenCare?.();
              return;
            }
            if (action.type === "open_itinerary") {
              onOpenItinerary?.();
            }
          }}
          type="button"
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
