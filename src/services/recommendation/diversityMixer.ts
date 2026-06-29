import type { RankedRecommendation } from "@/services/recommendation/recommendationRanker";

export interface RecommendationSection {
  id: string;
  title: string;
  items: RankedRecommendation[];
}

/** 섹션당 노출 카드 수 */
export const RECOMMENDATION_ITEMS_PER_SECTION = 8;

/** 더보기 섹션 노출 카드 수 */
export const RECOMMENDATION_MORE_SECTION_COUNT = 12;

interface SectionSpec {
  id: string;
  title: string;
  keyword: RegExp;
}

const SECTION_SPECS: SectionSpec[] = [
  { id: "today-weather", title: "오늘 날씨에 잘 맞는 곳", keyword: /전시|박물|카페|실내|온천|사우나/ },
  { id: "ocean-view", title: "바다를 보고 싶은 날", keyword: /해변|비치|영금|전망|등대|항구|포구/ },
  { id: "local-taste", title: "강원도다운 맛", keyword: /시장|식당|맛집|횟집|숯불|커피|빵/ },
  { id: "hidden", title: "분위기가 다른 대안", keyword: /산|계곡|숲|트레킹|드라이브|캠핑|체험|공원/ },
];

function takeUnique(
  pool: RankedRecommendation[],
  usedIds: Set<string>,
  predicate: (item: RankedRecommendation) => boolean,
  count: number,
): RankedRecommendation[] {
  const picked: RankedRecommendation[] = [];
  for (const item of pool) {
    if (usedIds.has(item.place.id)) continue;
    if (!predicate(item)) continue;
    picked.push(item);
    usedIds.add(item.place.id);
    if (picked.length >= count) break;
  }
  return picked;
}

function fillSection(
  pool: RankedRecommendation[],
  usedIds: Set<string>,
  keyword: RegExp,
  count: number,
): RankedRecommendation[] {
  const byKeyword = takeUnique(pool, usedIds, (item) => keyword.test(item.place.name), count);
  if (byKeyword.length >= count) return byKeyword;
  const filler = takeUnique(pool, usedIds, () => true, count - byKeyword.length);
  return [...byKeyword, ...filler];
}

function buildAlternativeSection(
  pool: RankedRecommendation[],
  usedIds: Set<string>,
  priorItems: RankedRecommendation[],
  count: number,
): RankedRecommendation[] {
  const dominantBuckets = new Set(priorItems.map((item) => item.zoneBucket));
  const byAltBucket = takeUnique(
    pool,
    usedIds,
    (item) => !dominantBuckets.has(item.zoneBucket),
    count,
  );
  if (byAltBucket.length >= count) return byAltBucket;

  const byAltKeyword = takeUnique(
    pool,
    usedIds,
    (item) => SECTION_SPECS[3].keyword.test(item.place.name),
    count - byAltBucket.length,
  );
  const combined = [...byAltBucket, ...byAltKeyword];
  if (combined.length >= count) return combined;

  const filler = takeUnique(pool, usedIds, () => true, count - combined.length);
  return [...combined, ...filler];
}

export function buildRecommendationSections(
  ranked: RankedRecommendation[],
  itemsPerSection: number = RECOMMENDATION_ITEMS_PER_SECTION,
): RecommendationSection[] {
  const pool = ranked;
  const usedIds = new Set<string>();
  const sections: RecommendationSection[] = [];
  const priorItems: RankedRecommendation[] = [];

  for (let index = 0; index < SECTION_SPECS.length; index += 1) {
    const spec = SECTION_SPECS[index];
    const items =
      spec.id === "hidden"
        ? buildAlternativeSection(pool, usedIds, priorItems, itemsPerSection)
        : fillSection(pool, usedIds, spec.keyword, itemsPerSection);

    if (items.length === 0) continue;
    priorItems.push(...items);
    sections.push({ id: spec.id, title: spec.title, items });
  }

  const moreItems = takeUnique(pool, usedIds, () => true, RECOMMENDATION_MORE_SECTION_COUNT);
  if (moreItems.length > 0) {
    sections.push({ id: "more", title: "더 둘러보기", items: moreItems });
  }

  return sections;
}

/** 섹션 간 place id 중복 여부 (테스트·검증용) */
export function countDuplicatePlaceIdsAcrossSections(
  sections: RecommendationSection[],
): number {
  const seen = new Set<string>();
  let duplicates = 0;
  for (const section of sections) {
    for (const item of section.items) {
      if (seen.has(item.place.id)) duplicates += 1;
      else seen.add(item.place.id);
    }
  }
  return duplicates;
}
