import {
  getCatalogPlaceById,
  getCatalogPlaces,
} from "@/services/placeGeocodeService";
import type {
  Itinerary,
  Place,
  QRTicket,
  ReservationRecord,
  ReservationSlot,
} from "@/types/travel";

function isBookablePartnerPlace(place: Place | undefined): place is Place {
  return Boolean(
    place?.partner && place.reservationRequired && place.qrAvailable && place.availableSlots.length > 0,
  );
}

/** 일정 정류장 중 제휴·시간 예약·QR 가능 명소 */
export function getItineraryPartnerReservationPlaces(itinerary: Itinerary): Place[] {
  const seen = new Set<string>();
  const places: Place[] = [];

  for (const stop of itinerary.stops) {
    const place = getCatalogPlaceById(stop.placeId);
    if (!isBookablePartnerPlace(place) || seen.has(place.id)) continue;
    seen.add(place.id);
    places.push(place);
  }

  for (const placeId of itinerary.reservationPlaceIds) {
    const place = getCatalogPlaceById(placeId);
    if (!isBookablePartnerPlace(place) || seen.has(place.id)) continue;
    seen.add(place.id);
    places.push(place);
  }

  return places;
}

export function detectReservationRequiredPlaces(itinerary: Itinerary): Place[] {
  return getItineraryPartnerReservationPlaces(itinerary);
}

/** 하단 탭 예약 허브: 제휴·예약 가능 명소 (권역 필터 선택) */
export function getBookablePartnerPlaces(zoneId?: Place["region"]): Place[] {
  const places = getCatalogPlaces().filter((place) => isBookablePartnerPlace(place));
  if (!zoneId) return places;
  return places.filter((place) => place.region === zoneId);
}

/** 일정 → 예약: 이번 일정의 제휴 예약처만 */
export function getItineraryReservationPlaces(itinerary: Itinerary): Place[] {
  return getItineraryPartnerReservationPlaces(itinerary);
}

export function countItineraryReservationProgress(
  itinerary: Itinerary,
  reservations: ReservationRecord[],
): { total: number; confirmed: number; pending: number } {
  const partnerPlaceIds = getItineraryPartnerReservationPlaces(itinerary).map((place) => place.id);
  const confirmed = partnerPlaceIds.filter((placeId) =>
    reservations.some((item) => item.placeId === placeId),
  ).length;
  return {
    total: partnerPlaceIds.length,
    confirmed,
    pending: Math.max(0, partnerPlaceIds.length - confirmed),
  };
}

export function sortPlacesByReservationStatus(
  placeList: Place[],
  reservations: ReservationRecord[],
): Place[] {
  return [...placeList].sort((a, b) => {
    const aConfirmed = reservations.some((item) => item.placeId === a.id);
    const bConfirmed = reservations.some((item) => item.placeId === b.id);
    if (aConfirmed === bConfirmed) return 0;
    return aConfirmed ? 1 : -1;
  });
}

/** @deprecated Use getBookablePartnerPlaces or getItineraryReservationPlaces */
export function getPartnerReservationPlaces(): Place[] {
  return getBookablePartnerPlaces();
}

/** @deprecated Use getBookablePartnerPlaces or getItineraryReservationPlaces */
export function resolveReservationPlaces(itinerary?: Itinerary): {
  places: Place[];
  mode: "itinerary" | "preview";
} {
  if (!itinerary) {
    return { places: getBookablePartnerPlaces(), mode: "preview" };
  }

  const fromItinerary = detectReservationRequiredPlaces(itinerary);
  if (fromItinerary.length > 0) {
    return { places: fromItinerary, mode: "itinerary" };
  }

  return { places: getBookablePartnerPlaces(), mode: "preview" };
}

export function isPlaceInItinerary(itinerary: Itinerary | undefined, placeId: string): boolean {
  if (!itinerary) return false;
  return (
    itinerary.reservationPlaceIds.includes(placeId) ||
    itinerary.stops.some((stop) => stop.placeId === placeId)
  );
}

export function getPlaceById(placeId: string): Place | undefined {
  return getCatalogPlaceById(placeId);
}

export function getSlotById(placeId: string, slotId: string): ReservationSlot | undefined {
  const place = getPlaceById(placeId);
  return place?.availableSlots.find((slot) => slot.id === slotId);
}

export type ConfirmReservationResult =
  | { ok: true; reservation: ReservationRecord; ticket: QRTicket }
  | { ok: false; error: string };

export function confirmReservation(
  input: {
    placeId: string;
    slotId: string;
    travelers: number;
    payment: { amount: number; method: string };
  },
  options?: { existingReservations?: ReservationRecord[] },
): ConfirmReservationResult {
  const place = getPlaceById(input.placeId);
  const slot = getSlotById(input.placeId, input.slotId);

  if (!place || !slot || !place.partner || !place.qrAvailable) {
    return { ok: false, error: "예약할 수 없는 장소입니다." };
  }

  if (input.travelers < 1) {
    return { ok: false, error: "인원 수를 확인해 주세요." };
  }

  const existing = options?.existingReservations ?? [];
  if (existing.some((item) => item.placeId === place.id)) {
    return { ok: false, error: "이미 예약된 명소입니다." };
  }
  if (existing.some((item) => item.placeId === place.id && item.slotId === slot.id)) {
    return { ok: false, error: "같은 시간대 예약이 이미 있습니다." };
  }

  const remaining = Math.max(0, slot.capacity - slot.reservedCount);
  if (input.travelers > remaining) {
    return {
      ok: false,
      error: remaining === 0 ? "선택한 시간은 마감되었습니다." : `남은 좌석은 ${remaining}명입니다.`,
    };
  }

  if (input.payment.amount < 0) {
    return { ok: false, error: "결제 금액을 확인해 주세요." };
  }

  const reservation: ReservationRecord = {
    id: `res-${place.id}-${Date.now()}`,
    placeId: place.id,
    placeName: place.name,
    slotId: slot.id,
    slotLabel: slot.label,
    travelers: input.travelers,
    confirmedAt: new Date().toISOString(),
    crowdLevel: slot.crowdLevel,
    expectedWait: slot.expectedWait,
    executionStatus: "qr_issued",
    payment: {
      amount: input.payment.amount,
      method: input.payment.method,
      paidAt: new Date().toISOString(),
    },
  };

  const ticket: QRTicket = {
    id: `qr-${reservation.id}`,
    reservationId: reservation.id,
    placeId: place.id,
    placeName: place.name,
    slotLabel: slot.label,
    reservationNumber: `ODRE-${place.id.slice(0, 3).toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`,
    checkInStatus: "ready",
    issuedAt: new Date().toISOString(),
  };

  return { ok: true, reservation, ticket };
}
