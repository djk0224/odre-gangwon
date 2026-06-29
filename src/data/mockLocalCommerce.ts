import type { LocalCommerceOffer, SeasonId, TravelZoneId, TripTheme } from "@/types/travel";

export const routeLocalOffers: LocalCommerceOffer[] = [
  {
    id: "local-samcheok-market",
    name: "삼척중앙시장",
    category: "market",
    couponLabel: "오징어순대 ₩2,000 할인",
    discount: "로컬상권 10%",
    routeNote: "점심 이동 경로상 · 시장 투어 30분",
    coordinates: { lat: 37.4455, lng: 129.1621 },
    zoneId: "samcheok-donghae",
  },
  {
    id: "local-mukho-roastery",
    name: "묵호 로스터리",
    category: "cafe",
    couponLabel: "아메리카노 1+1",
    discount: "강원 패스 제휴",
    routeNote: "해안 드라이브 경유 · 갭타임 20분",
    coordinates: { lat: 37.2398, lng: 129.3521 },
    zoneId: "samcheok-donghae",
  },
  {
    id: "local-donghae-harbor",
    name: "동해항 맛집 골목",
    category: "restaurant",
    couponLabel: "해산물 정식 ₩5,000",
    discount: "방문 인증 시",
    routeNote: "저녁 슬롯 전 · 항구 산책과 연결",
    coordinates: { lat: 37.2412, lng: 129.3588 },
    zoneId: "samcheok-donghae",
  },
  {
    id: "local-jangho-cafe",
    name: "장호항 카페 거리",
    category: "cafe",
    couponLabel: "음료 ₩1,500",
    discount: "스탬프 1칸 적립",
    routeNote: "케이블카 이동 전 휴식",
    coordinates: { lat: 37.2465, lng: 129.3465 },
    zoneId: "samcheok-donghae",
  },
  {
    id: "local-gangneung-coffee",
    name: "안목 커피거리",
    category: "cafe",
    couponLabel: "핸드드립 1+1",
    discount: "강릉 패스 제휴",
    routeNote: "해안 드라이브 갭타임 25분",
    coordinates: { lat: 37.772, lng: 128.946 },
    zoneId: "gangneung-yangyang",
  },
  {
    id: "local-sokcho-market",
    name: "속초 중앙시장",
    category: "market",
    couponLabel: "아바이순대 ₩2,000",
    discount: "로컬상권 10%",
    routeNote: "점심 전 · 항구 산책과 연결",
    coordinates: { lat: 38.207, lng: 128.591 },
    zoneId: "sokcho-goseong",
  },
  {
    id: "local-pyeongchang-cheese",
    name: "평창 치즈마을",
    category: "restaurant",
    couponLabel: "치즈플레이트 ₩3,000",
    discount: "방문 인증 시",
    routeNote: "산악 드라이브 경유",
    coordinates: { lat: 37.37, lng: 128.39 },
    zoneId: "pyeongchang-jeongseon",
  },
  {
    id: "local-yeongwol-donggang",
    name: "동강 카페",
    category: "cafe",
    couponLabel: "음료 ₩2,000",
    discount: "스탬프 1칸",
    routeNote: "레저 전후 휴식",
    coordinates: { lat: 37.183, lng: 128.461 },
    zoneId: "yeongwol-jeongseon",
  },
  {
    id: "local-cheorwon-farm",
    name: "철원 로컬 농산",
    category: "market",
    couponLabel: "농산 ₩3,000",
    discount: "접경 테마",
    routeNote: "DMZ 코스 전후",
    coordinates: { lat: 38.146, lng: 127.313 },
    zoneId: "cheorwon-dmz",
  },
  {
    id: "local-chuncheon-dakgalbi",
    name: "춘천 닭갈비 골목",
    category: "restaurant",
    couponLabel: "1인분 ₩2,000",
    discount: "로컬상권 10%",
    routeNote: "저녁 슬롯 전",
    coordinates: { lat: 37.881, lng: 127.729 },
    zoneId: "wonju-chuncheon",
  },
];

const themeOfferPriority: Record<TripTheme, string[]> = {
  culture: ["local-samcheok-market", "local-sokcho-market", "local-chuncheon-dakgalbi"],
  activity: ["local-jangho-cafe", "local-gangneung-coffee", "local-yeongwol-donggang"],
  history: ["local-cheorwon-farm", "local-samcheok-market", "local-sokcho-market"],
  experience: ["local-jangho-cafe", "local-pyeongchang-cheese", "local-yeongwol-donggang"],
  nature: ["local-mukho-roastery", "local-gangneung-coffee", "local-jangho-cafe"],
  rest: ["local-mukho-roastery", "local-gangneung-coffee", "local-yeongwol-donggang"],
};

const seasonOfferBias: Record<SeasonId, string> = {
  spring: "local-jangho-cafe",
  summer: "local-mukho-roastery",
  autumn: "local-samcheok-market",
  winter: "local-pyeongchang-cheese",
};

export function pickRouteLocalOffers(
  themes: TripTheme[],
  season: SeasonId,
  maxCount = 2,
  zoneId?: TravelZoneId,
): LocalCommerceOffer[] {
  const pool = zoneId
    ? routeLocalOffers.filter((offer) => offer.zoneId === zoneId)
    : routeLocalOffers;

  const priority = [
    ...(pool.find((o) => o.id === seasonOfferBias[season]) ? [seasonOfferBias[season]] : []),
    ...themes.flatMap((theme) => themeOfferPriority[theme] ?? []),
    ...pool.map((o) => o.id),
  ];

  const seen = new Set<string>();
  const result: LocalCommerceOffer[] = [];

  for (const id of priority) {
    if (result.length >= maxCount) break;
    if (seen.has(id)) continue;
    const offer = pool.find((o) => o.id === id);
    if (!offer) continue;
    seen.add(id);
    result.push(offer);
  }

  return result;
}
