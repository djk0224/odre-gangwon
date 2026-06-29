import { NextResponse } from "next/server";
import { generateAiCareSuggestions } from "@/services/ai/care";
import { generateDayCareSuggestions } from "@/services/careService";
import { defaultPreferences } from "@/data/mockTravelData";
import type { HubReservationBooking } from "@/types/reservationHub";
import type { Itinerary, ReservationRecord, TripPreferences } from "@/types/travel";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      itinerary?: Itinerary;
      preferences?: TripPreferences;
      reservations?: ReservationRecord[];
      hubBookings?: HubReservationBooking[];
      claimedLocalOfferIds?: string[];
    };

    const preferences = body.preferences ?? defaultPreferences;
    const ruleAlerts = await generateDayCareSuggestions(
      body.itinerary,
      body.reservations ?? [],
      body.hubBookings ?? [],
      body.claimedLocalOfferIds ?? [],
    );

    const result = await generateAiCareSuggestions({
      itinerary: body.itinerary,
      preferences,
      reservations: body.reservations ?? [],
      hubBookings: body.hubBookings ?? [],
      claimedLocalOfferIds: body.claimedLocalOfferIds ?? [],
      ruleAlerts,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI care failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
