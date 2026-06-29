import { shouldSkipCavePlace } from "@/lib/caveVisitConditions";
import { resolveRankingWeights } from "@/config/rankingWeights";
import { getDistanceKm } from "@/lib/geoUtils";
import { resolveEffectiveThemes } from "@/lib/regionalPreferences";
import { getPlaceInterestCategories } from "@/lib/placeInterests";
import type { EngineContext } from "@/services/engines/engineContext";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import { buildCrowdByPlaceId, type CrowdEstimate } from "@/services/engines/crowdEngine";
import { buildVisitCrowdContext } from "@/services/engines/visitSignals";
import type { Place, TripTheme } from "@/types/travel";

export interface RankedPlace {
  placeId: string;
  score: number;
  reasons: string[];
}

function themeMatchScore(themes: TripTheme[], place: Place): number {
  if (themes.length === 0) return 0.5;
  const interests = getPlaceInterestCategories(place);
  const hits = themes.filter((theme) => interests.includes(theme)).length;
  if (hits > 0) return Math.min(1, 0.55 + hits * 0.2);
  if ((place.tags ?? []).some((tag) => themes.some((theme) => tag.includes(theme)))) {
    return 0.45;
  }
  return 0.2;
}

function crowdPenalty(level: CrowdEstimate["level"], pace: string): number {
  const base =
    level === "very-high" ? 1 : level === "high" ? 0.75 : level === "moderate" ? 0.4 : 0.1;
  if (pace === "relaxed") return base;
  if (pace === "packed") return base * 0.6;
  return base * 0.85;
}

export function rankPlaces(
  placeIds: string[],
  context: EngineContext,
  options?: {
    excludeIds?: string[];
    anchorCoordinates?: { lat: number; lng: number };
    crowdByPlaceId?: Record<string, CrowdEstimate>;
    limit?: number;
    weatherIndoorShift?: boolean;
    /** 동선 후보는 거리보다 테마·혼잡·제휴 우선 (먼 곳도 포함) */
    deemphasizeProximity?: boolean;
    weatherSummary?: string | null;
  },
): RankedPlace[] {
  const weights = resolveRankingWeights({
    transportation: context.preferences.transportation,
    companion: context.preferences.companion,
    pace: context.preferences.pace,
  });

  const themes = resolveEffectiveThemes(context.preferences);
  const exclude = new Set(options?.excludeIds ?? []);
  const recentSet = new Set(context.recentPlaceIds);
  const savedSet = new Set(context.savedPlaceIds);

  const ranked: RankedPlace[] = [];

  for (const placeId of placeIds) {
    if (exclude.has(placeId)) continue;
    const place = getCatalogPlaceById(placeId);
    if (!place || place.region !== context.zoneId) continue;

    const reasons: string[] = [];
    let score = 0;

    const tScore = themeMatchScore(themes, place);
    score += weights.themeMatch * tScore;
    if (tScore > 0.7) reasons.push("테마 적합");

    const beh = Math.min(
      (context.behaviorProfile.placeAffinity[place.id] ?? 0) / 10,
      1,
    );
    score += weights.behavior * beh;
    if (beh > 0.3) reasons.push("최근 관심");

    if (savedSet.has(place.id)) {
      score += weights.saved;
      reasons.push("찜한 곳");
    }

    if (place.partner) {
      score += weights.partner;
      reasons.push("제휴·예약");
    }

    const crowd = options?.crowdByPlaceId?.[place.id];
    if (crowd) {
      score -= weights.crowdPenalty * crowdPenalty(crowd.level, context.preferences.pace);
      if (crowd.level === "high" || crowd.level === "very-high") {
        reasons.push("혼잡 주의");
      }
    }

    const proximityScaleKm = options?.deemphasizeProximity ? 120 : 25;
    const proximityCap = options?.deemphasizeProximity ? 0.12 : 1;

    if (options?.anchorCoordinates) {
      const km = getDistanceKm(options.anchorCoordinates, place.coordinates);
      const prox = Math.min(proximityCap, Math.max(0, 1 - km / proximityScaleKm));
      score += weights.proximity * prox;
      if (!options.deemphasizeProximity && prox > 0.5) reasons.push("동선 근접");
    } else if (context.anchorPlaceId && !options?.deemphasizeProximity) {
      const anchor = getCatalogPlaceById(context.anchorPlaceId);
      if (anchor) {
        const km = getDistanceKm(anchor.coordinates, place.coordinates);
        const prox = Math.max(0, 1 - km / 30);
        score += weights.proximity * prox;
      }
    }

    if (recentSet.has(place.id)) {
      score -= weights.recencyPenalty;
    }

    if (
      shouldSkipCavePlace(place, {
        season: context.preferences.season,
        anchorPlaceId: context.anchorPlaceId,
        weatherSummary: options?.weatherSummary,
      })
    ) {
      score -= 0.4;
      reasons.push("겨울·강수 시 동굴 비추천");
    }

    ranked.push({
      placeId: place.id,
      score: Math.round(score * 100) / 100,
      reasons: reasons.length > 0 ? reasons.slice(0, 3) : ["추천"],
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  const limit = options?.limit ?? ranked.length;
  return ranked.slice(0, limit);
}

export function rerankPlaceIds(
  placeIds: string[],
  context: EngineContext,
  options?: Parameters<typeof rankPlaces>[2],
): string[] {
  return rankPlaces(placeIds, context, options).map((r) => r.placeId);
}

export async function rerankPlaceIdsAsync(
  placeIds: string[],
  context: EngineContext,
  options?: Parameters<typeof rankPlaces>[2],
): Promise<string[]> {
  const visitCrowd = buildVisitCrowdContext({ preferences: context.preferences });
  const crowdByPlaceId = await buildCrowdByPlaceId(placeIds, context, {
    ...visitCrowd,
    quick: context.crowdMode === "quick",
    weatherIndoorShift: options?.weatherIndoorShift ?? visitCrowd.weatherIndoorShift,
    weatherSummary: options?.weatherSummary ?? visitCrowd.weatherSummary,
  });
  return rerankPlaceIds(placeIds, context, { ...options, crowdByPlaceId });
}
