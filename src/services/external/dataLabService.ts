import { getDataLabApiKey } from "@/lib/serverEnv";
import { resolveSigunguCodeForZone } from "@/lib/sigunguResolver";
import {
  computeDataLabDemandScore,
  fetchGangwonSigunguDataLabBundle,
  getCachedGangwonDataLabSnapshot,
  getSigunguBundleFromSnapshot,
} from "@/services/external/tourDataLabService";
import type { TravelZoneId } from "@/types/travel";

export interface RegionalDemandSnapshot {
  region: string;
  period: string;
  visitIndex: number;
  consumptionIndex: number;
  navigationSearchIndex: number;
  source: "data-lab" | "mock";
}

/**
 * @deprecated P4 레거시 — tourDataLabService 사용 권장
 */
export async function fetchRegionalDemand(
  regionName: string,
): Promise<RegionalDemandSnapshot | null> {
  const apiKey = getDataLabApiKey();
  if (!apiKey) {
    return null;
  }

  const zoneHint = regionName as TravelZoneId;
  const sigunguCode = resolveSigunguCodeForZone(zoneHint);
  const cached = getSigunguBundleFromSnapshot(sigunguCode);
  const bundle =
    cached ??
    (await fetchGangwonSigunguDataLabBundle(sigunguCode).catch(() => null));
  if (!bundle) {
    return null;
  }

  const score = computeDataLabDemandScore(bundle);
  return {
    region: regionName,
    period: getCachedGangwonDataLabSnapshot()?.baseYm ?? "latest",
    visitIndex: Math.round(score),
    consumptionIndex: Math.round(score * 0.92),
    navigationSearchIndex: Math.round(score * 0.88),
    source: "data-lab",
  };
}
