"use client";

import { useMemo, useState } from "react";
import { BedDouble, MapPin, Search } from "lucide-react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SearchField } from "@/components/ui/SearchField";
import { KakaoPlaceMap } from "@/components/travel/KakaoPlaceMap";
import { getStayOffersForZone } from "@/lib/stayOffers";
import { geocodeAddressByQuery } from "@/services/externalDataClient";
import { depotFromOffer } from "@/lib/tripLodgingPlan";
import { useTripStore } from "@/stores/tripStore";
import type { TripLodgingDepot, TravelZoneId } from "@/types/travel";

interface LodgingDepotPickerSheetProps {
  open: boolean;
  nightIndex: number;
  zoneId: TravelZoneId;
  onClose: () => void;
  onSelect: (depot: TripLodgingDepot) => void;
}

export function LodgingDepotPickerSheet({
  open,
  nightIndex,
  zoneId,
  onClose,
  onSelect,
}: LodgingDepotPickerSheetProps) {
  const hubBookings = useTripStore((s) => s.hubBookings);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<TripLodgingDepot | null>(null);

  const stayOffers = useMemo(
    () => getStayOffersForZone(zoneId, 8).filter((offer) => offer.coordinates),
    [zoneId],
  );

  const stayBookings = hubBookings.filter((b) => b.category === "stay" && b.coordinates);

  async function handleGeocodeSearch() {
    const trimmed = query.trim();
    if (!trimmed) {
      setError("주소 또는 숙소 이름을 입력해 주세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await geocodeAddressByQuery(trimmed);
      const depot: TripLodgingDepot = {
        id: `lodging-geocode-${Date.now()}`,
        name: result.placeName ?? trimmed,
        coordinates: result.coordinates,
        address: result.address,
        source: "manual_geocode",
      };
      setPreview(depot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "주소 검색에 실패했습니다.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  function pickDepot(depot: TripLodgingDepot) {
    onSelect(depot);
    setQuery("");
    setPreview(null);
    setError("");
    onClose();
  }

  if (!open) return null;

  return (
    <BottomSheet
      eyebrow={`${nightIndex}박째`}
      onClose={onClose}
      open={open}
      subtitle="예약 숙소·추천 숙소·주소 검색으로 박별 기준점을 지정합니다."
      title="숙소 기준점 선택"
    >
      <div className="space-y-5 overflow-y-auto px-5 pb-6">
        {stayBookings.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone">
              예약한 숙소
            </p>
            {stayBookings.map((booking) => (
              <button
                className="flex w-full items-start gap-3 rounded-2xl border border-pine/10 bg-paper px-4 py-3 text-left"
                key={booking.id}
                onClick={() =>
                  pickDepot({
                    id: `lodging-hub-${booking.id}`,
                    name: booking.title,
                    coordinates: booking.coordinates!,
                    address: booking.address,
                    source: "hub_booking",
                    hubBookingId: booking.id,
                    offerId: booking.offerId,
                  })
                }
                type="button"
              >
                <BedDouble aria-hidden="true" className="mt-0.5 size-5 text-pine" />
                <span>
                  <span className="block text-sm font-semibold text-ink">{booking.title}</span>
                  <span className="mt-1 block text-xs text-stone">{booking.subtitle}</span>
                </span>
              </button>
            ))}
          </section>
        ) : null}

        {stayOffers.length > 0 ? (
          <section className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone">
              추천 숙소
            </p>
            {stayOffers.map((offer) => {
              const depot = depotFromOffer(offer, "wizard_offer");
              if (!depot) return null;
              return (
                <button
                  className="flex w-full items-start gap-3 rounded-2xl border border-pine/10 bg-paper px-4 py-3 text-left"
                  key={offer.id}
                  onClick={() => pickDepot(depot)}
                  type="button"
                >
                  <BedDouble aria-hidden="true" className="mt-0.5 size-5 text-pine" />
                  <span>
                    <span className="block text-sm font-semibold text-ink">{offer.title}</span>
                    <span className="mt-1 block text-xs text-stone">{offer.subtitle}</span>
                  </span>
                </button>
              );
            })}
          </section>
        ) : null}

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone">
            주소·키워드 검색
          </p>
          <SearchField
            onChange={setQuery}
            placeholder="예: 삼척 오션뷰 호텔, 동해시 중앙로"
            value={query}
          />
          {error ? <p className="text-sm text-pine">{error}</p> : null}
          <PremiumButton
            className="w-full"
            disabled={loading}
            onClick={() => void handleGeocodeSearch()}
            type="button"
          >
            <Search aria-hidden="true" className="mr-2 inline size-4" />
            {loading ? "검색 중…" : "주소로 좌표 찾기"}
          </PremiumButton>
          {preview ? (
            <div className="space-y-3 rounded-2xl border border-pine/12 bg-pine/5 p-4">
              <p className="text-sm font-semibold text-ink">{preview.name}</p>
              {preview.address ? (
                <p className="flex items-start gap-2 text-xs text-stone">
                  <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                  {preview.address}
                </p>
              ) : null}
              <KakaoPlaceMap
                className="h-36 overflow-hidden rounded-xl"
                coordinates={preview.coordinates}
                placeName={preview.name}
              />
              <PremiumButton className="w-full" onClick={() => pickDepot(preview)} type="button">
                이 위치를 {nightIndex}박 숙소로 지정
              </PremiumButton>
            </div>
          ) : null}
        </section>
      </div>
    </BottomSheet>
  );
}
