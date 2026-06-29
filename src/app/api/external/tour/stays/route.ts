import { NextResponse } from "next/server";
import {
  fetchMvpRegionStays,
  fetchSearchStay,
  fetchStaysForZone,
} from "@/services/external/tourGwService";
import { mapTourStaysToOffers } from "@/lib/tourOfferMapper";
import { filterStayOffersByZone } from "@/lib/stayOffers";
import { getTourApiServiceKey } from "@/lib/serverEnv";
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
  const scope = searchParams.get("scope");
  const zoneIdParam = searchParams.get("zoneId");
  const zoneId =
    zoneIdParam && TRAVEL_ZONE_IDS.has(zoneIdParam)
      ? (zoneIdParam as TravelZoneId)
      : undefined;
  const withOffers = searchParams.get("offers") === "1";

  if ((scope === "mvp" || scope === "zone") && !getTourApiServiceKey()) {
    return NextResponse.json(
      {
        error:
          "TOUR_API_SERVICE_KEY 또는 PUBLIC_DATA_PORTAL_SERVICE_KEY가 필요합니다.",
        configured: false,
      },
      { status: 503 },
    );
  }

  try {
    const items =
      scope === "zone" && zoneId
        ? await fetchStaysForZone(zoneId, {
            numOfRowsPerCity: Number(searchParams.get("numOfRows")) || 8,
          })
        : scope === "mvp"
          ? await fetchMvpRegionStays({
              numOfRowsPerCity: Number(searchParams.get("numOfRows")) || 12,
            })
          : await fetchSearchStay({
              areaCode: searchParams.get("areaCode") ?? undefined,
              sigunguCode: searchParams.get("sigunguCode") ?? undefined,
              numOfRows: Number(searchParams.get("numOfRows")) || 20,
              pageNo: Number(searchParams.get("pageNo")) || 1,
            });

    const offers = withOffers ? mapTourStaysToOffers(items) : undefined;
    const filteredOffers =
      withOffers && zoneId && offers ? filterStayOffersByZone(offers, zoneId) : offers;

    return NextResponse.json({
      configured: true,
      count: items.length,
      items,
      zoneId: zoneId ?? null,
      offers: filteredOffers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tour stay API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
