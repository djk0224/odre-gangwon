import { GANGWON_TRAVEL_ZONE_IDS } from "@/lib/gangwonZoneAvailability";
import { balanceCatalogChunks } from "@/lib/ragCorpusBalance";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import { getNatureRoadCourse } from "@/services/natureRoadCatalog";
import { listGangwonRestaurants, listSbizCommerce } from "@/services/external/localDatasetService";
import type { RagChunk } from "@/services/ai/concierge/types";

const FAQ_CHUNKS: RagChunk[] = [
  {
    id: "faq-reservation",
    source: "faq",
    title: "예약·QR",
    text: "7개 권역 제휴·관광지는 예약 탭과 일정에서 슬롯을 고르고 mock 결제 후 QR 티켓을 받을 수 있습니다. 혼잡·대기는 슬롯·케어에 표시됩니다.",
  },
  {
    id: "faq-transit",
    source: "faq",
    title: "교통",
    text: "권역별 시외·KTX·버스는 예약 허브 교통 카테고리와 TAGO 연동(키 설정 시)으로 안내합니다. 삼척·동해권은 현리시외버스터미널 등 데모 정류소 기준 실시간 도착을 볼 수 있습니다.",
  },
  {
    id: "faq-nature-road",
    source: "faq",
    title: "네이처로드",
    text: "강원 네이처로드 7코스는 권역별로 홈 카드에 연결됩니다. 삼척·동해 6코스는 AI 드라이브 일정까지 바로 생성할 수 있고, 다른 권역도 코스·명소 데이터로 검색·일정에 반영됩니다.",
  },
  {
    id: "faq-zones",
    source: "faq",
    title: "강원 7권역",
    text: "삼척·동해, 강릉·양양, 속초·고성, 평창·횡성, 영월·정선·태백, 철원·접경, 원주·춘천 권역으로 장소·일정·AI 비서가 연결됩니다. 홈에서 권역을 바꾸면 큐레이션·패스·스탬프가 함께 바뀝니다.",
  },
];

let cachedChunks: RagChunk[] | null = null;

function buildNatureRoadChunks(courseId: number): RagChunk[] {
  const course = getNatureRoadCourse(courseId);
  if (!course) return [];

  const chunks: RagChunk[] = [
    {
      id: `nature-${courseId}-overview`,
      source: "nature-road",
      title: `${course.name} ${course.roadName}`,
      text: `${course.description} 구간 요약: ${course.routeSummary}`,
      courseId,
    },
  ];

  for (const spot of course.viewPoints.slice(0, 12)) {
    chunks.push({
      id: `nature-${courseId}-spot-${spot.idx}`,
      source: "nature-road",
      title: spot.spotName,
      text: `${spot.text} ${spot.address ?? ""} ${spot.type}`,
      courseId,
    });
  }

  for (const section of course.guideSections.slice(0, 4)) {
    for (const store of section.stores.slice(0, 3)) {
      chunks.push({
        id: `nature-${courseId}-guide-${store.idx}`,
        source: "nature-road",
        title: `${section.guideSubText} · ${store.name}`,
        text: `${store.text} ${store.address ?? ""}`,
        courseId,
      });
    }
  }

  return chunks;
}

function buildAllNatureRoadChunks(): RagChunk[] {
  const ids = [1, 2, 3, 4, 5, 6, 7];
  return ids.flatMap((courseId) => buildNatureRoadChunks(courseId));
}

function buildRestaurantChunks(limitPerZone: number): RagChunk[] {
  const chunks: RagChunk[] = [];
  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    const rows = listGangwonRestaurants({ zoneId, limit: limitPerZone });
    for (const row of rows) {
      chunks.push({
        id: `restaurant-${row.id}`,
        source: "restaurant",
        title: row.name,
        text: `${row.city} ${row.cuisineType} ${row.address ?? ""} · ${zoneId}`,
      });
    }
  }
  return chunks;
}

function buildCommerceChunks(limitPerZone: number): RagChunk[] {
  const chunks: RagChunk[] = [];
  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    const rows = listSbizCommerce({ zoneId, limit: limitPerZone });
    for (const row of rows) {
      chunks.push({
        id: `commerce-${row.id}`,
        source: "commerce",
        title: row.name,
        text: `${row.city} ${row.categoryLarge} ${row.categoryMid} ${row.address ?? ""} · ${zoneId}`,
      });
    }
  }
  return chunks;
}

/** 임베딩 생성용 — BM25 전체 인덱스 중 시맨틱 검색 대상 서브셋 */
export function getRagChunksForEmbedding(options?: { full?: boolean }): RagChunk[] {
  const all = getRagChunks();
  const faq = all.filter((c) => c.source === "faq");
  const nature = all.filter((c) => c.source === "nature-road");
  const catalogAll = all.filter((c) => c.source === "catalog");
  const restaurantsAll = all.filter((c) => c.source === "restaurant");
  const commerceAll = all.filter((c) => c.source === "commerce");

  if (options?.full) {
    return [
      ...faq,
      ...nature,
      ...balanceCatalogChunks(catalogAll, 280),
      ...restaurantsAll.slice(0, 140),
      ...commerceAll.slice(0, 100),
    ];
  }

  return [
    ...faq,
    ...nature,
    ...balanceCatalogChunks(catalogAll, 140),
    ...restaurantsAll.slice(0, 70),
    ...commerceAll.slice(0, 50),
  ];
}

export function getRagChunks(): RagChunk[] {
  if (cachedChunks) return cachedChunks;

  const chunks: RagChunk[] = [...FAQ_CHUNKS];

  for (const place of getCatalogPlaces()) {
    chunks.push({
      id: `place-${place.id}`,
      source: "catalog",
      title: place.name,
      text: [
        place.description,
        place.category,
        place.tags.join(" "),
        place.signature,
        place.region,
        place.reservationRequired ? "예약 필요" : "",
        place.partner ? "제휴" : "",
      ]
        .filter(Boolean)
        .join(" · "),
      placeId: place.id,
    });
  }

  chunks.push(...buildAllNatureRoadChunks());
  chunks.push(...buildRestaurantChunks(40));
  chunks.push(...buildCommerceChunks(25));

  cachedChunks = chunks;
  return chunks;
}

/** 테스트·스크립트·임베딩 빌드용 */
export function resetRagIndexCache() {
  cachedChunks = null;
}
