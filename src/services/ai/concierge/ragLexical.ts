import { getRagChunks } from "@/services/ai/concierge/ragIndex";
import type { RagChunk } from "@/services/ai/concierge/types";

const K1 = 1.2;
const B = 0.75;

interface CorpusStats {
  avgDocLen: number;
  docFreq: Map<string, number>;
  chunkTerms: Map<string, string[]>;
}

let corpusCache: CorpusStats | null = null;

function tokenize(text: string): string[] {
  const normalized = text.toLowerCase();
  const terms = normalized.split(/[\s,./·|:;!?()[\]{}'"`~]+/).filter((t) => t.length >= 2);
  if (terms.length === 0 && normalized.length >= 2) {
    return [normalized];
  }
  return [...new Set(terms)];
}

function buildCorpusStats(chunks: RagChunk[]): CorpusStats {
  const docFreq = new Map<string, number>();
  const chunkTerms = new Map<string, string[]>();
  let totalLen = 0;

  for (const chunk of chunks) {
    const terms = tokenize(`${chunk.title} ${chunk.text}`);
    chunkTerms.set(chunk.id, terms);
    totalLen += terms.length;
    const seen = new Set<string>();
    for (const term of terms) {
      if (seen.has(term)) continue;
      seen.add(term);
      docFreq.set(term, (docFreq.get(term) ?? 0) + 1);
    }
  }

  return {
    avgDocLen: totalLen / Math.max(chunks.length, 1),
    docFreq,
    chunkTerms,
  };
}

function getCorpusStats(): CorpusStats {
  if (!corpusCache) {
    corpusCache = buildCorpusStats(getRagChunks());
  }
  return corpusCache;
}

export function resetRagLexicalCache() {
  corpusCache = null;
}

function bm25Score(
  queryTerms: string[],
  docTerms: string[],
  stats: CorpusStats,
  nDocs: number,
): number {
  const docLen = docTerms.length;
  const termFreq = new Map<string, number>();
  for (const term of docTerms) {
    termFreq.set(term, (termFreq.get(term) ?? 0) + 1);
  }

  let score = 0;
  for (const term of queryTerms) {
    const tf = termFreq.get(term) ?? 0;
    if (tf === 0) continue;

    const df = stats.docFreq.get(term) ?? 0;
    const idf = Math.log(1 + (nDocs - df + 0.5) / (df + 0.5));
    const numerator = tf * (K1 + 1);
    const denominator = tf + K1 * (1 - B + (B * docLen) / stats.avgDocLen);
    score += idf * (numerator / denominator);
  }

  return score;
}

function sourceBoost(query: string, chunk: RagChunk): number {
  if (chunk.source === "catalog" && /장소|관광|입장|티켓/.test(query)) return 0.4;
  if (chunk.source === "nature-road" && /코스|드라이브|네이처/.test(query)) return 0.8;
  if (chunk.source === "restaurant" && /맛|식당|횟|음식/.test(query)) return 0.8;
  if (chunk.source === "commerce" && /숙소|펜션|호텔|숙박/.test(query)) return 0.8;
  if (chunk.source === "faq" && /예약|qr|교통|혼잡/.test(query)) return 0.5;
  return 0;
}

export function scoreRagChunksLexical(
  query: string,
  chunks: RagChunk[],
): Array<{ chunk: RagChunk; score: number }> {
  const trimmed = query.trim();
  if (!trimmed || chunks.length === 0) return [];

  const stats = getCorpusStats();
  const queryTerms = tokenize(trimmed);
  const nDocs = chunks.length;
  const qLower = trimmed.toLowerCase();

  return chunks
    .map((chunk) => {
      const docTerms = stats.chunkTerms.get(chunk.id) ?? tokenize(`${chunk.title} ${chunk.text}`);
      let score = bm25Score(queryTerms, docTerms, stats, nDocs);
      const haystack = `${chunk.title} ${chunk.text}`.toLowerCase();
      if (haystack.includes(qLower)) score += 2;
      if (chunk.title.toLowerCase().includes(qLower)) score += 1.5;
      score += sourceBoost(trimmed, chunk);
      return { chunk, score };
    })
    .filter((row) => row.score > 0);
}
