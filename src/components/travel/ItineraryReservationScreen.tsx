"use client";

import { useEffect, useState } from "react";
import { ItineraryReservationProgress } from "@/components/travel/ItineraryReservationProgress";
import { PartnerAttractionCard } from "@/components/travel/PartnerAttractionCard";
import { PartnerAttractionReservationSheet } from "@/components/travel/PartnerAttractionReservationSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  countItineraryReservationProgress,
  sortPlacesByReservationStatus,
} from "@/services/reservationService";
import { getSelectedSlot } from "@/stores/tripStore";
import type { ReservationHubCategory } from "@/types/reservationHub";
import type { Itinerary, Place, QRTicket, ReservationRecord } from "@/types/travel";

interface ItineraryReservationScreenProps {
  itinerary: Itinerary;
  places: Place[];
  selectedSlotByPlace: Record<string, string>;
  reservations: ReservationRecord[];
  qrTickets: QRTicket[];
  confirmMessage: string;
  initialSheetPlaceId?: string | null;
  onBackToItinerary: () => void;
  onOpenReservationHub?: (category?: ReservationHubCategory) => void;
  onSelectSlot: (placeId: string, slotId: string) => void;
  onConfirm: (placeId: string, payment: { amount: number; method: string }) => void;
  defaultTravelers?: number;
}

export function ItineraryReservationScreen({
  itinerary,
  places,
  selectedSlotByPlace,
  reservations,
  qrTickets,
  confirmMessage,
  initialSheetPlaceId = null,
  onBackToItinerary,
  onOpenReservationHub,
  onSelectSlot,
  onConfirm,
  defaultTravelers = 2,
}: ItineraryReservationScreenProps) {
  const [sheetPlaceId, setSheetPlaceId] = useState<string | null>(initialSheetPlaceId);

  useEffect(() => {
    setSheetPlaceId(initialSheetPlaceId);
  }, [initialSheetPlaceId]);

  const progress = countItineraryReservationProgress(itinerary, reservations);
  const sortedPlaces = sortPlacesByReservationStatus(places, reservations);
  const nextPendingPlace = sortedPlaces.find(
    (place) => !reservations.some((item) => item.placeId === place.id),
  );

  const sheetPlace = sortedPlaces.find((place) => place.id === sheetPlaceId);
  const sheetSelectedSlot = sheetPlace
    ? getSelectedSlot(sheetPlace.id, sheetPlace.availableSlots, selectedSlotByPlace)
    : undefined;
  const sheetConfirmed = sheetPlace
    ? reservations.some((item) => item.placeId === sheetPlace.id)
    : false;
  const sheetTicket = sheetPlace
    ? qrTickets.find((item) => item.placeId === sheetPlace.id)
    : undefined;

  return (
    <main className="space-y-6 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <SectionHeader
        eyebrow="My Reservations"
        title="내 예약"
        description={`${itinerary.title} · 제휴 명소 시간 예약과 QR 입장`}
      />

      <ItineraryReservationProgress
        confirmed={progress.confirmed}
        nextPendingPlace={nextPendingPlace}
        total={progress.total}
      />

      {sortedPlaces.length === 0 ? (
        <section className="rounded-xl border border-dashed border-pine/15 bg-paper px-4 py-6 text-center">
          <p className="text-sm leading-relaxed text-stone">
            실행 일정에 포함된 장소 중 제휴·시간 예약이 필요한 명소가 없습니다.
          </p>
        </section>
      ) : (
        sortedPlaces.map((place) => {
          const confirmed = reservations.some((item) => item.placeId === place.id);

          return (
            <PartnerAttractionCard
              confirmed={confirmed}
              inCurrentItinerary
              key={place.id}
              onOpenReservation={() => setSheetPlaceId(place.id)}
              place={place}
            />
          );
        })
      )}

      {confirmMessage ? (
        <p className="text-center text-sm font-medium text-pine">{confirmMessage}</p>
      ) : null}

      <div className="sticky bottom-0 -mx-5 space-y-2 border-t border-pine/10 bg-ivory/95 px-5 py-4 backdrop-blur">
        <PremiumButton className="w-full" onClick={onBackToItinerary} variant="pine">
          일정으로 돌아가기
        </PremiumButton>
        {onOpenReservationHub ? (
          <PremiumButton
            className="w-full"
            onClick={() => onOpenReservationHub("stay")}
            variant="ghost"
          >
            예약 탭에서 숙소·교통 예약
          </PremiumButton>
        ) : null}
      </div>

      <PartnerAttractionReservationSheet
        confirmed={sheetConfirmed}
        onClose={() => setSheetPlaceId(null)}
        onConfirm={(payment) => {
          if (sheetPlace) onConfirm(sheetPlace.id, payment);
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
    </main>
  );
}
