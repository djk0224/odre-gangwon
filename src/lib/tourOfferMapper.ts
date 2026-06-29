import { resolveZoneFromTourAddress } from "@/lib/stayOffers";
import { resolveImageUrl } from "@/lib/tourPlaceMapper";
import type { ReservationOffer } from "@/types/reservationHub";
import type { TourAreaItem } from "@/types/externalData";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";

const STAY_GRADIENTS = [
  "from-pine-deep via-pine to-mist",
  "from-ink via-pine-deep to-mist",
  "from-pine to-sand",
  "from-ink to-pine",
] as const;

function pickGradient(index: number) {
  return STAY_GRADIENTS[index % STAY_GRADIENTS.length];
}

function cityLabel(item: TourAreaItem) {
  const addr = item.addr1 ?? "";
  for (const city of [
    "삼척시",
    "동해시",
    "강릉시",
    "양양군",
    "속초시",
    "고성군",
    "평창군",
    "횡성군",
    "영월군",
    "정선군",
    "태백시",
    "철원군",
    "화천군",
    "원주시",
    "춘천시",
  ]) {
    if (addr.includes(city)) return city;
  }
  return "강원";
}

function tourItemCoordinates(item: TourAreaItem) {
  const lat = Number(item.mapy);
  const lng = Number(item.mapx);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat === 0 || lng === 0) {
    return undefined;
  }
  return { lat, lng };
}

export function mapTourStayToOffer(item: TourAreaItem, index: number): ReservationOffer {
  const city = cityLabel(item);
  const imageUrl = resolveImageUrl(item);
  const tel = item.tel?.trim();
  const address = [item.addr1, item.addr2].filter(Boolean).join(" ").trim();
  const coordinates = tourItemCoordinates(item);
  const zoneId = resolveZoneFromTourAddress(address);

  return {
    id: `tour-stay-${item.contentid}`,
    category: "stay",
    zoneId,
    title: item.title,
    subtitle: zoneId
      ? `${city} · ${travelZoneShortLabels[zoneId]}`
      : `${city} · 관광공사 숙박`,
    description: address || `${city} 숙박 시설`,
    priceLabel: "실시간 조회 · 요금 문의",
    badge: index === 0 ? "GW 연동" : undefined,
    gradient: pickGradient(index),
    meta: tel ? `문의 ${tel}` : "한국관광공사 GW",
    imageUrl,
    source: "tour-gw",
    externalId: item.contentid,
    coordinates,
    address: address || undefined,
  };
}

export function mapTourStaysToOffers(items: TourAreaItem[]): ReservationOffer[] {
  return items.map((item, index) => mapTourStayToOffer(item, index));
}

export function mapTourDiningToOffer(item: TourAreaItem, index: number): ReservationOffer {
  const city = cityLabel(item);
  const imageUrl = resolveImageUrl(item);
  const tel = item.tel?.trim();
  const address = [item.addr1, item.addr2].filter(Boolean).join(" ").trim();
  const zoneId = resolveZoneFromTourAddress(address);

  return {
    id: `tour-dining-${item.contentid}`,
    category: "dining",
    zoneId,
    title: item.title,
    subtitle: zoneId
      ? `${city} · ${travelZoneShortLabels[zoneId]}`
      : `${city} · 관광공사 음식점`,
    description: address || `${city} 맛집`,
    priceLabel: "방문·좌석 예약",
    badge: index === 0 ? "GW 연동" : undefined,
    gradient: pickGradient(index),
    meta: tel ? `문의 ${tel}` : "한국관광공사 GW",
    imageUrl,
    source: "tour-gw",
    externalId: item.contentid,
    address: address || undefined,
  };
}

export function mapTourDiningToOffers(items: TourAreaItem[]): ReservationOffer[] {
  return items.map((item, index) => mapTourDiningToOffer(item, index));
}
