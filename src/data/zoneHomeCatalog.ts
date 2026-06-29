import { isZoneCatalogExecutable } from "@/lib/gangwonZoneAvailability";
import { getRuntimeCatalogPlaces } from "@/lib/catalogRuntime";
import type { TravelZoneOption } from "@/data/mockRegionalFraming";
import { getTravelZoneWithHero } from "@/data/zoneHeroImages";
import type { EngineContext } from "@/services/engines/engineContext";
import { rerankPlaceIds, rerankPlaceIdsAsync } from "@/services/engines/personalizationRanker";
import { getFeaturedNatureRoadForZone } from "@/services/natureRoadCatalog";
import type { FeaturedNatureRoadSegment } from "@/services/natureRoadCatalog";
import type { Place, TravelZoneId } from "@/types/travel";

export interface ZonePassTeaser {
  id: string;
  name: string;
  subtitle: string;
  benefits: string[];
  priceHint: string;
}

export interface ZoneCarouselSection {
  id: string;
  title: string;
  places: Place[];
  browsePlaces: Place[];
}

export interface ZoneHomeBundle {
  zone: TravelZoneOption;
  executable: boolean;
  exploreTitle: string;
  exploreSubtitle: string;
  carouselSections: ZoneCarouselSection[];
  natureRoad: FeaturedNatureRoadSegment | null;
  passTeaser: ZonePassTeaser;
}

// ODRÉ는 자체 유료 패스를 팔지 않는다. 강원도 공식 무료 혜택(강원패스·강원상품권 환급)을
// 일정에 연동해 보여주는 "혜택 연동" 티저다. priceHint는 가격이 아니라 연동 안내 문구.
const passTeasersByZone: Record<TravelZoneId, ZonePassTeaser> = {
  "samcheok-donghae": {
    id: "pass-east-sea",
    name: "동해안 혜택 연동",
    subtitle: "강원패스·강원상품권 일정 연동",
    benefits: ["전망대·체험 할인", "로컬 카페 쿠폰", "스탬프 1칸 적립"],
    priceHint: "무료 · 공식 혜택 연동",
  },
  "gangneung-yangyang": {
    id: "pass-gy",
    name: "강릉·양양 혜택 연동",
    subtitle: "커피거리 · 서핑 · 해변 전망",
    benefits: ["안목 카페 쿠폰", "서핑 체험 할인", "전망대 입장"],
    priceHint: "무료 · 공식 혜택 연동",
  },
  "sokcho-goseong": {
    id: "pass-sg",
    name: "속초·고성 혜택 연동",
    subtitle: "아바이 · 고성 DMZ 인근",
    benefits: ["아바이순대 할인", "고성 해변 체험", "버스 환승"],
    priceHint: "무료 · 공식 혜택 연동",
  },
  "pyeongchang-jeongseon": {
    id: "pass-pj",
    name: "평창·정선 혜택 연동",
    subtitle: "힐링 · 레저 · 산악 드라이브",
    benefits: ["스키·레저 할인", "온천·휴게", "산악 전망"],
    priceHint: "무료 · 공식 혜택 연동",
  },
  "yeongwol-jeongseon": {
    id: "pass-yj",
    name: "영월·정선 혜택 연동",
    subtitle: "패러글라이딩 · 레일바이크",
    benefits: ["레저 체험", "동강 래프팅", "카페 쿠폰"],
    priceHint: "무료 · 공식 혜택 연동",
  },
  "cheorwon-dmz": {
    id: "pass-cw",
    name: "철원·접경 혜택 연동",
    subtitle: "DMZ · 전망 · 평화 트레일",
    benefits: ["전망대 입장", "해설 투어", "기념품 할인"],
    priceHint: "무료 · 공식 혜택 연동",
  },
  "wonju-chuncheon": {
    id: "pass-wc",
    name: "원주·춘천 혜택 연동",
    subtitle: "시장 · 닭갈비 · 호수 산책",
    benefits: ["전통시장 쿠폰", "막국수·닭갈비", "자전거 대여"],
    priceHint: "무료 · 공식 혜택 연동",
  },
};

const localFoodBrowseCategories: Place["category"][] = ["market", "restaurant"];
const healingBrowseCategories: Place["category"][] = ["trail", "cafe", "observatory", "sea"];
const mustVisitCategories: Place["category"][] = [
  "cave",
  "cable-car",
  "sea",
  "observatory",
  "experience",
];

function withoutClaimed(places: Place[], claimed: Set<string>): Place[] {
  return places.filter((place) => !claimed.has(place.id));
}

function registerSectionClaims(section: ZoneCarouselSection, claimed: Set<string>): void {
  for (const place of section.browsePlaces) {
    claimed.add(place.id);
  }
}

function orderPlacesForBrowse(featuredIds: string[], candidates: Place[]): Place[] {
  const featured = featuredIds
    .map((id) => candidates.find((place) => place.id === id))
    .filter((place): place is Place => Boolean(place));
  const featuredSet = new Set(featuredIds);
  const rest = candidates.filter((place) => !featuredSet.has(place.id));
  return [...featured, ...rest];
}

function placesInZone(zoneId: TravelZoneId): Place[] {
  return getRuntimeCatalogPlaces().filter((place) => place.region === zoneId);
}

function rerankSectionPlaces(places: Place[], context?: EngineContext): Place[] {
  if (!context || places.length === 0) return places;
  const ids = rerankPlaceIds(
    places.map((p) => p.id),
    context,
    { limit: places.length },
  );
  return ids
    .map((id) => places.find((p) => p.id === id))
    .filter((place): place is Place => Boolean(place));
}

async function rerankSectionPlacesAsync(
  places: Place[],
  context?: EngineContext,
): Promise<Place[]> {
  if (!context || places.length === 0) return places;
  const ids = await rerankPlaceIdsAsync(
    places.map((p) => p.id),
    context,
    { limit: places.length },
  );
  return ids
    .map((id) => places.find((p) => p.id === id))
    .filter((place): place is Place => Boolean(place));
}

function buildCarouselSections(
  zoneId: TravelZoneId,
  engineContext?: EngineContext,
): ZoneCarouselSection[] {
  const zonePlaces = placesInZone(zoneId);
  if (zonePlaces.length === 0) {
    return [];
  }

  const claimed = new Set<string>();
  const sections: ZoneCarouselSection[] = [];

  const mustVisit = withoutClaimed(
    zonePlaces.filter((p) => mustVisitCategories.includes(p.category)),
    claimed,
  );
  if (mustVisit.length > 0) {
    const ranked = rerankSectionPlaces(mustVisit, engineContext);
    const featured = ranked.slice(0, 4).map((p) => p.id);
    const section: ZoneCarouselSection = {
      id: "must-visit",
      title: "꼭 가볼 곳",
      places: ranked.slice(0, 4),
      browsePlaces: orderPlacesForBrowse(featured, ranked),
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  const partners = withoutClaimed(
    zonePlaces.filter((place) => place.partner),
    claimed,
  );
  if (partners.length > 0) {
    const ranked = rerankSectionPlaces(partners, engineContext);
    const section: ZoneCarouselSection = {
      id: "partner",
      title: "제휴 예약 명소",
      places: ranked.slice(0, 4),
      browsePlaces: ranked,
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  const food = withoutClaimed(
    zonePlaces.filter((p) => ["market", "restaurant"].includes(p.category)),
    claimed,
  );
  if (food.length > 0) {
    const ranked = rerankSectionPlaces(food, engineContext);
    const featured = ranked.slice(0, 4).map((p) => p.id);
    const section: ZoneCarouselSection = {
      id: "local-food",
      title: "로컬 식사",
      places: ranked.slice(0, 4),
      browsePlaces: orderPlacesForBrowse(
        featured,
        ranked.length > 0
          ? ranked
          : zonePlaces.filter((p) => localFoodBrowseCategories.includes(p.category)),
      ),
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  const healing = withoutClaimed(
    zonePlaces.filter((p) => healingBrowseCategories.includes(p.category)),
    claimed,
  );
  if (healing.length > 0) {
    const ranked = rerankSectionPlaces(healing, engineContext);
    const featured = ranked.slice(0, 4).map((p) => p.id);
    const section: ZoneCarouselSection = {
      id: "healing",
      title: "여유 산책",
      places: ranked.slice(0, 4),
      browsePlaces: orderPlacesForBrowse(
        featured,
        ranked.length > 0
          ? ranked
          : withoutClaimed(
              zonePlaces.filter((p) => healingBrowseCategories.includes(p.category)),
              claimed,
            ),
      ),
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  if (sections.length === 0 && zonePlaces.length > 0) {
    sections.push({
      id: "curated",
      title: "권역 큐레이션",
      places: zonePlaces.slice(0, 6),
      browsePlaces: zonePlaces,
    });
  }

  return sections;
}

async function buildCarouselSectionsAsync(
  zoneId: TravelZoneId,
  engineContext?: EngineContext,
): Promise<ZoneCarouselSection[]> {
  const zonePlaces = placesInZone(zoneId);
  if (zonePlaces.length === 0) {
    return [];
  }

  const claimed = new Set<string>();
  const sections: ZoneCarouselSection[] = [];

  const mustVisit = withoutClaimed(
    zonePlaces.filter((p) => mustVisitCategories.includes(p.category)),
    claimed,
  );
  if (mustVisit.length > 0) {
    const ranked = await rerankSectionPlacesAsync(mustVisit, engineContext);
    const featured = ranked.slice(0, 4).map((p) => p.id);
    const section: ZoneCarouselSection = {
      id: "must-visit",
      title: "꼭 가볼 곳",
      places: ranked.slice(0, 4),
      browsePlaces: orderPlacesForBrowse(featured, ranked),
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  const partners = withoutClaimed(
    zonePlaces.filter((place) => place.partner),
    claimed,
  );
  if (partners.length > 0) {
    const ranked = await rerankSectionPlacesAsync(partners, engineContext);
    const section: ZoneCarouselSection = {
      id: "partner",
      title: "제휴 예약 명소",
      places: ranked.slice(0, 4),
      browsePlaces: ranked,
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  const food = withoutClaimed(
    zonePlaces.filter((p) => ["market", "restaurant"].includes(p.category)),
    claimed,
  );
  if (food.length > 0) {
    const ranked = await rerankSectionPlacesAsync(food, engineContext);
    const featured = ranked.slice(0, 4).map((p) => p.id);
    const section: ZoneCarouselSection = {
      id: "local-food",
      title: "로컬 식사",
      places: ranked.slice(0, 4),
      browsePlaces: orderPlacesForBrowse(
        featured,
        ranked.length > 0
          ? ranked
          : zonePlaces.filter((p) => localFoodBrowseCategories.includes(p.category)),
      ),
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  const healing = withoutClaimed(
    zonePlaces.filter((p) => healingBrowseCategories.includes(p.category)),
    claimed,
  );
  if (healing.length > 0) {
    const ranked = await rerankSectionPlacesAsync(healing, engineContext);
    const featured = ranked.slice(0, 4).map((p) => p.id);
    const section: ZoneCarouselSection = {
      id: "healing",
      title: "여유 산책",
      places: ranked.slice(0, 4),
      browsePlaces: orderPlacesForBrowse(
        featured,
        ranked.length > 0
          ? ranked
          : withoutClaimed(
              zonePlaces.filter((p) => healingBrowseCategories.includes(p.category)),
              claimed,
            ),
      ),
    };
    sections.push(section);
    registerSectionClaims(section, claimed);
  }

  if (sections.length === 0 && zonePlaces.length > 0) {
    sections.push({
      id: "curated",
      title: "권역 큐레이션",
      places: zonePlaces.slice(0, 6),
      browsePlaces: zonePlaces,
    });
  }

  return sections;
}

export async function getZoneHomeBundleAsync(
  zoneId: TravelZoneId,
  engineContext?: EngineContext,
): Promise<ZoneHomeBundle> {
  const zone =
    getTravelZoneWithHero(zoneId) ??
    getTravelZoneWithHero("samcheok-donghae") ??
    ({
      id: "samcheok-donghae",
      label: "삼척·동해",
      intent: "동해안 실행 MVP",
      cities: "삼척 · 동해",
      available: true,
      gradient: "from-pine-deep via-pine to-mist",
    } satisfies TravelZoneOption);
  const executable = isZoneCatalogExecutable(zoneId);
  const carouselSections = await buildCarouselSectionsAsync(zoneId, engineContext);
  const natureRoad = getFeaturedNatureRoadForZone(zoneId);

  return {
    zone,
    executable,
    exploreTitle: "다음엔 이런 곳 어떠세요?",
    exploreSubtitle: `${zone.label} 권역 큐레이션`,
    carouselSections,
    natureRoad,
    passTeaser: passTeasersByZone[zoneId],
  };
}

export function getZoneHomeBundle(
  zoneId: TravelZoneId,
  engineContext?: EngineContext,
): ZoneHomeBundle {
  const zone =
    getTravelZoneWithHero(zoneId) ??
    getTravelZoneWithHero("samcheok-donghae") ??
    ({
      id: "samcheok-donghae",
      label: "삼척·동해",
      intent: "동해안 실행 MVP",
      cities: "삼척 · 동해",
      available: true,
      gradient: "from-pine-deep via-pine to-mist",
    } satisfies TravelZoneOption);
  const executable = isZoneCatalogExecutable(zoneId);
  const carouselSections = buildCarouselSections(zoneId, engineContext);
  const natureRoad = getFeaturedNatureRoadForZone(zoneId);

  return {
    zone,
    executable,
    exploreTitle: "다음엔 이런 곳 어떠세요?",
    exploreSubtitle: `${zone.label} 권역 큐레이션`,
    carouselSections,
    natureRoad,
    passTeaser: passTeasersByZone[zoneId],
  };
}

/** Samcheok/Donghae default sections — re-export for legacy imports */
export const carouselSections = buildCarouselSections("samcheok-donghae");
