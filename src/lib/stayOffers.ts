import { resolveTravelZoneForCity } from "@/lib/cityToTravelZone";
import { isLodgingPlace } from "@/lib/placeLodging";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { getReservationOffers } from "@/data/mockReservationOffers";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import type { ReservationOffer } from "@/types/reservationHub";
import type { TravelZoneId } from "@/types/travel";

const STAY_GRADIENTS = [
  "from-pine-deep via-pine to-mist",
  "from-ink via-pine-deep to-mist",
  "from-pine to-sand",
  "from-ink to-pine",
] as const;

const ZONE_STAY_ANCHORS: Record<
  TravelZoneId,
  { lat: number; lng: number; primaryCity: string; secondaryCity?: string }
> = {
  "samcheok-donghae": { lat: 37.449, lng: 129.165, primaryCity: "삼척시", secondaryCity: "동해시" },
  "gangneung-yangyang": { lat: 37.7519, lng: 128.8761, primaryCity: "강릉시", secondaryCity: "양양군" },
  "sokcho-goseong": { lat: 38.207, lng: 128.591, primaryCity: "속초시", secondaryCity: "고성군" },
  "pyeongchang-jeongseon": { lat: 37.37, lng: 128.39, primaryCity: "평창군", secondaryCity: "횡성군" },
  "yeongwol-jeongseon": { lat: 37.183, lng: 128.461, primaryCity: "영월군", secondaryCity: "정선군" },
  "cheorwon-dmz": { lat: 38.146, lng: 127.313, primaryCity: "철원군", secondaryCity: "화천군" },
  "wonju-chuncheon": { lat: 37.342, lng: 127.92, primaryCity: "춘천시", secondaryCity: "원주시" },
};

function pickGradient(index: number) {
  return STAY_GRADIENTS[index % STAY_GRADIENTS.length];
}

/** 주소·부제·명시 zoneId로 권역 추정 */
export function resolveStayOfferZone(offer: ReservationOffer): TravelZoneId | undefined {
  if (offer.zoneId) return offer.zoneId;

  const haystack = `${offer.title} ${offer.subtitle} ${offer.description} ${offer.address ?? ""}`;

  for (const [city, zoneId] of Object.entries(
    {
      강릉시: "gangneung-yangyang",
      양양군: "gangneung-yangyang",
      속초시: "sokcho-goseong",
      고성군: "sokcho-goseong",
      삼척시: "samcheok-donghae",
      동해시: "samcheok-donghae",
      태백시: "yeongwol-jeongseon",
      영월군: "yeongwol-jeongseon",
      정선군: "yeongwol-jeongseon",
      평창군: "pyeongchang-jeongseon",
      횡성군: "pyeongchang-jeongseon",
      철원군: "cheorwon-dmz",
      화천군: "cheorwon-dmz",
      양구군: "cheorwon-dmz",
      인제군: "cheorwon-dmz",
      원주시: "wonju-chuncheon",
      춘천시: "wonju-chuncheon",
      홍천군: "wonju-chuncheon",
    } satisfies Record<string, TravelZoneId>,
  )) {
    if (haystack.includes(city)) return zoneId;
  }

  for (const [zoneId, label] of Object.entries(travelZoneShortLabels) as Array<
    [TravelZoneId, string]
  >) {
    const tokens = label.split("·").map((part) => part.trim());
    if (tokens.some((token) => token.length >= 2 && haystack.includes(token))) {
      return zoneId;
    }
  }

  return undefined;
}

export function filterStayOffersByZone(
  offers: ReservationOffer[],
  zoneId: TravelZoneId,
): ReservationOffer[] {
  return offers.filter((offer) => resolveStayOfferZone(offer) === zoneId);
}

function mapCatalogPlaceToStayOffer(
  place: ReturnType<typeof getCatalogPlaces>[number],
  index: number,
): ReservationOffer | null {
  if (!place.coordinates) return null;

  return {
    id: `catalog-stay-${place.id}`,
    category: "stay",
    zoneId: place.region,
    title: place.name,
    subtitle: `${travelZoneShortLabels[place.region]} · ${place.category === "experience" ? "캠핑·체류" : "숙박"}`,
    description: place.description || `${place.name} — ${travelZoneShortLabels[place.region]} 일정 거점`,
    priceLabel: "1박 · 요금 문의",
    gradient: place.gradient || pickGradient(index),
    meta: place.estimatedDuration,
    source: "mock",
    coordinates: place.coordinates,
    address: place.distanceNote || undefined,
  };
}

/** 카탈로그 숙박·캠핑 장소 → 예약 오퍼 */
export function buildCatalogStayOffers(zoneId: TravelZoneId): ReservationOffer[] {
  return getCatalogPlaces()
    .filter((place) => place.region === zoneId && isLodgingPlace(place))
    .map((place, index) => mapCatalogPlaceToStayOffer(place, index))
    .filter((offer): offer is ReservationOffer => offer != null);
}

/** GW·카탈로그가 부족할 때 권역별 데모 숙소 */
export function buildZoneFallbackStayOffers(zoneId: TravelZoneId): ReservationOffer[] {
  const anchor = ZONE_STAY_ANCHORS[zoneId];
  const zoneLabel = travelZoneShortLabels[zoneId];

  return [
    {
      id: `stay-fallback-${zoneId}-primary`,
      category: "stay",
      zoneId,
      title: `${anchor.primaryCity.replace(/시|군$/, "")} 스테이`,
      subtitle: `${zoneLabel} · ${anchor.primaryCity}`,
      description: `${zoneLabel} 일정의 1박 거점으로 쓰기 좋은 ${anchor.primaryCity} 중심 숙소입니다.`,
      priceLabel: "1박 ₩98,000~",
      badge: "권역 추천",
      gradient: pickGradient(0),
      meta: "체크인 15:00",
      source: "mock",
      coordinates: { lat: anchor.lat, lng: anchor.lng },
      address: `강원특별자치도 ${anchor.primaryCity}`,
    },
    {
      id: `stay-fallback-${zoneId}-secondary`,
      category: "stay",
      zoneId,
      title: anchor.secondaryCity
        ? `${anchor.secondaryCity.replace(/시|군$/, "")} 베이스캠프`
        : `${zoneLabel} 베이스캠프`,
      subtitle: `${zoneLabel} · ${anchor.secondaryCity ?? anchor.primaryCity}`,
      description: `${zoneLabel} 동선을 나눌 때 둘째 박·인접 거점으로 쓰기 좋습니다.`,
      priceLabel: "1박 ₩86,000~",
      gradient: pickGradient(1),
      meta: "무료 취소 · 데모",
      source: "mock",
      coordinates: {
        lat: anchor.lat + 0.012,
        lng: anchor.lng + 0.008,
      },
      address: anchor.secondaryCity
        ? `강원특별자치도 ${anchor.secondaryCity}`
        : `강원특별자치도 ${anchor.primaryCity}`,
    },
  ];
}

/** 권역 일치 숙소 목록 (목업 + 카탈로그, API 결과와 병합 가능) */
export function getStayOffersForZone(zoneId: TravelZoneId, limit = 6): ReservationOffer[] {
  const merged = new Map<string, ReservationOffer>();

  for (const offer of getReservationOffers("stay")) {
    if (resolveStayOfferZone(offer) === zoneId) {
      merged.set(offer.id, { ...offer, zoneId });
    }
  }

  for (const offer of buildCatalogStayOffers(zoneId)) {
    if (!merged.has(offer.id)) merged.set(offer.id, offer);
  }

  if (merged.size < 2) {
    for (const offer of buildZoneFallbackStayOffers(zoneId)) {
      if (!merged.has(offer.id)) merged.set(offer.id, offer);
    }
  }

  return [...merged.values()].slice(0, limit);
}

export function mergeStayOffersForZone(
  zoneId: TravelZoneId,
  liveOffers: ReservationOffer[],
  limit = 6,
): ReservationOffer[] {
  const merged = new Map<string, ReservationOffer>();

  for (const offer of liveOffers) {
    const resolved = resolveStayOfferZone({ ...offer, zoneId: offer.zoneId ?? resolveStayOfferZone(offer) });
    if (resolved === zoneId) {
      merged.set(offer.id, { ...offer, zoneId: resolved });
    }
  }

  if (merged.size === 0) {
    return getStayOffersForZone(zoneId, limit);
  }

  for (const offer of getStayOffersForZone(zoneId, limit)) {
    if (merged.size >= limit) break;
    if (!merged.has(offer.id)) merged.set(offer.id, offer);
  }

  return [...merged.values()].slice(0, limit);
}

/** Tour GW 주소 → 권역 (mapper·API 필터 공용) */
export function resolveZoneFromTourAddress(address?: string): TravelZoneId | undefined {
  if (!address) return undefined;
  for (const city of [
    "강릉시",
    "양양군",
    "속초시",
    "고성군",
    "삼척시",
    "동해시",
    "태백시",
    "영월군",
    "정선군",
    "평창군",
    "횡성군",
    "철원군",
    "화천군",
    "양구군",
    "인제군",
    "원주시",
    "춘천시",
    "홍천군",
  ]) {
    if (address.includes(city)) {
      return resolveTravelZoneForCity(city);
    }
  }
  return undefined;
}
