import { NextResponse } from "next/server";

import { GANGWON_SIGUNGU_CODES } from "@/config/tourZoneSigungu";
import { getDataLabApiKey } from "@/lib/serverEnv";
import {
  fetchGangwonSigunguDataLabBundle,
  formatBaseYm,
  getCachedGangwonDataLabSnapshot,
  loadGangwonDataLabSnapshot,
} from "@/services/external/tourDataLabService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sigunguCode = searchParams.get("sigunguCode");
  const live = searchParams.get("live") === "true";

  const snapshot = getCachedGangwonDataLabSnapshot();

  if (sigunguCode) {
    if (live && getDataLabApiKey()) {
      try {
        const bundle = await fetchGangwonSigunguDataLabBundle(sigunguCode, {
          baseYm: searchParams.get("baseYm") ?? formatBaseYm(),
        });
        return NextResponse.json({
          sigunguCode,
          source: "live",
          bundle,
          fetchedAt: new Date().toISOString(),
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "DataLab live fetch failed";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const bundle = snapshot?.sigungu[sigunguCode] ?? null;
    return NextResponse.json({
      sigunguCode,
      source: snapshot ? "imported" : "none",
      bundle,
      snapshotFetchedAt: snapshot?.fetchedAt ?? null,
    });
  }

  if (live && getDataLabApiKey() && searchParams.get("sigunguCode") === null) {
    return NextResponse.json({
      error: "live=true requires sigunguCode query param",
      availableSigunguCodes: GANGWON_SIGUNGU_CODES,
    }, { status: 400 });
  }

  const loaded = snapshot ?? loadGangwonDataLabSnapshot();
  if (!loaded) {
    return NextResponse.json({
      configured: Boolean(getDataLabApiKey()),
      snapshot: null,
      message: "No imported snapshot. Run npm run refresh:datalab-gangwon",
      availableSigunguCodes: GANGWON_SIGUNGU_CODES,
    });
  }

  return NextResponse.json({
    configured: Boolean(getDataLabApiKey()),
    snapshot: loaded,
    sigunguCount: Object.keys(loaded.sigungu).length,
  });
}
