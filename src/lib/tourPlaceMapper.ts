import {
  getTravelZoneForSigungu,
  travelZoneShortLabels,
} from "@/config/tourZoneSigungu";
import type { TourAreaItem } from "@/types/externalData";
import type { Place, PlaceCategory, TravelZoneId } from "@/types/travel";

const PLACE_GRADIENTS = [
  "from-pine-deep via-pine to-mist",
  "from-mist via-sand to-ivory",
  "from-pine via-mist to-sand",
  "from-ink via-pine-deep to-mist",
  "from-sand via-ivory to-pine",
  "from-stone-warm via-sand to-ivory",
] as const;

const CONTENT_TYPE_LABELS: Record<string, string> = {
  "12": "관광지",
  "14": "문화시설",
  "15": "행사",
  "28": "레포츠",
  "32": "숙박",
  "38": "쇼핑",
  "39": "음식점",
};

export interface TourItemWithRegion {
  item: TourAreaItem;
  region?: TravelZoneId;
}

export function normalizePlaceName(name: string): string {
  return name
    .replace(/\s+/g, "")
    .replace(/[()（）[\]【】]/g, "")
    .toLowerCase();
}

function pickGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash + seed.charCodeAt(i) * (i + 1)) % PLACE_GRADIENTS.length;
  }
  return PLACE_GRADIENTS[hash] ?? PLACE_GRADIENTS[0];
}

function parseCoordinates(item: TourAreaItem): { lat: number; lng: number } | null {
  const lng = Number(item.mapx);
  const lat = Number(item.mapy);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return null;
  }
  return { lat, lng };
}

function inferCategory(item: TourAreaItem): PlaceCategory {
  const typeId = item.contenttypeid;
  const title = item.title.toLowerCase();

  if (typeId === "39") return "restaurant";
  if (typeId === "38") return "market";

  if (/(굴|동굴|cave)/i.test(title)) return "cave";
  if (/(케이블|케이블카|cable)/i.test(title)) return "cable-car";
  if (/(등대|전망|observatory|스카이|밸리|전망대)/i.test(title)) return "observatory";
  if (/(시장|market|상점가|아케이드)/i.test(title)) return "market";
  if (/(카페|coffee|로스터리)/i.test(title)) return "cafe";
  if (/(해변|항|바다|해수욕|촛대|포구|방파제)/i.test(title)) return "sea";
  if (/(산책|둘레길|트레일|숲길|골목|담길)/i.test(title)) return "trail";
  if (/(생태|국립|도립).*공원|공원|정원/i.test(title)) return "experience";
  if (/(박물관|기념관|문화|전시|유적)/i.test(title)) return "experience";
  if (typeId === "28") return "experience";
  if (typeId === "14") return "experience";
  return "experience";
}

function buildAddress(item: TourAreaItem): string {
  const parts = [item.addr1, item.addr2].filter(Boolean);
  return parts.join(" ").trim() || "강원특별자치도";
}

function estimateDuration(category: PlaceCategory): string {
  switch (category) {
    case "cave":
      return "1시간 30분";
    case "cable-car":
      return "1시간";
    case "market":
    case "restaurant":
      return "1시간";
    case "trail":
    case "sea":
      return "50분";
    case "observatory":
      return "45분";
    default:
      return "1시간";
  }
}

function sanitizePhone(tel?: string): string | undefined {
  if (!tel) return undefined;
  const cleaned = tel.replace(/<br\s*\/?>/gi, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : undefined;
}

export function resolveImageUrl(item: TourAreaItem): string | undefined {
  const raw = item.firstimage || item.firstimage2 || item.resolvedImage;
  if (!raw || raw === "") return undefined;
  if (raw.startsWith("http://")) {
    return raw.replace("http://", "https://");
  }
  return raw;
}

export function mapTourItemToPlace(
  item: TourAreaItem,
  region: TravelZoneId,
): Place | null {
  if (item.contenttypeid === "32") {
    return null;
  }

  const coordinates = parseCoordinates(item);
  if (!coordinates) return null;

  const category = inferCategory(item);
  const typeLabel = CONTENT_TYPE_LABELS[item.contenttypeid] ?? "관광";
  const address = buildAddress(item);
  const zoneLabel = travelZoneShortLabels[region];

  return {
    id: `tour-${item.contentid}`,
    name: item.title.trim(),
    category,
    region,
    description: `${typeLabel} · ${address}`,
    signature: `한국관광공사 · ${typeLabel}`,
    tags: [typeLabel, "GW", zoneLabel],
    operatingHours: "운영시간은 현장·공식 안내를 확인하세요",
    estimatedDuration: estimateDuration(category),
    distanceNote: address.replace(/^강원(특별자치도)?\s*/, "").slice(0, 48),
    recommendationReason: `${item.title}은(는) ${zoneLabel} 권역에서 ${typeLabel}로 많이 찾는 장소입니다.`,
    gradient: pickGradient(item.contentid),
    imageUrl: resolveImageUrl(item),
    contactPhone: sanitizePhone(item.tel),
    coordinates,
    reservationRequired: false,
    partner: false,
    qrAvailable: false,
    availableSlots: [],
  };
}

export function mapTourItemsToPlaces(entries: TourItemWithRegion[]): Place[] {
  const seenIds = new Set<string>();
  const places: Place[] = [];

  for (const entry of entries) {
    const item = entry.item;
    if (!item.contentid || seenIds.has(item.contentid)) continue;
    const region = entry.region ?? getTravelZoneForSigungu(item.sigungucode);
    const place = mapTourItemToPlace(item, region);
    if (!place) continue;
    seenIds.add(item.contentid);
    places.push(place);
  }

  return places;
}

/** @deprecated GW-only catalog uses applyPartnerPlaceProfiles instead */
export function mergePlaceCatalog(corePlaces: Place[], importedPlaces: Place[]): Place[] {
  const coreNames = new Set(corePlaces.map((place) => normalizePlaceName(place.name)));
  const merged = [...corePlaces];
  const seenIds = new Set(corePlaces.map((place) => place.id));

  for (const place of importedPlaces) {
    if (seenIds.has(place.id)) continue;
    const normalized = normalizePlaceName(place.name);
    if (coreNames.has(normalized)) continue;
    coreNames.add(normalized);
    seenIds.add(place.id);
    merged.push(place);
  }

  return merged;
}
