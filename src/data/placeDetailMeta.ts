import { formatDistanceKm, getDistanceKm } from "@/lib/geoUtils";
import type { EngineContext } from "@/services/engines/engineContext";
import { rankPlaces } from "@/services/engines/personalizationRanker";
import { getCatalogPlaceById, getCatalogPlaces } from "@/services/placeGeocodeService";
import type { Place } from "@/types/travel";

export interface PlaceEditorialSection {
  title: string;
  body: string;
  gradient: string;
}

export interface PlaceWeeklyHours {
  day: string;
  hours: string;
}

export interface PlaceDetailMeta {
  address: string;
  phone?: string;
  website?: string;
  saveCount: number;
  editorialSections: PlaceEditorialSection[];
  amenities: string[];
  nearbyPlaceIds: string[];
  weeklyHours: PlaceWeeklyHours[];
}

const regionAddressBase = "강원 ";

const detailOverrides: Record<string, Partial<PlaceDetailMeta>> = {
  "hwanseon-cave": {
    address: "강원 삼척시 신기동 산 50",
    phone: "033-575-3662",
    website: "https://www.samcheok.go.kr",
    saveCount: 284,
    editorialSections: [
      {
        title: "입구에서 시작되는 동굴 서사",
        body: "환선굴은 삼척을 대표하는 동굴로, 짧은 이동 동선 안에서도 규모감 있는 공간을 경험할 수 있습니다. 오전 첫 타임 예약이 있으면 혼잡 피크 전에 여유 있게 둘러볼 수 있습니다.",
        gradient: "from-pine-deep via-pine to-mist",
      },
      {
        title: "실행 일정에 넣을 때",
        body: "제휴 예약·QR 입장·혼잡 안내가 한 흐름으로 이어지는 대표 포인트입니다. 동굴 이후 해안·케이블카 일정으로 자연스럽게 확장하기 좋습니다.",
        gradient: "from-ink via-pine-deep to-sand",
      },
    ],
    amenities: ["주차 가능", "화장실", "유모차 일부 구간", "제휴 예약"],
    nearbyPlaceIds: ["daegum-cave", "nongol-alley", "samcheok-market"],
  },
  "samcheok-cablecar": {
    address: "강원 삼척시 근덕면 삼척로 648",
    phone: "033-570-3000",
    saveCount: 196,
    editorialSections: [
      {
        title: "해상 전망의 리듬",
        body: "케이블카는 오후 시간대 혼잡이 뚜렷한 제휴 액티비티입니다. 슬롯을 미리 고르면 대기 예상 시간을 일정 카드에서 바로 확인할 수 있습니다.",
        gradient: "from-pine via-mist to-sand",
      },
    ],
    amenities: ["주차 가능", "화장실", "시간대 예약", "QR 입장"],
    nearbyPlaceIds: ["jangho-port", "mukho-lighthouse", "mukho-roastery"],
  },
  "jangho-port": {
    address: "강원 삼척시 장호항길 일대",
    saveCount: 142,
    editorialSections: [
      {
        title: "항구 산책의 여백",
        body: "케이블카·등대 일정 사이 속도를 낮추는 해안 거점입니다. 바다 바람과 항구 풍경을 짧게 즐기기 좋습니다.",
        gradient: "from-mist via-ivory to-sand",
      },
    ],
    amenities: ["상시 개방", "산책로", "근처 식사"],
    nearbyPlaceIds: ["samcheok-cablecar", "mukho-lighthouse", "donghae-harbor-table"],
  },
  "nongol-alley": {
    address: "강원 삼척시 남양동 논골길",
    saveCount: 118,
    editorialSections: [
      {
        title: "골목 산책의 로컬 감성",
        body: "벽화와 골목이 이어지는 짧은 산책 코스로, 혼잡한 시간 사이 여백을 메우기 좋습니다.",
        gradient: "from-stone-warm via-sand to-ivory",
      },
    ],
    nearbyPlaceIds: ["hwanseon-cave", "samcheok-market", "daegum-cave"],
  },
};

function buildWeeklyHours(place: Place): PlaceWeeklyHours[] {
  const hours = place.operatingHours;
  const days = ["월", "화", "수", "목", "금", "토", "일"];
  return days.map((day) => ({ day, hours }));
}

function buildDefaultEditorial(place: Place): PlaceEditorialSection[] {
  return [
    {
      title: place.signature,
      body: place.description,
      gradient: place.gradient,
    },
    {
      title: "ODRÉ 실행 포인트",
      body: place.recommendationReason,
      gradient: "from-pine-deep via-pine to-mist",
    },
  ];
}

function buildDefaultMeta(place: Place): PlaceDetailMeta {
  const others = getCatalogPlaces()
    .filter((candidate) => candidate.id !== place.id && candidate.region === place.region)
    .sort(
      (a, b) =>
        getDistanceKm(place.coordinates, a.coordinates) -
        getDistanceKm(place.coordinates, b.coordinates),
    )
    .slice(0, 4)
    .map((candidate) => candidate.id);

  const address = place.id.startsWith("tour-")
    ? place.description.split("·").slice(1).join("·").trim() || place.distanceNote
    : `${regionAddressBase}${place.name} 일대 · ${place.distanceNote}`;

  return {
    address,
    phone: place.contactPhone,
    saveCount: 80 + place.name.length * 3,
    editorialSections: buildDefaultEditorial(place),
    amenities: [
      place.reservationRequired ? "예약 권장" : "예약 불필요",
      place.partner ? "ODRÉ 제휴" : "자유 방문",
      `체류 ${place.estimatedDuration}`,
    ],
    nearbyPlaceIds: others,
    weeklyHours: buildWeeklyHours(place),
  };
}

export function getPlaceDetailMeta(place: Place): PlaceDetailMeta {
  const override = detailOverrides[place.id];
  const base = buildDefaultMeta(place);
  return {
    ...base,
    ...override,
    editorialSections: override?.editorialSections ?? base.editorialSections,
    amenities: override?.amenities ?? base.amenities,
    nearbyPlaceIds: override?.nearbyPlaceIds ?? base.nearbyPlaceIds,
    weeklyHours: override?.weeklyHours ?? base.weeklyHours,
  };
}

export function getPlaceById(placeId: string): Place | undefined {
  return getCatalogPlaceById(placeId);
}

export interface NearbyPlaceItem {
  place: Place;
  distanceLabel: string;
}

export function getNearbyPlaces(
  place: Place,
  engineContext?: EngineContext,
): NearbyPlaceItem[] {
  const meta = getPlaceDetailMeta(place);
  const candidates = meta.nearbyPlaceIds
    .map((id) => getCatalogPlaceById(id))
    .filter((candidate): candidate is Place => Boolean(candidate));

  const ordered = engineContext
    ? rankPlaces(
        candidates.map((p) => p.id),
        engineContext,
        {
          anchorCoordinates: place.coordinates,
          excludeIds: [place.id],
        },
      )
        .map((ranked) => candidates.find((p) => p.id === ranked.placeId))
        .filter((candidate): candidate is Place => Boolean(candidate))
    : [...candidates].sort(
        (a, b) =>
          getDistanceKm(place.coordinates, a.coordinates) -
          getDistanceKm(place.coordinates, b.coordinates),
      );

  return ordered.map((nearby) => ({
    place: nearby,
    distanceLabel: formatDistanceKm(place.coordinates, nearby.coordinates),
  }));
}

export function getKakaoMapLink(place: Place) {
  return `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.coordinates.lat},${place.coordinates.lng}`;
}
