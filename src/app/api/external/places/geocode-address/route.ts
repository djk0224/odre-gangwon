import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { geocodePlaceByQuery } from "@/services/external/kakaoLocalService";
import type { Coordinates } from "@/types/travel";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "places-geocode-address", {
    limit: 24,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      query?: string;
      center?: Coordinates;
    };
    const query = body.query?.trim();
    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const match = await geocodePlaceByQuery(query, body.center);
    if (!match) {
      return NextResponse.json(
        { error: "주소를 찾지 못했습니다. 키워드를 조정해 주세요." },
        { status: 404 },
      );
    }

    const address =
      match.document.road_address_name ||
      match.document.address_name ||
      query;

    return NextResponse.json({
      coordinates: match.coordinates,
      address,
      placeName: match.document.place_name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Geocode failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
