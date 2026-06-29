import { NextResponse } from "next/server";
import { searchPlacesWithAi } from "@/services/ai/placeSearch";
import { defaultPreferences } from "@/data/mockTravelData";
import type { TripPreferences } from "@/types/travel";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      query?: string;
      preferences?: TripPreferences;
    };
    const result = await searchPlacesWithAi(body.query ?? "", body.preferences ?? defaultPreferences);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
