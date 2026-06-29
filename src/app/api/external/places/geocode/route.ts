import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { geocodeCatalogPlaces } from "@/services/placeGeocodeService";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "places-geocode", {
    limit: 12,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as { placeIds?: string[] };
    const payload = await geocodeCatalogPlaces(body.placeIds);
    return NextResponse.json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Geocode sync failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
