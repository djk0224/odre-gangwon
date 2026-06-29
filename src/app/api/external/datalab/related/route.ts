import { NextResponse } from "next/server";

import { getDataLabApiKey } from "@/lib/serverEnv";
import {
  fetchRelatedTouristsForPlace,
  formatBaseYm,
  getCachedGangwonDataLabSnapshot,
  getRelatedTouristsForPlace,
} from "@/services/external/tourDataLabService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const placeName = searchParams.get("placeName")?.trim();
  const sigunguCode = searchParams.get("sigunguCode") ?? undefined;
  const tAtsCd = searchParams.get("tAtsCd") ?? undefined;
  const live = searchParams.get("live") === "true";
  const limit = Math.min(Number(searchParams.get("limit") ?? 8) || 8, 20);

  if (!placeName) {
    return NextResponse.json(
      { error: "placeName query parameter is required" },
      { status: 400 },
    );
  }

  if (live && getDataLabApiKey()) {
    try {
      const items = await fetchRelatedTouristsForPlace({
        placeName,
        sigunguCode,
        tAtsCd,
        baseYm: searchParams.get("baseYm") ?? formatBaseYm(),
        limit,
      });
      return NextResponse.json({
        placeName,
        sigunguCode: sigunguCode ?? null,
        source: "live",
        count: items.length,
        items,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Related tourists live fetch failed";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }

  const snapshot = getCachedGangwonDataLabSnapshot();
  const items = getRelatedTouristsForPlace({
    placeName,
    sigunguCode,
    tAtsCd,
    snapshot,
    limit,
  });

  return NextResponse.json({
    placeName,
    sigunguCode: sigunguCode ?? null,
    source: snapshot ? "imported" : "none",
    snapshotFetchedAt: snapshot?.fetchedAt ?? null,
    count: items.length,
    items,
    hint: items.length === 0 && !snapshot
      ? "Run npm run refresh:datalab-gangwon or use live=true with API key"
      : undefined,
  });
}
