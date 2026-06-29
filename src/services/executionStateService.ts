import { resolveSigunguCodeForPlace, resolveSigunguCodeForZone } from "@/lib/sigunguResolver";
import { computeDataLabDemandScore } from "@/lib/tourDataLabScoring";
import {
  getCachedGangwonDataLabSnapshot,
  getSigunguBundleFromSnapshot,
} from "@/lib/tourDataLabSnapshot";
import { getDataLabApiKey } from "@/lib/serverEnv";
import {
  fetchRelatedTouristsForPlace,
  getRelatedTouristsForPlace,
} from "@/services/external/tourDataLabService";
import { isLodgingPlace } from "@/lib/placeLodging";
import { getReferenceAttractionDayCap } from "@/lib/travelDuration";
import {
  findCatalogPlaceByNameHint,
  getCatalogPlaceById,
} from "@/services/placeGeocodeService";
import type { DataLabRelatedTouristRecord } from "@/types/externalData";
import type { FeasibilityIssue, Itinerary, TripPreferences } from "@/types/travel";

export interface ExecutionDataLabState {
  active: boolean;
  source: "imported" | "live" | "none";
  snapshotFetchedAt: string | null;
  zoneDemandScore: number | null;
  apiKeyConfigured: boolean;
}

export interface ExecutionStateSnapshot {
  dataLab: ExecutionDataLabState;
  relatedCatalogIds: string[];
  selectionNotes: string[];
}

function parseRate(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num > 1 ? num : num * 100;
}

function feasibility(
  code: string,
  message: string,
  severity: FeasibilityIssue["severity"] = "warning",
): FeasibilityIssue {
  return { id: `datalab-${code}`, code, message, severity };
}

export function resolveExecutionDataLabState(
  preferences: TripPreferences,
): ExecutionDataLabState {
  const snapshot = getCachedGangwonDataLabSnapshot();
  const sigunguCode = resolveSigunguCodeForZone(preferences.zoneId);
  const bundle = snapshot
    ? getSigunguBundleFromSnapshot(sigunguCode, snapshot)
    : null;

  return {
    active: Boolean(bundle),
    source: bundle ? (snapshot?.source ?? "imported") : "none",
    snapshotFetchedAt: snapshot?.fetchedAt ?? null,
    zoneDemandScore: bundle ? Math.round(computeDataLabDemandScore(bundle)) : null,
    apiKeyConfigured: Boolean(getDataLabApiKey()),
  };
}

function relatedName(row: DataLabRelatedTouristRecord): string {
  return String(row.rlteTatsNm ?? "").trim();
}

export function mapRelatedTouristsToCatalogIds(
  rows: DataLabRelatedTouristRecord[],
  zoneId: TripPreferences["zoneId"],
  excludeIds: Set<string> = new Set(),
  limit = 6,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>(excludeIds);

  for (const row of rows) {
    const name = relatedName(row);
    if (!name) continue;
    const place = findCatalogPlaceByNameHint(name, zoneId);
    if (!place || seen.has(place.id) || isLodgingPlace(place)) continue;
    seen.add(place.id);
    result.push(place.id);
    if (result.length >= limit) break;
  }

  return result;
}

export async function collectDataLabRelatedCatalogIds(
  seedPlaceIds: string[],
  preferences: TripPreferences,
  options?: { tryLive?: boolean; limitPerSeed?: number },
): Promise<{ catalogIds: string[]; source: ExecutionDataLabState["source"] }> {
  const zoneId = preferences.zoneId;
  const exclude = new Set(seedPlaceIds);
  const catalogIds: string[] = [];
  let source: ExecutionDataLabState["source"] = "none";
  const limitPerSeed = options?.limitPerSeed ?? 4;
  const tryLive = options?.tryLive ?? false;

  for (const placeId of seedPlaceIds.slice(0, 3)) {
    const place = getCatalogPlaceById(placeId);
    if (!place) continue;

    const sigunguCode = resolveSigunguCodeForPlace(place);
    let rows: DataLabRelatedTouristRecord[] = [];

    if (tryLive && getDataLabApiKey()) {
      try {
        rows = await fetchRelatedTouristsForPlace({
          placeName: place.name,
          sigunguCode,
          limit: limitPerSeed,
        });
        if (rows.length > 0) source = "live";
      } catch {
        rows = [];
      }
    }

    if (rows.length === 0) {
      rows = getRelatedTouristsForPlace({
        placeName: place.name,
        sigunguCode,
        limit: limitPerSeed,
      });
      if (rows.length > 0 && source === "none") {
        source = getCachedGangwonDataLabSnapshot() ? "imported" : "none";
      }
    }

    for (const id of mapRelatedTouristsToCatalogIds(rows, zoneId, exclude, limitPerSeed)) {
      exclude.add(id);
      catalogIds.push(id);
    }
  }

  return { catalogIds, source };
}

export function enrichPlaceIdsWithDataLab(
  placeIds: string[],
  preferences: TripPreferences,
  relatedCatalogIds: string[],
  options?: { maxAdds?: number },
): { placeIds: string[]; addedIds: string[]; notes: string[] } {
  const maxAdds = options?.maxAdds ?? 2;
  const paceCap = getReferenceAttractionDayCap(preferences);
  const room = Math.max(0, paceCap - placeIds.length);
  const allowedAdds = Math.min(maxAdds, room);

  const addedIds: string[] = [];
  const seen = new Set(placeIds);

  for (const id of relatedCatalogIds) {
    if (addedIds.length >= allowedAdds) break;
    if (seen.has(id)) continue;
    const place = getCatalogPlaceById(id);
    if (!place || place.region !== preferences.zoneId || isLodgingPlace(place)) continue;
    seen.add(id);
    addedIds.push(id);
  }

  if (addedIds.length === 0) {
    return { placeIds, addedIds, notes: [] };
  }

  const names = addedIds
    .map((id) => getCatalogPlaceById(id)?.name)
    .filter(Boolean)
    .join(", ");

  return {
    placeIds: [...placeIds, ...addedIds],
    addedIds,
    notes: [
      `관광빅데이터 연관 관광지를 반영했습니다: ${names}`,
    ],
  };
}

export async function buildExecutionStateSnapshot(
  preferences: TripPreferences,
  seedPlaceIds: string[] = [],
): Promise<ExecutionStateSnapshot> {
  const dataLab = resolveExecutionDataLabState(preferences);
  const selectionNotes: string[] = [];

  if (!dataLab.active) {
    if (dataLab.apiKeyConfigured) {
      selectionNotes.push(
        "관광빅데이터 스냅샷이 없습니다. npm run refresh:datalab-gangwon 실행을 권장합니다.",
      );
    }
    return { dataLab, relatedCatalogIds: [], selectionNotes };
  }

  const { catalogIds, source } = await collectDataLabRelatedCatalogIds(
    seedPlaceIds,
    preferences,
    {
      tryLive: process.env.ODRE_DATALAB_LIVE === "1",
      limitPerSeed: 3,
    },
  );

  if (source === "live") {
    dataLab.source = "live";
  } else if (source === "imported") {
    dataLab.source = "imported";
  }

  return {
    dataLab,
    relatedCatalogIds: catalogIds,
    selectionNotes,
  };
}

export function verifyDataLabFeasibility(
  itinerary: Itinerary,
  preferences: TripPreferences,
  dataLab: ExecutionDataLabState,
): FeasibilityIssue[] {
  const issues: FeasibilityIssue[] = [];

  if (!dataLab.active) {
    if (dataLab.apiKeyConfigured) {
      issues.push(
        feasibility(
          "datalab_snapshot_missing",
          "관광빅데이터 스냅샷이 없어 혼잡·연관 관광지 신호가 제한됩니다. refresh:datalab-gangwon으로 수집하세요.",
        ),
      );
    }
    return issues;
  }

  if (dataLab.zoneDemandScore !== null && dataLab.zoneDemandScore >= 78) {
    issues.push(
      feasibility(
        "zone_demand_high",
        `선택 권역의 관광 수요가 높은 편입니다(지수 ${dataLab.zoneDemandScore}). 오전 이른 시간·평일 슬롯을 우선 검토하세요.`,
      ),
    );
  }

  const snapshot = getCachedGangwonDataLabSnapshot();
  if (!snapshot) return issues;

  for (const stop of itinerary.stops) {
    const place = getCatalogPlaceById(stop.placeId);
    if (!place) continue;

    const sigunguCode = resolveSigunguCodeForPlace(place);
    const bundle = getSigunguBundleFromSnapshot(sigunguCode, snapshot);
    if (!bundle) continue;

    const placeKey = place.name.replace(/\s+/g, "");
    const concentrationRows = bundle.concentration.filter((row) => {
      const name = String(row.tAtsNm ?? "").replace(/\s+/g, "");
      return name && (name.includes(placeKey) || placeKey.includes(name));
    });

    const rates = concentrationRows
      .map((row) => parseRate(row.cnctrRate))
      .filter((v): v is number => v !== null);

    if (rates.length === 0) continue;

    const peak = Math.max(...rates);
    if (peak >= 80) {
      issues.push(
        feasibility(
          `concentration_${stop.placeId}`,
          `${place.name}은(는) 관광빅데이터 기준 혼잡 예측이 높습니다(집중률 약 ${Math.round(peak)}%). 대체 시간대를 검토하세요.`,
        ),
      );
    }
  }

  return issues;
}
