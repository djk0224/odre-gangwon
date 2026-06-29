import gangwonDataLabImported from "@/data/imported/datalab-gangwon.json";
import type { DataLabSigunguBundle, GangwonDataLabSnapshot } from "@/types/externalData";

let snapshotCache: { data: GangwonDataLabSnapshot; loadedAt: number } | null = null;
const SNAPSHOT_CACHE_MS = 10 * 60 * 1000;

function normalizeSigunguBundle(
  bundle: Partial<DataLabSigunguBundle> | undefined,
): DataLabSigunguBundle {
  return {
    visitors: bundle?.visitors ?? [],
    concentration: bundle?.concentration ?? [],
    relatedTourists: bundle?.relatedTourists ?? [],
    demandStay: bundle?.demandStay ?? [],
    demandConsumption: bundle?.demandConsumption ?? [],
    serviceDemand: bundle?.serviceDemand ?? [],
    cultureDemand: bundle?.cultureDemand ?? [],
  };
}

function normalizeSnapshot(raw: typeof gangwonDataLabImported): GangwonDataLabSnapshot | null {
  if (!raw?.sigungu || Object.keys(raw.sigungu).length === 0) {
    return null;
  }
  const sigungu: GangwonDataLabSnapshot["sigungu"] = {};
  for (const [code, bundle] of Object.entries(raw.sigungu)) {
    sigungu[code] = normalizeSigunguBundle(bundle);
  }
  return {
    fetchedAt: raw.fetchedAt ?? "",
    areaCode: raw.areaCode ?? "32",
    baseYm: raw.baseYm,
    visitorWindow: raw.visitorWindow,
    sigungu,
    source: "imported",
  };
}

export function loadGangwonDataLabSnapshot(): GangwonDataLabSnapshot | null {
  return normalizeSnapshot(gangwonDataLabImported);
}

export function getCachedGangwonDataLabSnapshot(): GangwonDataLabSnapshot | null {
  const now = Date.now();
  if (snapshotCache && now - snapshotCache.loadedAt < SNAPSHOT_CACHE_MS) {
    return snapshotCache.data;
  }
  const loaded = loadGangwonDataLabSnapshot();
  if (loaded) {
    snapshotCache = { data: loaded, loadedAt: now };
    return loaded;
  }
  return null;
}

export function getSigunguBundleFromSnapshot(
  sigunguCode: string,
  snapshot?: GangwonDataLabSnapshot | null,
): DataLabSigunguBundle | null {
  const data = snapshot ?? getCachedGangwonDataLabSnapshot();
  if (!data?.sigungu[sigunguCode]) {
    return null;
  }
  return normalizeSigunguBundle(data.sigungu[sigunguCode]);
}

export type { GangwonDataLabSnapshot, DataLabSigunguBundle };
