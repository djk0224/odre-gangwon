import { getTravelZones, travelZones, type TravelZoneOption } from "@/data/mockRegionalFraming";
import zoneHeroImported from "@/data/imported/zone-hero-images.json";
import { getRuntimeCatalogPlaces } from "@/lib/catalogRuntime";
import { ZONE_HERO_OVERRIDES } from "@/data/zoneHeroOverrides";
import type { Place, PlaceCategory, TravelZoneId } from "@/types/travel";

interface ZoneHeroEntry {
  imageUrl: string;
  placeName?: string;
  contentid?: string;
}

interface ZoneHeroFile {
  heroes?: Partial<Record<TravelZoneId, ZoneHeroEntry | null>>;
}

const CATEGORY_PRIORITY: PlaceCategory[] = [
  "cave",
  "cable-car",
  "sea",
  "observatory",
  "experience",
  "trail",
  "market",
];

const ICONIC_NAME_HINTS: Partial<Record<TravelZoneId, string[]>> = {
  "samcheok-donghae": ["환선굴", "케이블카", "추암촛대", "장호항"],
  "gangneung-yangyang": ["경포대", "안목", "주문진", "오죽헌", "커피"],
  "sokcho-goseong": ["속초해수욕장", "아바이", "설악", "고성"],
  "pyeongchang-jeongseon": ["알펜시아", "월정사", "대관령", "정선"],
  "yeongwol-jeongseon": ["동강", "래프팅", "레일바이크", "비발디"],
  "cheorwon-dmz": ["DMZ", "철원", "평화", "두루미"],
  "wonju-chuncheon": ["의암", "춘천", "소양강", "막국수"],
};

function pickFromCatalog(zoneId: TravelZoneId): { imageUrl: string; placeName: string } | undefined {
  const places = getRuntimeCatalogPlaces().filter(
    (place): place is Place & { imageUrl: string } =>
      place.region === zoneId && Boolean(place.imageUrl),
  );
  if (places.length === 0) return undefined;

  const hints = ICONIC_NAME_HINTS[zoneId];
  if (hints) {
    for (const hint of hints) {
      const match = places.find((place) => place.name.includes(hint));
      if (match?.imageUrl) {
        return { imageUrl: match.imageUrl, placeName: match.name };
      }
    }
  }

  const partner = places.find((place) => place.partner);
  if (partner?.imageUrl) {
    return { imageUrl: partner.imageUrl, placeName: partner.name };
  }

  for (const category of CATEGORY_PRIORITY) {
    const match = places.find((place) => place.category === category);
    if (match?.imageUrl) {
      return { imageUrl: match.imageUrl, placeName: match.name };
    }
  }

  const fallback = places[0];
  return fallback ? { imageUrl: fallback.imageUrl, placeName: fallback.name } : undefined;
}

function getSavedHero(zoneId: TravelZoneId): ZoneHeroEntry | undefined {
  const override = ZONE_HERO_OVERRIDES[zoneId];
  if (override?.imageUrl) return override;

  const file = zoneHeroImported as ZoneHeroFile;
  const entry = file.heroes?.[zoneId];
  if (!entry?.imageUrl) return undefined;
  return entry;
}

export function resolveZoneHeroImage(zoneId: TravelZoneId): string | undefined {
  const saved = getSavedHero(zoneId);
  if (saved?.imageUrl) return saved.imageUrl;
  return pickFromCatalog(zoneId)?.imageUrl;
}

export function resolveZoneHeroMeta(zoneId: TravelZoneId) {
  const saved = getSavedHero(zoneId);
  if (saved?.imageUrl) return saved;
  const picked = pickFromCatalog(zoneId);
  if (!picked) return undefined;
  return { imageUrl: picked.imageUrl, placeName: picked.placeName };
}

export function withZoneHeroImage(zone: TravelZoneOption): TravelZoneOption {
  return { ...zone, imageUrl: resolveZoneHeroImage(zone.id) };
}

export function getTravelZonesWithHeroes(): TravelZoneOption[] {
  return getTravelZones().map(withZoneHeroImage);
}

/** @deprecated `getTravelZonesWithHeroes()` — 카탈로그 로드 후 최신 availability 반영 */
export const travelZonesWithHeroes: TravelZoneOption[] = travelZones.map(withZoneHeroImage);

export function getTravelZoneWithHero(id: TravelZoneId): TravelZoneOption | undefined {
  return getTravelZonesWithHeroes().find((zone) => zone.id === id);
}
