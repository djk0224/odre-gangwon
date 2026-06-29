import { NextResponse } from "next/server";
import { generateCrowdGuidance } from "@/services/ai/crowd";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { placeId?: string };
    if (!body.placeId) {
      return NextResponse.json({ error: "placeId is required" }, { status: 400 });
    }
    const place = getCatalogPlaceById(body.placeId);
    if (!place) {
      return NextResponse.json({ error: "place not found" }, { status: 404 });
    }
    const guidance = await generateCrowdGuidance(place, place.availableSlots);
    return NextResponse.json(guidance);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI crowd failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
