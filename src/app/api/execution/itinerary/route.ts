import { NextResponse } from "next/server";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import { buildItineraryWithExecutionKernel } from "@/lib/executionKernel";
import { defaultPreferences } from "@/data/mockTravelData";
import type { TripPreferences } from "@/types/travel";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      preferences?: TripPreferences;
      anchorPlaceId?: string | null;
      orderedPlaceIds?: string[] | null;
      preserveOrder?: boolean;
      /** true면 Kakao 실도로 매트릭스 사용(느림). 기본은 fast */
      accurateRoutes?: boolean;
    };
    const preferences = body.preferences ?? defaultPreferences;
    await loadFullGangwonCatalog();

    const result = await buildItineraryWithExecutionKernel({
      preferences,
      anchorPlaceId: body.anchorPlaceId ?? null,
      orderedPlaceIds: body.orderedPlaceIds ?? null,
      preserveOrder: body.preserveOrder,
      selectionSource: body.orderedPlaceIds?.length ? "llm" : "rules",
      routeProfile: body.accurateRoutes ? "accurate" : "fast",
    });

    return NextResponse.json({
      itinerary: result.itinerary,
      provider: result.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execution kernel failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
