import { getRagChunks, resetRagIndexCache } from "@/services/ai/concierge/ragIndex";
import { isRagEmbeddingReady, scoreRagChunksSemantic } from "@/services/ai/concierge/ragEmbedding";
import { resetRagLexicalCache, scoreRagChunksLexical } from "@/services/ai/concierge/ragLexical";
import { detectTravelZoneFromText } from "@/lib/chatZoneDetection";
import type { RagChunk } from "@/services/ai/concierge/types";

const LEXICAL_WEIGHT = 0.55;
const SEMANTIC_WEIGHT = 0.45;

const ZONE_CITY_HINTS: Record<string, RegExp> = {
  "samcheok-donghae": /삼척|동해/,
  "gangneung-yangyang": /강릉|양양|안목|주문진|경포/,
  "sokcho-goseong": /속초|고성|설악|아바이/,
  "pyeongchang-jeongseon": /평창|횡성|대관령|알펜시아/,
  "yeongwol-jeongseon": /영월|정선|태백|동강/,
  "cheorwon-dmz": /철원|화천|DMZ|접경/,
  "wonju-chuncheon": /원주|춘천|막국수|닭갈비/,
};

function chunkMatchesZone(chunk: RagChunk, zoneId: string): boolean {
  const haystack = `${chunk.title} ${chunk.text}`;
  if (haystack.includes(zoneId)) return true;
  const hint = ZONE_CITY_HINTS[zoneId];
  return hint ? hint.test(haystack) : false;
}

function applyZoneAwareRanking(
  query: string,
  rows: Array<{ chunk: RagChunk; score: number }>,
): Array<{ chunk: RagChunk; score: number }> {
  const zoneId = detectTravelZoneFromText(query);
  if (!zoneId) return rows;

  return rows
    .map((row) => {
      if (chunkMatchesZone(row.chunk, zoneId)) {
        return { ...row, score: row.score + 0.35 };
      }
      const mismatched = Object.entries(ZONE_CITY_HINTS).some(
        ([otherZone, pattern]) => otherZone !== zoneId && pattern.test(`${row.chunk.title} ${row.chunk.text}`),
      );
      if (mismatched) {
        return { ...row, score: row.score * 0.25 };
      }
      return row;
    })
    .sort((a, b) => b.score - a.score);
}

function normalizeScores<T extends { score: number }>(rows: T[]): T[] {
  if (rows.length === 0) return rows;
  const max = Math.max(...rows.map((r) => r.score));
  const min = Math.min(...rows.map((r) => r.score));
  const span = max - min || 1;
  return rows.map((row) => ({ ...row, score: (row.score - min) / span }));
}

export function resetHybridRagCaches() {
  resetRagIndexCache();
  resetRagLexicalCache();
}

export async function searchRagChunksHybrid(
  query: string,
  limit = 6,
): Promise<{ chunks: RagChunk[]; mode: "hybrid" | "lexical" }> {
  const trimmed = query.trim();
  if (!trimmed) return { chunks: [], mode: "lexical" };

  const corpus = getRagChunks();
  const lexical = normalizeScores(scoreRagChunksLexical(trimmed, corpus));
  const lexicalMap = new Map(lexical.map((row) => [row.chunk.id, row.score]));

  const useSemantic = isRagEmbeddingReady();
  if (!useSemantic) {
    return {
      chunks: applyZoneAwareRanking(
        trimmed,
        lexical.sort((a, b) => b.score - a.score),
      )
        .slice(0, limit)
        .map((row) => row.chunk),
      mode: "lexical",
    };
  }

  const semantic = normalizeScores(
    await scoreRagChunksSemantic(trimmed, corpus),
  );
  const semanticMap = new Map(semantic.map((row) => [row.chunk.id, row.score]));

  const merged = applyZoneAwareRanking(
    trimmed,
    corpus
      .map((chunk) => {
        const lex = lexicalMap.get(chunk.id) ?? 0;
        const sem = semanticMap.get(chunk.id) ?? 0;
        const score = LEXICAL_WEIGHT * lex + SEMANTIC_WEIGHT * sem;
        return { chunk, score };
      })
      .filter((row) => row.score > 0.08),
  )
    .slice(0, limit);

  return {
    chunks: merged.map((row) => row.chunk),
    mode: "hybrid",
  };
}

/** @deprecated alias — 기존 import 호환 */
export async function searchRagChunks(query: string, limit = 6): Promise<RagChunk[]> {
  const result = await searchRagChunksHybrid(query, limit);
  return result.chunks;
}
