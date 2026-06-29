import { getRuntimeCatalogPlaces } from "@/lib/catalogRuntime";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { isLodgingPlace } from "@/lib/placeLodging";
import { travelZones } from "@/data/mockRegionalFraming";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import type { ReservationHubCategoryMeta, ReservationOffer } from "@/types/reservationHub";
import type { TravelZoneId } from "@/types/travel";

export const reservationHubCategories: ReservationHubCategoryMeta[] = [
  {
    id: "stay",
    label: "숙소",
    description: "호텔·펜션·리조트",
  },
  {
    id: "transport",
    label: "교통",
    description: "KTX·고속버스",
  },
  {
    id: "rental",
    label: "렌트카",
    description: "픽업·반납 일정",
  },
  {
    id: "dining",
    label: "음식점",
    description: "현지 맛집·코스",
  },
  {
    id: "activity",
    label: "액티비티",
    description: "체험·레저·투어",
  },
  {
    id: "attraction",
    label: "관광지",
    description: "제휴 명소·입장",
  },
];

const samcheokStay = () =>
  getRuntimeCatalogPlaces().find((p) => p.id === "samcheok-cablecar");
const donghaeStay = () =>
  getRuntimeCatalogPlaces().find((p) => p.id === "mukho-lighthouse");

const stayOffers: ReservationOffer[] = [
  {
    id: "stay-samcheok-bay",
    category: "stay",
    zoneId: "samcheok-donghae",
    title: "삼척 오션뷰 스테이",
    subtitle: "삼척시 · 오션뷰",
    description: "장호항 도보 8분 · 체크인 15:00 · 조식 선택 가능. 동해안 일정의 베이스캠프로 추천합니다.",
    priceLabel: "1박 ₩128,000~",
    badge: "인기",
    gradient: "from-pine-deep via-pine to-mist",
    meta: "무료 취소 · 05.22",
    coordinates: samcheokStay()?.coordinates ?? { lat: 37.2891, lng: 129.3085 },
    address: "강원특별자치도 삼척시 장호항 인근",
  },
  {
    id: "stay-donghae-harbor",
    category: "stay",
    zoneId: "samcheok-donghae",
    title: "동해 항구 스테이",
    subtitle: "동해시 · 시티뷰",
    description: "항구 식당 거리와 가까워 저녁 일정 후 이동이 짧습니다.",
    priceLabel: "1박 ₩96,000~",
    gradient: "from-ink via-pine-deep to-mist",
    meta: "조식 포함",
    coordinates: donghaeStay()?.coordinates ?? { lat: 37.5516, lng: 129.1173 },
    address: "강원특별자치도 동해시 묵호항 인근",
  },
];

const ZONE_TRANSPORT: Record<
  TravelZoneId,
  { title: string; subtitle: string; busSubtitle: string; description: string; busDescription: string }
> = {
  "samcheok-donghae": {
    title: "KTX 동해선",
    subtitle: "서울 ↔ 동해·삼척",
    busSubtitle: "서울 ↔ 삼척·동해",
    description: "좌석·시간을 선택해 승차권을 확보합니다. 당일 이동 변수를 줄이는 첫 단계 예약입니다.",
    busDescription:
      "동해·삼척 터미널 연결 고속버스 시간·좌석을 선택합니다. 시내 버스는 일정·케어 경로에서 확인하세요.",
  },
  "gangneung-yangyang": {
    title: "KTX 강릉선",
    subtitle: "서울 ↔ 강릉",
    busSubtitle: "서울 ↔ 강릉·양양",
    description: "강릉·양양 권역 진입에 맞춘 열차 좌석을 선택합니다.",
    busDescription: "강릉·양양 터미널 연결 고속버스 회차를 선택합니다.",
  },
  "sokcho-goseong": {
    title: "KTX·ITX 속초 연결",
    subtitle: "서울 ↔ 속초·동해",
    busSubtitle: "서울 ↔ 속초·고성",
    description: "속초·고성 권역으로 이어지는 열차·버스 연결을 선택합니다.",
    busDescription: "속초·고성 고속버스 시간·좌석을 선택합니다.",
  },
  "pyeongchang-jeongseon": {
    title: "KTX·ITX 평창 연결",
    subtitle: "서울 ↔ 진부·평창",
    busSubtitle: "서울 ↔ 평창·횡성",
    description: "평창·정선 산악 권역 진입 열차·버스를 선택합니다.",
    busDescription: "평창·횡성 터미널 연결 고속버스를 선택합니다.",
  },
  "yeongwol-jeongseon": {
    title: "KTX·ITX 영월 연결",
    subtitle: "서울 ↔ 영월·정선",
    busSubtitle: "서울 ↔ 영월·정선",
    description: "동강·레저 권역으로 이어지는 열차·버스 연결을 선택합니다.",
    busDescription: "영월·정선 고속버스 회차를 선택합니다.",
  },
  "cheorwon-dmz": {
    title: "KTX·버스 철원 연결",
    subtitle: "서울 ↔ 철원·연천",
    busSubtitle: "서울 ↔ 철원·화천",
    description: "접경·DMZ 권역 진입 교통편을 선택합니다.",
    busDescription: "철원·화천 고속버스 시간·좌석을 선택합니다.",
  },
  "wonju-chuncheon": {
    title: "KTX·ITX 춘천선",
    subtitle: "서울 ↔ 춘천·원주",
    busSubtitle: "서울 ↔ 춘천·원주",
    description: "춘천·원주 권역 진입 열차·버스를 선택합니다.",
    busDescription: "춘천·원주 터미널 연결 고속버스를 선택합니다.",
  },
};

const ZONE_RENTAL: Record<
  TravelZoneId,
  { compactSubtitle: string; suvSubtitle: string; compactDescription: string; suvDescription: string }
> = {
  "samcheok-donghae": {
    compactSubtitle: "삼척역 픽업",
    suvSubtitle: "동해시 픽업",
    compactDescription: "협소 도로와 주차에 유리한 경차 기준 24시간 요금입니다.",
    suvDescription: "가족·짐이 많은 일정에 맞춘 넓은 차량 옵션입니다.",
  },
  "gangneung-yangyang": {
    compactSubtitle: "강릉역 픽업",
    suvSubtitle: "양양공항 인근",
    compactDescription: "해안·카페 거리 이동에 맞춘 경차 24시간 패키지입니다.",
    suvDescription: "서핑·캠핑 짐을 고려한 SUV 패밀리 옵션입니다.",
  },
  "sokcho-goseong": {
    compactSubtitle: "속초역 픽업",
    suvSubtitle: "속초 시내",
    compactDescription: "설악·해안 일정에 맞춘 경차 렌트입니다.",
    suvDescription: "가족 단위 설악·DMZ 동선에 맞춘 SUV 옵션입니다.",
  },
  "pyeongchang-jeongseon": {
    compactSubtitle: "진부역 픽업",
    suvSubtitle: "평창 알펜시아",
    compactDescription: "산악 도로·주차에 맞춘 경차 패키지입니다.",
    suvDescription: "스키·레저 짐을 고려한 SUV 패밀리 옵션입니다.",
  },
  "yeongwol-jeongseon": {
    compactSubtitle: "영월역 픽업",
    suvSubtitle: "정선 시내",
    compactDescription: "동강·레저 코스 이동용 경차 24시간 요금입니다.",
    suvDescription: "레저 장비·가족 여행에 맞춘 SUV 옵션입니다.",
  },
  "cheorwon-dmz": {
    compactSubtitle: "철원역 픽업",
    suvSubtitle: "철원 시내",
    compactDescription: "접경·평화로드 이동에 맞춘 경차 패키지입니다.",
    suvDescription: "DMZ·트레킹 일정에 맞춘 SUV 옵션입니다.",
  },
  "wonju-chuncheon": {
    compactSubtitle: "춘천역 픽업",
    suvSubtitle: "원주 시내",
    compactDescription: "호수·시장 일정에 맞춘 경차 24시간 요금입니다.",
    suvDescription: "가족·미식 일정에 맞춘 SUV 패밀리 옵션입니다.",
  },
};

function buildTransportOffersForZone(zoneId: TravelZoneId): ReservationOffer[] {
  const copy = ZONE_TRANSPORT[zoneId];
  return [
    {
      id: `transport-ktx-${zoneId}`,
      category: "transport",
      zoneId,
      title: copy.title,
      subtitle: copy.subtitle,
      description: copy.description,
      priceLabel: "편도 ₩28,600~",
      badge: "추천",
      gradient: "from-ink to-pine",
      meta: "좌석 선택 가능",
    },
    {
      id: `transport-bus-${zoneId}`,
      category: "transport",
      zoneId,
      title: "고속버스",
      subtitle: copy.busSubtitle,
      description: copy.busDescription,
      priceLabel: "편도 ₩24,000~",
      gradient: "from-pine to-mist",
      meta: "좌석 선택",
    },
  ];
}

function buildRentalOffersForZone(zoneId: TravelZoneId): ReservationOffer[] {
  const copy = ZONE_RENTAL[zoneId];
  return [
    {
      id: `rental-compact-${zoneId}`,
      category: "rental",
      zoneId,
      title: "경차 패키지",
      subtitle: copy.compactSubtitle,
      description: copy.compactDescription,
      priceLabel: "24h ₩68,000~",
      gradient: "from-pine-deep to-sand",
      meta: "보험 기본 포함",
    },
    {
      id: `rental-suv-${zoneId}`,
      category: "rental",
      zoneId,
      title: "SUV 패밀리",
      subtitle: copy.suvSubtitle,
      description: copy.suvDescription,
      priceLabel: "24h ₩92,000~",
      badge: "4인 추천",
      gradient: "from-ink via-pine to-sand",
      meta: "어린이 시트 가능",
    },
  ];
}

const transportOffers: ReservationOffer[] = buildTransportOffersForZone("samcheok-donghae");

const rentalOffers: ReservationOffer[] = buildRentalOffersForZone("samcheok-donghae");

const ZONE_ACTIVITY_EXTRAS: Partial<Record<TravelZoneId, ReservationOffer[]>> = {
  "samcheok-donghae": [
    {
      id: "activity-coastal-kayak",
      category: "activity",
      zoneId: "samcheok-donghae",
      title: "장호항 카약 투어",
      subtitle: "삼척 · 바다",
      description: "장호항에서 90분 가이드 카약. 일정 중간 갭타임에 넣기 좋은 액티비티입니다.",
      priceLabel: "1인 ₩45,000~",
      badge: "인기",
      gradient: "from-pine via-mist to-sand",
      meta: "오전·오후 회차",
    },
  ],
  "gangneung-yangyang": [
    {
      id: "activity-railbike",
      category: "activity",
      zoneId: "gangneung-yangyang",
      title: "정동진 레일바이크",
      subtitle: "강릉 인근 · 당일",
      description: "해안 레일바이크를 일정 전후에 붙이기 좋은 반일 코스입니다.",
      priceLabel: "2인 ₩38,000~",
      gradient: "from-ink to-pine-deep",
      meta: "예약 필수",
    },
  ],
};

function buildDiningOffersForZone(zoneId: TravelZoneId): ReservationOffer[] {
  return getRuntimeCatalogPlaces()
    .filter((place) => place.region === zoneId)
    .filter((place) => isDiningPlace(place))
    .slice(0, 20)
    .map((place) => ({
      id: `dining-${place.id}`,
      category: "dining" as const,
      zoneId: place.region,
      title: place.name,
      subtitle: travelZoneShortLabels[place.region],
      description: place.description,
      priceLabel: "좌석 예약",
      badge: place.partner ? "제휴" : undefined,
      gradient: place.gradient,
      imageUrl: place.imageUrl,
      meta: place.estimatedDuration,
    }));
}

function buildActivityOffersForZone(zoneId: TravelZoneId): ReservationOffer[] {
  const catalogActivities = getRuntimeCatalogPlaces()
    .filter((place) => place.region === zoneId)
    .filter((place) => place.category === "experience" || place.category === "cable-car" || place.category === "market")
    .filter((place) => !place.partner)
    .slice(0, 24)
    .map((place) => ({
      id: `activity-${place.id}`,
      category: "activity" as const,
      zoneId: place.region,
      title: place.name,
      subtitle: travelZoneShortLabels[place.region],
      description: place.description,
      priceLabel: "체험 예약",
      badge: place.category === "experience" ? "체험" : "레저",
      gradient: place.gradient,
      imageUrl: place.imageUrl,
      meta: place.estimatedDuration,
    }));

  return [...catalogActivities, ...(ZONE_ACTIVITY_EXTRAS[zoneId] ?? [])];
}

const ZONE_AGNOSTIC_CATEGORIES = new Set(["transport", "rental", "attraction"]);

function filterOffersByZone(offers: ReservationOffer[], zoneId?: TravelZoneId): ReservationOffer[] {
  if (!zoneId) return offers;
  return offers.filter((offer) => !offer.zoneId || offer.zoneId === zoneId);
}

export const reservationOffersByCategory = {
  stay: stayOffers,
  transport: transportOffers,
  rental: rentalOffers,
  dining: buildDiningOffersForZone("samcheok-donghae"),
  activity: buildActivityOffersForZone("samcheok-donghae"),
  attraction: [] as ReservationOffer[],
};

export function getReservationOffers(
  category: keyof typeof reservationOffersByCategory,
  zoneId?: TravelZoneId,
): ReservationOffer[] {
  if (category === "dining" && zoneId) {
    return buildDiningOffersForZone(zoneId);
  }
  if (category === "activity" && zoneId) {
    return buildActivityOffersForZone(zoneId);
  }
  if (category === "transport" && zoneId) {
    return buildTransportOffersForZone(zoneId);
  }
  if (category === "rental" && zoneId) {
    return buildRentalOffersForZone(zoneId);
  }

  const offers = reservationOffersByCategory[category];
  if (ZONE_AGNOSTIC_CATEGORIES.has(category)) {
    return offers;
  }
  return filterOffersByZone(offers, zoneId);
}

export function getReservationOfferById(offerId: string): ReservationOffer | undefined {
  for (const category of reservationHubCategories) {
    const found = getReservationOffers(category.id).find((offer) => offer.id === offerId);
    if (found) return found;
  }

  for (const zone of travelZones) {
    for (const category of ["dining", "activity", "transport", "rental"] as const) {
      const found = getReservationOffers(category, zone.id).find((offer) => offer.id === offerId);
      if (found) return found;
    }
  }

  return undefined;
}
