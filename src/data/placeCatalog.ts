import {
  getCatalogPlaceCountByZone,
  getRuntimeCatalogPlaces,
  loadFullGangwonCatalog,
  subscribeCatalog,
} from "@/lib/catalogRuntime";
import type { TravelZoneId } from "@/types/travel";

export { loadFullGangwonCatalog, subscribeCatalog };

export function getCatalogPlacesSnapshot() {
  return getRuntimeCatalogPlaces();
}

export function getPartnerPlacesSnapshot() {
  return getRuntimeCatalogPlaces().filter((place) => place.partner);
}

export function getPlacesByZone(zoneId: TravelZoneId) {
  return getRuntimeCatalogPlaces().filter((place) => place.region === zoneId);
}

export { getCatalogPlaceCountByZone };

export function getTourGwImportMeta() {
  const places = getRuntimeCatalogPlaces();
  return {
    importedCount: places.length,
    totalCatalog: places.length,
    zones: {
      "samcheok-donghae": getCatalogPlaceCountByZone("samcheok-donghae"),
      "gangneung-yangyang": getCatalogPlaceCountByZone("gangneung-yangyang"),
      "sokcho-goseong": getCatalogPlaceCountByZone("sokcho-goseong"),
      "pyeongchang-jeongseon": getCatalogPlaceCountByZone("pyeongchang-jeongseon"),
      "yeongwol-jeongseon": getCatalogPlaceCountByZone("yeongwol-jeongseon"),
      "cheorwon-dmz": getCatalogPlaceCountByZone("cheorwon-dmz"),
      "wonju-chuncheon": getCatalogPlaceCountByZone("wonju-chuncheon"),
    },
  };
}
