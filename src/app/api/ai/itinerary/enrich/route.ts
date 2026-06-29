import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { enrichItineraryNarrative } from "@/services/ai/itinerary";
import type { Itinerary, TripPreferences } from "@/types/travel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "ai-itinerary-enrich", {
    limit: 30,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as {
      itinerary: Itinerary;
      preferences: TripPreferences;
      anchorPlaceId?: string | null;
    };

    if (!body.itinerary || !body.preferences) {
      return NextResponse.json({ error: "itinerary and preferences required" }, { status: 400 });
    }

    const result = await enrichItineraryNarrative(body.itinerary, body.preferences, {
      anchorPlaceId: body.anchorPlaceId ?? null,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Narrative enrich failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
