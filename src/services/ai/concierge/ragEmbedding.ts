import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { getGeminiApiKey } from "@/lib/serverEnv";
import type { RagChunk } from "@/services/ai/concierge/types";

function getEmbedModel() {
  return process.env.GEMINI_EMBED_MODEL?.trim() || "gemini-embedding-001";
}
const CACHE_PATH = join(process.cwd(), "src/data/generated/rag-embeddings.json");

export interface RagEmbeddingCacheFile {
  model: string;
  updatedAt: string;
  dimensions: number;
  vectors: Record<string, number[]>;
}

let memoryCache: RagEmbeddingCacheFile | null = null;
let loadAttempted = false;

function loadCacheFromDisk(): RagEmbeddingCacheFile | null {
  if (loadAttempted) return memoryCache;
  loadAttempted = true;

  if (!existsSync(CACHE_PATH)) return null;

  try {
    const raw = readFileSync(CACHE_PATH, "utf8");
    memoryCache = JSON.parse(raw) as RagEmbeddingCacheFile;
    return memoryCache;
  } catch {
    return null;
  }
}

export function getRagEmbeddingCache(): RagEmbeddingCacheFile | null {
  return loadCacheFromDisk();
}

export function isRagEmbeddingReady(): boolean {
  const cache = getRagEmbeddingCache();
  return Boolean(cache && Object.keys(cache.vectors).length > 0);
}

export async function embedText(text: string): Promise<number[] | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;

  const embedModel = getEmbedModel();
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${embedModel}:embedContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: `models/${embedModel}`,
        content: { parts: [{ text: text.slice(0, 2048) }] },
      }),
    },
  );

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    embedding?: { values?: number[] };
  };

  return payload.embedding?.values ?? null;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function scoreRagChunksSemantic(
  query: string,
  chunks: RagChunk[],
): Promise<Array<{ chunk: RagChunk; score: number }>> {
  const cache = getRagEmbeddingCache();
  if (!cache) return [];

  const queryVector = await embedText(query);
  if (!queryVector) return [];

  return chunks
    .map((chunk) => {
      const vector = cache.vectors[chunk.id];
      if (!vector) return { chunk, score: 0 };
      return { chunk, score: cosineSimilarity(queryVector, vector) };
    })
    .filter((row) => row.score > 0.05);
}
