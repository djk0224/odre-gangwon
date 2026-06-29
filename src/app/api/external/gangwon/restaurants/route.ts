import { NextResponse } from "next/server";
import { fetchGangwonRestaurants } from "@/services/external/gangwonOpenDataService";
import type { TravelZoneId } from "@/types/travel";

const TRAVEL_ZONE_IDS = new Set([
  "samcheok-donghae",
  "gangneung-yangyang",
  "sokcho-goseong",
  "pyeongchang-jeongseon",
  "yeongwol-jeongseon",
  "cheorwon-dmz",
  "wonju-chuncheon",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const zoneIdParam = searchParams.get("zoneId");
  const zoneId =
    zoneIdParam && TRAVEL_ZONE_IDS.has(zoneIdParam)
      ? (zoneIdParam as TravelZoneId)
      : undefined;

  try {
    const items = await fetchGangwonRestaurants({
      city: searchParams.get("city") ?? undefined,
      zoneId,
      limit: Number(searchParams.get("limit")) || 60,
    });
    return NextResponse.json({
      count: items.length,
      items,
      zoneId: zoneId ?? null,
      source: "gangwon-restaurant",
      note: "강원특별자치도 일반음식점 현황 (공공 OpenAPI CSV → 서버 JSON, npm run import:data 갱신)",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gangwon restaurant load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
