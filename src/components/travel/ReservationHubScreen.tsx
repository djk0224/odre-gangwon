"use client";

import { useEffect, useMemo, useState } from "react";
import { ReservationCategoryTabs } from "@/components/travel/ReservationCategoryTabs";
import { ReservationOfferBookingSheet } from "@/components/travel/ReservationOfferBookingSheet";
import { ReservationOfferCard } from "@/components/travel/ReservationOfferCard";
import { PartnerAttractionCard } from "@/components/travel/PartnerAttractionCard";
import { PartnerAttractionReservationSheet } from "@/components/travel/PartnerAttractionReservationSheet";
import { ReservationSummaryBar } from "@/components/travel/ReservationSummaryBar";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SearchField } from "@/components/ui/SearchField";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TravelCardShell } from "@/components/ui/TravelCard";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import {
  filterAttractionPlaces,
  filterReservationOffers,
  filterReservationOffersByZone,
  normalizeSearchQuery,
} from "@/lib/reservationHubSearch";
import { getStayOffersForZone, mergeStayOffersForZone } from "@/lib/stayOffers";
import {
  getReservationOfferById,
  getReservationOffers,
  reservationHubCategories,
} from "@/data/mockReservationOffers";
import {
  fetchReservationDiningOffers,
  fetchTourStayOffers,
} from "@/services/externalDataClient";
import type { OfferBookingDraft } from "@/lib/offerReservationForm";
import { getSelectedSlot } from "@/stores/tripStore";
import type {
  HubReservationBooking,
  ReservationHubCategory,
  ReservationOffer,
} from "@/types/reservationHub";
import type { Itinerary, Place, QRTicket, ReservationRecord, TravelZoneId } from "@/types/travel";

interface ReservationHubScreenProps {
  attractionPlaces: Place[];
  itinerary?: Itinerary;
  zoneId?: TravelZoneId;
  pendingItineraryReservations?: number;
  onOpenItineraryAdmission?: () => void;
  initialCategory?: ReservationHubCategory;
  initialSheetPlaceId?: string | null;
  onSheetPlaceClose?: () => void;
  selectedSlotByPlace: Record<string, string>;
  reservations: ReservationRecord[];
  hubBookings: HubReservationBooking[];
  qrTickets: QRTicket[];
  confirmMessage: string;
  onSelectSlot: (placeId: string, slotId: string) => void;
  onConfirmAttraction: (
    placeId: string,
    payment: { amount: number; method: string },
  ) => void;
  onConfirmOffer: (
    offerId: string,
    draft: OfferBookingDraft,
    payment: { amount: number; method: string },
  ) => void;
  defaultTravelers?: number;
}

export function ReservationHubScreen({
  attractionPlaces,
  itinerary,
  zoneId,
  pendingItineraryReservations = 0,
  onOpenItineraryAdmission,
  initialCategory = "stay",
  initialSheetPlaceId = null,
  onSheetPlaceClose,
  selectedSlotByPlace,
  reservations,
  hubBookings,
  qrTickets,
  confirmMessage,
  onSelectSlot,
  onConfirmAttraction,
  onConfirmOffer,
  defaultTravelers = 2,
}: ReservationHubScreenProps) {
  const [activeCategory, setActiveCategory] =
    useState<ReservationHubCategory>(initialCategory);
  const [sheetPlaceId, setSheetPlaceId] = useState<string | null>(null);
  const [sheetOfferId, setSheetOfferId] = useState<string | null>(null);
  const [liveStayOffers, setLiveStayOffers] = useState<ReservationOffer[]>([]);
  const [liveDiningOffers, setLiveDiningOffers] = useState<ReservationOffer[]>([]);
  const [liveDataSources, setLiveDataSources] = useState<string[]>([]);
  const [liveLoadState, setLiveLoadState] = useState<"idle" | "loading" | "error">("idle");
  const [liveLoadError, setLiveLoadError] = useState<string | null>(null);

  const allowReservationMock =
    process.env.NEXT_PUBLIC_ALLOW_RESERVATION_MOCK === "true";
  const [searchQuery, setSearchQuery] = useState("");
  const resolvedZoneId = zoneId ?? itinerary?.region;
  const zoneLabel =
    (resolvedZoneId ? travelZoneShortLabels[resolvedZoneId] : undefined) ?? "선택 권역";

  const sheetPlace = attractionPlaces.find((place) => place.id === sheetPlaceId);
  const sheetSelectedSlot = sheetPlace
    ? getSelectedSlot(sheetPlace.id, sheetPlace.availableSlots, selectedSlotByPlace)
    : undefined;
  const sheetConfirmed = sheetPlace
    ? reservations.some((item) => item.placeId === sheetPlace.id)
    : false;
  const sheetTicket = sheetPlace
    ? qrTickets.find((item) => item.placeId === sheetPlace.id)
    : undefined;

  const offerLookup = useMemo(() => {
    const map = new Map<string, ReservationOffer>();
    [...liveStayOffers, ...liveDiningOffers].forEach((offer) => map.set(offer.id, offer));
    for (const category of reservationHubCategories) {
      getReservationOffers(category.id).forEach((offer) => {
        if (!map.has(offer.id)) map.set(offer.id, offer);
      });
    }
    return map;
  }, [liveStayOffers, liveDiningOffers]);

  const sheetOffer = sheetOfferId
    ? (offerLookup.get(sheetOfferId) ?? getReservationOfferById(sheetOfferId))
    : undefined;
  const sheetOfferBooking = sheetOfferId
    ? hubBookings.find((item) => item.offerId === sheetOfferId)
    : undefined;
  const sheetOfferReadonly = Boolean(sheetOfferBooking);

  useEffect(() => {
    setActiveCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setSearchQuery("");
  }, [activeCategory]);

  useEffect(() => {
    setSheetPlaceId(initialSheetPlaceId);
  }, [initialSheetPlaceId]);

  useEffect(() => {
    if (activeCategory !== "stay" && activeCategory !== "dining") {
      return;
    }

    let cancelled = false;
    setLiveLoadState("loading");
    setLiveLoadError(null);

    const load =
      activeCategory === "stay"
        ? fetchTourStayOffers(resolvedZoneId).then((result) => {
            if (!cancelled) {
              setLiveStayOffers(
                resolvedZoneId
                  ? mergeStayOffersForZone(resolvedZoneId, result.offers, 24)
                  : result.offers,
              );
              setLiveDataSources(result.sources);
            }
          })
        : fetchReservationDiningOffers({ limit: 48, zoneId: resolvedZoneId }).then((result) => {
            if (!cancelled) {
              setLiveDiningOffers(
                resolvedZoneId
                  ? filterReservationOffersByZone(result.offers, resolvedZoneId)
                  : result.offers,
              );
              setLiveDataSources(result.sources);
            }
          });

    load
      .then(() => {
        if (!cancelled) setLiveLoadState("idle");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setLiveLoadState("error");
        setLiveLoadError(
          error instanceof Error ? error.message : "목록을 불러오지 못했습니다.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [activeCategory, resolvedZoneId]);

  const categoryMeta = reservationHubCategories.find((item) => item.id === activeCategory);
  const mockOffers =
    activeCategory === "stay" && resolvedZoneId
      ? getStayOffersForZone(resolvedZoneId, 24)
      : getReservationOffers(activeCategory, resolvedZoneId);
  const isLiveCategory = activeCategory === "stay" || activeCategory === "dining";
  const liveOffers =
    activeCategory === "stay"
      ? liveStayOffers
      : activeCategory === "dining"
        ? liveDiningOffers
        : [];
  const usesLiveData = liveOffers.length > 0;
  const offers =
    isLiveCategory && usesLiveData
      ? liveOffers
      : isLiveCategory
        ? mockOffers
        : mockOffers;

  const categoryCounts = useMemo(() => {
    const attractionConfirmed = attractionPlaces.filter((place) =>
      reservations.some((item) => item.placeId === place.id),
    ).length;

    return reservationHubCategories.reduce<Partial<Record<ReservationHubCategory, number>>>(
      (acc, category) => {
        if (category.id === "attraction") {
          acc.attraction = attractionConfirmed;
          return acc;
        }

        acc[category.id] = hubBookings.filter((item) => item.category === category.id).length;
        return acc;
      },
      { attraction: attractionConfirmed },
    );
  }, [attractionPlaces, hubBookings, reservations]);

  const attractionConfirmed = attractionPlaces.filter((place) =>
    reservations.some((item) => item.placeId === place.id),
  ).length;
  const attractionPending = Math.max(0, attractionPlaces.length - attractionConfirmed);
  const totalHubConfirmed = hubBookings.length;
  const isAttraction = activeCategory === "attraction";
  const hasSearch = normalizeSearchQuery(searchQuery).length > 0;

  const filteredAttractionPlaces = useMemo(
    () => filterAttractionPlaces(attractionPlaces, searchQuery),
    [attractionPlaces, searchQuery],
  );

  const filteredOffers = useMemo(() => {
    const zoneScoped =
      resolvedZoneId &&
      (activeCategory === "dining" || activeCategory === "activity" || activeCategory === "stay")
        ? filterReservationOffersByZone(offers, resolvedZoneId)
        : offers;
    return filterReservationOffers(zoneScoped, searchQuery);
  }, [offers, searchQuery, resolvedZoneId, activeCategory]);

  const searchPlaceholder = categoryMeta
    ? `${categoryMeta.label} · ${categoryMeta.description} 검색`
    : "예약 항목 검색";

  return (
    <main className="min-w-0 space-y-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <div className="space-y-5 px-5">
        <SectionHeader
          eyebrow="Reservation Hub"
          title="예약"
          description="숙소·KTX·고속버스·렌트카·음식점·액티비티·관광지 예약을 한곳에서 진행합니다."
        />

        {pendingItineraryReservations > 0 && onOpenItineraryAdmission ? (
          <TravelCardShell>
            <div className="space-y-3 p-4">
              <p className="text-sm font-semibold text-ink">일정 제휴 · 내 티켓</p>
              <p className="text-xs leading-5 text-stone">
                {itinerary?.title ?? "현재 일정"}에 포함된 제휴 명소 입장 예약이{" "}
                <span className="font-semibold text-pine">{pendingItineraryReservations}건</span>{" "}
                남아 있습니다.
              </p>
              <PremiumButton className="w-full" onClick={onOpenItineraryAdmission}>
                내 티켓 이어하기
              </PremiumButton>
            </div>
          </TravelCardShell>
        ) : null}
      </div>

      <ReservationCategoryTabs
        activeCategory={activeCategory}
        counts={categoryCounts}
        onChange={setActiveCategory}
      />

      <div className="space-y-5 px-5">
      <SearchField
        onChange={setSearchQuery}
        placeholder={searchPlaceholder}
        value={searchQuery}
      />

      {hasSearch ? (
        <p className="text-xs text-stone">
          검색 결과{" "}
          <span className="font-semibold text-pine">
            {isAttraction ? filteredAttractionPlaces.length : filteredOffers.length}
          </span>
          건
        </p>
      ) : null}

      {isAttraction ? (
        <ReservationSummaryBar
          bookableCount={attractionPlaces.length}
          confirmedCount={attractionConfirmed}
          pendingCount={attractionPending}
          qrCount={qrTickets.length}
        />
      ) : (
        <div className="rounded-xl border border-pine/10 bg-paper px-4 py-3 text-sm text-stone">
          <span className="font-semibold text-ink">{categoryMeta?.label}</span>
          <span>
            {" "}
            · 확정 {categoryCounts[activeCategory] ?? 0}건
            {totalHubConfirmed > 0 ? ` · 전체 예약 ${totalHubConfirmed + attractionConfirmed}건` : ""}
          </span>
        </div>
      )}

      {isAttraction ? (
        <section className="space-y-4">
          <p className="text-sm text-stone">
            제휴 관광지는 시간대별 혼잡을 확인한 뒤 예약을 확정하면 QR 티켓이 발급됩니다.
          </p>
          {attractionPlaces.length === 0 ? (
            <p className="text-center text-sm text-stone">현재 예약 가능한 관광지가 없습니다.</p>
          ) : filteredAttractionPlaces.length === 0 ? (
            <p className="text-center text-sm text-stone">검색 결과가 없습니다.</p>
          ) : null}
          {filteredAttractionPlaces.map((place) => {
            const confirmed = reservations.some((item) => item.placeId === place.id);

            return (
              <PartnerAttractionCard
                confirmed={confirmed}
                inCurrentItinerary={Boolean(itinerary?.reservationPlaceIds.includes(place.id))}
                key={place.id}
                onOpenReservation={() => setSheetPlaceId(place.id)}
                place={place}
              />
            );
          })}
        </section>
      ) : (
        <section className="space-y-4">
          {activeCategory === "transport" ? (
            <p className="rounded-xl border border-pine/10 bg-paper px-4 py-3 text-xs leading-5 text-stone">
              <span className="font-semibold text-ink">KTX·고속버스</span> 장거리 승차권
              예약입니다. {zoneLabel}{" "}
              <span className="font-semibold text-pine">시내·권역 버스</span> 노선은 일정·케어의
              「오늘 경로」에서 TAGO 실시간 정보로 확인하세요.
            </p>
          ) : null}
          <p className="text-sm text-stone">
            {categoryMeta?.description} 예약을 진행할 수 있습니다.
            {usesLiveData ? (
              <span className="mt-1 block text-xs text-pine">
                {activeCategory === "stay"
                  ? `한국관광공사 GW · searchStay2 (${zoneLabel})`
                  : liveDataSources.includes("tour-gw") && liveDataSources.includes("gangwon-restaurant")
                    ? "관광공사 GW 음식점 + 강원 공공 음식점 API"
                    : liveDataSources.includes("tour-gw")
                      ? "한국관광공사 GW · areaBasedList (음식)"
                      : `강원특별자치도 일반음식점 현황 API (${zoneLabel})`}
              </span>
            ) : null}
          </p>
          {liveLoadState === "loading" ? (
            <p className="text-center text-sm text-stone">실시간 목록을 불러오는 중…</p>
          ) : null}
          {liveLoadError ? (
            <TravelCardShell>
              <div className="space-y-2 p-4 text-sm leading-6 text-stone">
                <p className="font-semibold text-ink">실데이터를 불러오지 못했습니다</p>
                <p>{liveLoadError}</p>
                <p className="text-xs">
                  배포 환경에 <span className="font-medium text-pine">TOUR_API_SERVICE_KEY</span>
                  (또는 PUBLIC_DATA_PORTAL_SERVICE_KEY)를 설정하고, 음식점은{" "}
                  <span className="font-medium text-pine">npm run import:data</span>로 JSON을
                  포함했는지 확인하세요.
                </p>
                {allowReservationMock ? (
                  <p className="text-xs text-pine">개발 모드: 아래 데모 목록을 표시합니다.</p>
                ) : null}
              </div>
            </TravelCardShell>
          ) : null}
          {offers.length === 0 && liveLoadState !== "loading" ? (
            <p className="text-center text-sm text-stone">표시할 항목이 없습니다.</p>
          ) : filteredOffers.length === 0 && liveLoadState !== "loading" ? (
            <p className="text-center text-sm text-stone">
              {hasSearch ? "검색 결과가 없습니다." : "표시할 항목이 없습니다."}
            </p>
          ) : null}
          {filteredOffers.map((offer) => {
            const booking = hubBookings.find((item) => item.offerId === offer.id);
            const confirmed = Boolean(booking);

            return (
              <ReservationOfferCard
                confirmed={confirmed}
                detailSummary={booking?.detailSummary}
                key={offer.id}
                offer={offer}
                paidAmount={booking?.payment.amount}
                paymentMethod={booking?.payment.method}
                onBook={() => setSheetOfferId(offer.id)}
              />
            );
          })}
        </section>
      )}

      {confirmMessage ? (
        <p className="text-center text-sm font-medium text-pine">{confirmMessage}</p>
      ) : null}

      <ReservationOfferBookingSheet
        booking={sheetOfferReadonly ? sheetOfferBooking : undefined}
        defaultTravelers={defaultTravelers}
        offer={sheetOfferReadonly ? undefined : sheetOffer}
        onClose={() => setSheetOfferId(null)}
        onConfirm={(offerId, draft, payment) => {
          onConfirmOffer(offerId, draft, payment);
        }}
        open={Boolean(sheetOfferId)}
      />

      <PartnerAttractionReservationSheet
        confirmed={sheetConfirmed}
        onClose={() => {
          setSheetPlaceId(null);
          onSheetPlaceClose?.();
        }}
        onConfirm={(payment) => {
          if (sheetPlace) onConfirmAttraction(sheetPlace.id, payment);
        }}
        onSelectSlot={(slotId) => {
          if (sheetPlace) onSelectSlot(sheetPlace.id, slotId);
        }}
        open={Boolean(sheetPlaceId)}
        paidAmount={
          sheetPlace
            ? reservations.find((item) => item.placeId === sheetPlace.id)?.payment.amount
            : undefined
        }
        paymentMethod={
          sheetPlace
            ? reservations.find((item) => item.placeId === sheetPlace.id)?.payment.method
            : undefined
        }
        place={sheetPlace}
        selectedSlotId={sheetSelectedSlot?.id}
        ticket={sheetTicket}
        travelers={defaultTravelers}
      />
      </div>
    </main>
  );
}
