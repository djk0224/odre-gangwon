import { GANGWON_TRAVEL_ZONE_IDS } from "@/lib/gangwonZoneAvailability";
import type { RagChunk } from "@/services/ai/concierge/types";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import type { TravelZoneId } from "@/types/travel";

export function zoneIdForCatalogChunk(chunk: RagChunk): TravelZoneId | undefined {
  if (!chunk.placeId) return undefined;
  return getCatalogPlaceById(chunk.placeId)?.region;
}

/** 권역별 균등 샘플 — MVP 편중 방지 */
export function balanceCatalogChunks(chunks: RagChunk[], totalLimit: number): RagChunk[] {
  const catalog = chunks.filter((c) => c.source === "catalog");
  if (catalog.length <= totalLimit) return catalog;

  const perZoneCap = Math.max(8, Math.ceil(totalLimit / GANGWON_TRAVEL_ZONE_IDS.length));
  const byZone = new Map<TravelZoneId, RagChunk[]>();
  const overflow: RagChunk[] = [];

  for (const chunk of catalog) {
    const zoneId = zoneIdForCatalogChunk(chunk);
    if (!zoneId) {
      overflow.push(chunk);
      continue;
    }
    const bucket = byZone.get(zoneId) ?? [];
    if (bucket.length < perZoneCap) {
      bucket.push(chunk);
      byZone.set(zoneId, bucket);
    } else {
      overflow.push(chunk);
    }
  }

  const balanced = GANGWON_TRAVEL_ZONE_IDS.flatMap((zoneId) => byZone.get(zoneId) ?? []);
  const picked = new Set(balanced.map((c) => c.id));
  for (const chunk of overflow) {
    if (balanced.length >= totalLimit) break;
    if (!picked.has(chunk.id)) {
      balanced.push(chunk);
      picked.add(chunk.id);
    }
  }

  return balanced.slice(0, totalLimit);
}

export function balanceChunksBySource(
  chunks: RagChunk[],
  source: RagChunk["source"],
  totalLimit: number,
): RagChunk[] {
  const subset = chunks.filter((c) => c.source === source);
  return subset.slice(0, totalLimit);
}
