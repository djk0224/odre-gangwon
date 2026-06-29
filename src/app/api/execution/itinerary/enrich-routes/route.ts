import { NextResponse } from "next/server";
import { enrichItineraryRoutes } from "@/services/ai/itineraryRoutes";
import type { Itinerary, QRTicket, ReservationRecord, TripPreferences } from "@/types/travel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      itinerary: Itinerary;
      preferences: TripPreferences;
      reservations?: ReservationRecord[];
      qrTickets?: QRTicket[];
    };

    if (!body.itinerary || !body.preferences) {
      return NextResponse.json({ error: "itinerary and preferences required" }, { status: 400 });
    }

    const result = await enrichItineraryRoutes(body.itinerary, body.preferences, {
      reservations: body.reservations,
      qrTickets: body.qrTickets,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Route enrich failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
