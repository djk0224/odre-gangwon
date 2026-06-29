import "server-only";

import { buildCatalogFromTourItems } from "@/lib/placeCatalogBuilder";
import tourGwGangwon from "@/data/imported/tour-gw-gangwon.json";
import tourGwSamcheokDonghae from "@/data/imported/tour-gw-samcheok-donghae.json";
import type { TourAreaItem } from "@/types/externalData";
import type { TravelZoneId } from "@/types/travel";

interface TourGwImportBundle {
  updatedAt?: string;
  count?: number;
  imageCoverage?: { withImage: number; total: number };
  items?: TourAreaItem[];
}

function pickTourBundle(): TourGwImportBundle {
  const full = tourGwGangwon as TourGwImportBundle;
  if ((full.items?.length ?? 0) > 0) {
    return full;
  }
  return tourGwSamcheokDonghae as TourGwImportBundle;
}

const bundle = pickTourBundle();
const gangwonPlaces = buildCatalogFromTourItems(bundle.items ?? []);
const catalogScope =
  ((tourGwGangwon as TourGwImportBundle).items?.length ?? 0) > 0
    ? "gangwon-full"
    : "mvp-samcheok-donghae";

export function getGangwonCatalogMeta() {
  const zones: Record<TravelZoneId, number> = {
    "samcheok-donghae": 0,
    "gangneung-yangyang": 0,
    "sokcho-goseong": 0,
    "pyeongchang-jeongseon": 0,
    "yeongwol-jeongseon": 0,
    "cheorwon-dmz": 0,
    "wonju-chuncheon": 0,
  };

  for (const place of gangwonPlaces) {
    zones[place.region] = (zones[place.region] ?? 0) + 1;
  }

  return {
    updatedAt: bundle.updatedAt,
    importedCount: bundle.count ?? bundle.items?.length ?? 0,
    imageCoverage: bundle.imageCoverage,
    totalCatalog: gangwonPlaces.length,
    zones,
    scope: catalogScope,
  };
}
