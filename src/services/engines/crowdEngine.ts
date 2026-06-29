import { isCavePlace, isCaveVisitDiscouraged } from "@/lib/caveVisitConditions";
import { resolveSigunguCodeForPlace } from "@/lib/sigunguResolver";
import { getSeasonFromDate } from "@/lib/regionalPreferences";
import {
  estimateCrowdFromRate,
  estimateWaitFromCrowd,
  getReservationRate,
} from "@/services/crowdService";
import {
  computeDataLabDemandScore,
} from "@/lib/tourDataLabScoring";
import {
  getCachedGangwonDataLabSnapshot,
  getSigunguBundleFromSnapshot,
} from "@/lib/tourDataLabSnapshot";
import { getCatalogPlaceCountByZone } from "@/data/placeCatalog";
import { fetchSearchFestival, fetchAttractionsForZone } from "@/services/external/tourGwService";
import type { VisitCrowdContext } from "@/services/engines/visitSignals";
import type { EngineContext } from "@/services/engines/engineContext";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type {
  CrowdConfidence,
  CrowdLevel,
  Place,
  ReservationSlot,
  SeasonId,
  TravelZoneId,
} from "@/types/travel";

export interface CrowdEstimate {
  level: CrowdLevel;
  expectedWait: string;
  confidence: CrowdConfidence;
  factors: {
    slotOccupancy?: number;
    timeOfDay?: string;
    season?: string;
    festivalNearby?: boolean;
    behaviorDemand?: number;
    weatherIndoorShift?: boolean;
    dataLabDemandScore?: number;
    dataLabSigungu?: string;
  };
}

/** 행동 프로필은 place id 기준이며, 레거시 slot id 키만 있을 때만 보조로 사용 */
function resolvePlaceAffinity(
  context: EngineContext,
  placeId: string,
  slotId: string,
): number {
  if (placeId) {
    const byPlace = context.behaviorProfile.placeAffinity[placeId];
    if (byPlace !== undefined) return byPlace;
  }
  return context.behaviorProfile.placeAffinity[slotId] ?? 0;
}

let regionalActivityCache: Map<TravelZoneId, { count: number; fetchedAt: number }> = new Map();
let regionalActivityInFlight: Map<TravelZoneId, Promise<number>> = new Map();
let festivalCache: { count: number; fetchedAt: number } | null = null;
let festivalPressureInFlight: Promise<number> | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getRegionalActivityDensity(zoneId: TravelZoneId): Promise<number> {
  const now = Date.now();
  const cached = regionalActivityCache.get(zoneId);
  if (cached && now - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.count;
  }

  const inFlight = regionalActivityInFlight.get(zoneId);
  if (inFlight) {
    return inFlight;
  }

  const catalogFallback = getCatalogPlaceCountByZone(zoneId);

  const request = (async () => {
    try {
      const items = await fetchAttractionsForZone(zoneId, { numOfRowsPerCity: 10 });
      const count = items.length > 0 ? items.length : catalogFallback;
      regionalActivityCache.set(zoneId, { count, fetchedAt: Date.now() });
      return count;
    } catch {
      return cached?.count ?? (catalogFallback || 40);
    } finally {
      regionalActivityInFlight.delete(zoneId);
    }
  })();

  regionalActivityInFlight.set(zoneId, request);
  return request;
}

async function getFestivalPressure(): Promise<number> {
  const now = Date.now();
  if (festivalCache && now - festivalCache.fetchedAt < CACHE_TTL_MS) {
    return festivalCache.count;
  }

  if (festivalPressureInFlight) {
    return festivalPressureInFlight;
  }

  festivalPressureInFlight = (async () => {
    try {
      const festivals = await fetchSearchFestival({ numOfRows: 8 });
      festivalCache = { count: festivals.length, fetchedAt: Date.now() };
      return festivals.length;
    } catch {
      return festivalCache?.count ?? 0;
    } finally {
      festivalPressureInFlight = null;
    }
  })();

  return festivalPressureInFlight;
}

function parseHour(timeLabel?: string): number {
  if (!timeLabel) return 12;
  const [h] = timeLabel.split(":").map(Number);
  return Number.isFinite(h) ? h : 12;
}

const HEURISTIC_CROWD_BASE = 22;

function categoryCrowdBias(category: Place["category"]): number {
  switch (category) {
    case "trail":
    case "cafe":
      return -10;
    case "market":
    case "restaurant":
      return -6;
    case "experience":
      return -2;
    case "sea":
    case "observatory":
      return 0;
    case "cable-car":
    case "cave":
      return 5;
    default:
      return 0;
  }
}

function timeOfDayBoost(hour: number): number {
  if (hour >= 11 && hour <= 13) return 10;
  if (hour >= 14 && hour <= 16) return 7;
  if (hour >= 10 && hour <= 17) return 3;
  return 0;
}

function seasonBoost(season: string): number {
  if (season === "summer") return 6;
  if (season === "autumn") return 5;
  if (season === "spring") return 4;
  return 2;
}

function behaviorBoost(place: Place, context: EngineContext): number {
  const affinity = context.behaviorProfile.placeAffinity[place.id] ?? 0;
  const category = context.behaviorProfile.categoryAffinity[place.category] ?? 0;
  return Math.min(affinity * 1.2 + category * 0.35, 12);
}

function regionalDensityBoost(density: number): number {
  if (density > 55) return 5;
  if (density > 35) return 2;
  return 0;
}

function computeHeuristicCrowdScore(
  place: Place,
  context: EngineContext,
  options: {
    hour: number;
    season: SeasonId;
    dataLabBoost: number;
    festivalNearby?: boolean;
    weatherIndoorShift?: boolean;
    weatherSummary?: string | null;
  },
): number {
  let score =
    HEURISTIC_CROWD_BASE +
    categoryCrowdBias(place.category) +
    timeOfDayBoost(options.hour) +
    seasonBoost(options.season) +
    behaviorBoost(place, context) +
    options.dataLabBoost;

  if (options.festivalNearby) {
    score += 5;
  }

  if (
    options.weatherIndoorShift &&
    ["market", "restaurant", "cafe"].includes(place.category)
  ) {
    score += 4;
  }

  if (
    isCavePlace(place) &&
    isCaveVisitDiscouraged({
      season: options.season,
      weatherSummary: options.weatherSummary,
    })
  ) {
    score += 12;
  }

  return Math.max(0, Math.min(95, Math.round(score)));
}

function crowdEstimateFromPartnerSlot(
  place: Place,
  slot: ReservationSlot,
  context: EngineContext,
  factors: CrowdEstimate["factors"],
): CrowdEstimate {
  const rate = getReservationRate(slot);
  const behavior = resolvePlaceAffinity(context, place.id, slot.id);
  const adjustedRate = Math.min(100, Math.max(0, Math.round(rate + behavior * 0.35)));
  const level = estimateCrowdFromRate(adjustedRate);
  factors.slotOccupancy = adjustedRate;

  return {
    level,
    expectedWait: estimateWaitFromCrowd(level, {
      occupancyRate: adjustedRate,
      category: place.category,
    }),
    confidence: "high",
    factors,
  };
}

function getDataLabBoost(place: Place): {
  boost: number;
  demandScore?: number;
  sigunguCode?: string;
  confidence: CrowdConfidence;
} {
  const snapshot = getCachedGangwonDataLabSnapshot();
  if (!snapshot) {
    return { boost: 0, confidence: "low" };
  }

  const sigunguCode = resolveSigunguCodeForPlace(place);
  const bundle = getSigunguBundleFromSnapshot(sigunguCode, snapshot);
  if (!bundle) {
    return { boost: 0, sigunguCode, confidence: "low" };
  }

  const demandScore = computeDataLabDemandScore(bundle);
  const boost = Math.round((demandScore - 50) * 0.22);
  return {
    boost: Math.max(-6, Math.min(10, boost)),
    demandScore,
    sigunguCode,
    confidence: "medium",
  };
}

export async function estimatePlaceCrowd(
  place: Place,
  context: EngineContext,
  options?: {
    timeLabel?: string;
    weatherIndoorShift?: boolean;
    weatherSummary?: string | null;
  },
): Promise<CrowdEstimate> {
  const season = getSeasonFromDate(context.travelDate);
  const hour = parseHour(options?.timeLabel);
  const dataLab = getDataLabBoost(place);
  const [regionalDensity, festivalCount] = await Promise.all([
    getRegionalActivityDensity(context.zoneId),
    getFestivalPressure(),
  ]);

  const factors: CrowdEstimate["factors"] = {
    timeOfDay: `${hour}시`,
    season,
    festivalNearby: festivalCount >= 5,
    behaviorDemand: behaviorBoost(place, context),
    weatherIndoorShift: options?.weatherIndoorShift,
    dataLabDemandScore: dataLab.demandScore,
    dataLabSigungu: dataLab.sigunguCode,
  };

  if (place.partner && place.availableSlots.length > 0) {
    const bestSlot = pickRecommendedSlot(place.availableSlots, context);
    return crowdEstimateFromPartnerSlot(place, bestSlot, context, factors);
  }

  let score = computeHeuristicCrowdScore(place, context, {
    hour,
    season,
    dataLabBoost: dataLab.boost,
    festivalNearby: factors.festivalNearby,
    weatherIndoorShift: options?.weatherIndoorShift,
    weatherSummary: options?.weatherSummary,
  });
  score = Math.min(95, score + regionalDensityBoost(regionalDensity));

  const level = estimateCrowdFromRate(score);
  return {
    level,
    expectedWait: estimateWaitFromCrowd(level, {
      occupancyRate: score,
      category: place.category,
    }),
    confidence: dataLab.confidence,
    factors,
  };
}

export function estimateSlotCrowd(
  slot: ReservationSlot,
  context: EngineContext,
  placeCategory?: Place["category"],
): CrowdEstimate {
  const rate = getReservationRate(slot);
  const behavior = resolvePlaceAffinity(context, slot.placeId, slot.id);
  const adjustedRate = Math.min(100, Math.max(0, Math.round(rate + behavior * 0.35)));
  const level = estimateCrowdFromRate(adjustedRate);

  return {
    level,
    expectedWait: estimateWaitFromCrowd(level, {
      occupancyRate: adjustedRate,
      category: placeCategory,
    }),
    confidence: "high",
    factors: { slotOccupancy: adjustedRate },
  };
}

/** Sync estimate for care/UI paths that cannot await Tour GW cache. */
export function estimatePlaceCrowdQuick(
  place: Place,
  context: EngineContext,
  options?: {
    timeLabel?: string;
    weatherIndoorShift?: boolean;
    weatherSummary?: string | null;
  },
): CrowdEstimate {
  const season = getSeasonFromDate(context.travelDate);
  const hour = parseHour(options?.timeLabel);
  const dataLab = getDataLabBoost(place);
  const factors: CrowdEstimate["factors"] = {
    timeOfDay: `${hour}시`,
    season,
    behaviorDemand: behaviorBoost(place, context),
    weatherIndoorShift: options?.weatherIndoorShift,
    dataLabDemandScore: dataLab.demandScore,
    dataLabSigungu: dataLab.sigunguCode,
  };

  if (place.partner && place.availableSlots.length > 0) {
    const bestSlot = pickRecommendedSlot(place.availableSlots, context);
    return crowdEstimateFromPartnerSlot(place, bestSlot, context, factors);
  }

  const score = computeHeuristicCrowdScore(place, context, {
    hour,
    season,
    dataLabBoost: dataLab.boost,
    weatherIndoorShift: options?.weatherIndoorShift,
    weatherSummary: options?.weatherSummary,
  });

  const level = estimateCrowdFromRate(score);
  return {
    level,
    expectedWait: estimateWaitFromCrowd(level, {
      occupancyRate: score,
      category: place.category,
    }),
    confidence: dataLab.confidence,
    factors,
  };
}

/** Batch async estimates (Tour GW festival/region signals included). */
export async function buildCrowdByPlaceId(
  placeIds: string[],
  context: EngineContext,
  options?: VisitCrowdContext & { quick?: boolean },
): Promise<Record<string, CrowdEstimate>> {
  const uniqueIds = [...new Set(placeIds)];
  const useQuick = options?.quick ?? context.crowdMode === "quick";
  const entries = await Promise.all(
    uniqueIds.map(async (placeId) => {
      const place = getCatalogPlaceById(placeId);
      if (!place) return null;
      const estimate = useQuick
        ? estimatePlaceCrowdQuick(place, context, {
            timeLabel: options?.timeLabelByPlaceId?.[placeId],
            weatherIndoorShift: options?.weatherIndoorShift,
            weatherSummary: options?.weatherSummary,
          })
        : await estimatePlaceCrowd(place, context, {
            timeLabel: options?.timeLabelByPlaceId?.[placeId],
            weatherIndoorShift: options?.weatherIndoorShift,
            weatherSummary: options?.weatherSummary,
          });
      return [placeId, estimate] as const;
    }),
  );

  return Object.fromEntries(
    entries.filter((entry): entry is readonly [string, CrowdEstimate] => entry !== null),
  );
}

export function pickRecommendedSlot(
  slots: ReservationSlot[],
  context: EngineContext,
): ReservationSlot {
  if (slots.length === 0) {
    throw new Error("No slots available");
  }

  const scored = slots.map((slot) => {
    const rate = getReservationRate(slot);
    const crowdPenalty =
      slot.crowdLevel === "very-high"
        ? 40
        : slot.crowdLevel === "high"
          ? 25
          : slot.crowdLevel === "moderate"
            ? 10
            : 0;
    const behavior = resolvePlaceAffinity(context, slot.placeId, slot.id);
    return { slot, score: rate + crowdPenalty - behavior * 2 };
  });

  scored.sort((a, b) => a.score - b.score);
  return scored[0].slot;
}
