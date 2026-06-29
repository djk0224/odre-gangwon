import { buildCatalogFromTourItems } from "@/lib/placeCatalogBuilder";
import bootstrapBundle from "@/data/imported/tour-gw-samcheok-donghae.json";
import type { TourAreaItem } from "@/types/externalData";
import type { Place, TravelZoneId } from "@/types/travel";

type TourGwImportBundle = {
  items?: TourAreaItem[];
};

let catalogPlaces: Place[] = buildCatalogFromTourItems(
  (bootstrapBundle as TourGwImportBundle).items ?? [],
);

let fullCatalogLoaded = false;
let fullCatalogLoading: Promise<void> | null = null;
const listeners = new Set<() => void>();

function notifyCatalogListeners() {
  listeners.forEach((listener) => listener());
}

export function subscribeCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRuntimeCatalogPlaces(): Place[] {
  return catalogPlaces;
}

export function isFullCatalogLoaded(): boolean {
  return fullCatalogLoaded;
}

export function getCatalogPlaceCountByZone(zoneId: TravelZoneId): number {
  return catalogPlaces.filter((place) => place.region === zoneId).length;
}

/** 메인 번들은 MVP 슬라이스만 — 전체 GW는 async chunk로 로드 */
export async function loadFullGangwonCatalog(): Promise<void> {
  if (fullCatalogLoaded) return;
  if (fullCatalogLoading) {
    await fullCatalogLoading;
    return;
  }

  fullCatalogLoading = (async () => {
    try {
      const mod = (await import("@/data/imported/tour-gw-gangwon.json")) as TourGwImportBundle;
      catalogPlaces = buildCatalogFromTourItems(mod.items ?? []);
      fullCatalogLoaded = true;
      notifyCatalogListeners();
    } catch {
      fullCatalogLoaded = false;
    }
  })();

  try {
    await fullCatalogLoading;
  } finally {
    fullCatalogLoading = null;
  }
}
