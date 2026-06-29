import { useMemo } from "react";
import { BedDouble } from "lucide-react";
import {
  ItineraryPlaceCard,
  type ItineraryStopMarker,
} from "@/components/travel/ItineraryPlaceCard";
import { ItineraryTravelLeg } from "@/components/travel/ItineraryTravelLeg";
import { LocalRouteOfferCard } from "@/components/travel/LocalRouteOfferCard";
import type { ItineraryDayFilter } from "@/components/ui/DayTabs";
import { resolveStopIdFromTimelineItem, getItineraryStopScrollId } from "@/lib/itineraryTimelineStop";
import { isLodgingPlace } from "@/lib/placeLodging";
import { findCatalogPlaceByNameHint } from "@/services/placeGeocodeService";
import type { ItineraryTimelineItem, Place, TravelZoneId } from "@/types/travel";

interface ItineraryResultTimelineProps {
  items: ItineraryTimelineItem[];
  dayFilter: ItineraryDayFilter;
  zoneId?: TravelZoneId;
  claimedLocalOfferIds: string[];
  confirmedPlaceIds: string[];
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string) => void;
  onClaimLocalOffer: (offerId: string) => void;
  onViewLocalCoupons?: () => void;
}

function compareTimelineItems(a: ItineraryTimelineItem, b: ItineraryTimelineItem): number {
  if (a.day !== b.day) return a.day - b.day;
  return (a.order ?? 0) - (b.order ?? 0);
}

/** 식당·숙소 정류장은 번호 대신 마크로 표시 */
function resolveStopMarker(place: Place | undefined): ItineraryStopMarker | null {
  if (!place) return null;
  if (place.category === "restaurant" || place.category === "cafe") return "dining";
  if (isLodgingPlace(place)) return "lodging";
  return null;
}

export function ItineraryResultTimeline({
  items,
  dayFilter,
  zoneId,
  claimedLocalOfferIds,
  confirmedPlaceIds,
  selectedStopId = null,
  onSelectStop,
  onClaimLocalOffer,
  onViewLocalCoupons,
}: ItineraryResultTimelineProps) {
  const visibleItems =
    dayFilter === "all"
      ? [...items].sort(compareTimelineItems)
      : items.filter((item) => (item.day ?? 1) === dayFilter);

  const { placeOrderByItemId, markerByItemId } = useMemo(() => {
    let order = 0;
    const orderMap = new Map<string, number>();
    const markerMap = new Map<string, ItineraryStopMarker>();
    for (const item of visibleItems) {
      if (item.kind === "local" || item.kind === "lodging") continue;
      const marker = resolveStopMarker(findCatalogPlaceByNameHint(item.title));
      if (marker) {
        markerMap.set(item.id, marker);
        continue;
      }
      order += 1;
      orderMap.set(item.id, order);
    }
    return { placeOrderByItemId: orderMap, markerByItemId: markerMap };
  }, [visibleItems]);

  if (visibleItems.length === 0) {
    return (
      <p className="px-5 text-sm text-stone">
        {dayFilter === "all" ? "표시할 일정이 없습니다." : "이 Day에 배정된 일정이 없습니다."}
      </p>
    );
  }

  return (
    <ol className="relative space-y-2.5 px-5">
      <span className="absolute bottom-4 left-5 top-4 w-px bg-pine/15" />
      {visibleItems.map((item, index) => {
        const prev = index > 0 ? visibleItems[index - 1] : null;
        const showDayHeading =
          dayFilter === "all" && (prev === null || prev.day !== item.day);
        const stopId = resolveStopIdFromTimelineItem(item);

        const card = (() => {
          if (item.kind === "lodging") {
            return (
              <div className="relative rounded-2xl border border-pine/12 bg-pine/6 px-4 py-3">
                <div
                  aria-label="숙소"
                  className="absolute -left-5 top-4 flex size-7 items-center justify-center rounded-full border border-pine/25 bg-ivory text-pine"
                >
                  <BedDouble aria-hidden="true" className="size-3.5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                  숙소
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-xs leading-5 text-stone">{item.description}</p>
                ) : null}
              </div>
            );
          }

          if (item.kind === "local" && item.localOffer) {
            return (
              <LocalRouteOfferCard
                claimed={claimedLocalOfferIds.includes(item.localOffer.id)}
                item={item}
                onClaim={onClaimLocalOffer}
                onViewWallet={onViewLocalCoupons}
              />
            );
          }

          const place = findCatalogPlaceByNameHint(item.title);
          const reservationConfirmed = place
            ? confirmedPlaceIds.includes(place.id)
            : false;
          return (
            <ItineraryPlaceCard
              item={item}
              marker={markerByItemId.get(item.id) ?? null}
              onSelect={
                stopId && onSelectStop ? () => onSelectStop(stopId) : undefined
              }
              order={placeOrderByItemId.get(item.id) ?? 0}
              place={place}
              reservationConfirmed={reservationConfirmed}
              selected={Boolean(stopId && selectedStopId === stopId)}
              zoneId={zoneId}
            />
          );
        })();

        return (
          <li
            className="list-none"
            id={stopId ? getItineraryStopScrollId(stopId) : undefined}
            key={item.id}
          >
            {showDayHeading ? (
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-stone">
                Day {item.day}
              </p>
            ) : null}
            {card}
            {item.travelLegToNext ? (
              <ItineraryTravelLeg label={item.travelLegToNext} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
