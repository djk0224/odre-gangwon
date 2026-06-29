/**
 * RAG 벡터 캐시 생성 — GEMINI_API_KEY 필요 (.env.local)
 * Usage: npm run build:rag
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  getRagChunksForEmbedding,
  resetRagIndexCache,
} from "../src/services/ai/concierge/ragIndex";
import { embedText } from "../src/services/ai/concierge/ragEmbedding";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_PATH = join(ROOT, "src/data/generated/rag-embeddings.json");

function loadEnvLocal() {
  try {
    const text = readFileSync(join(ROOT, ".env.local"), "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* no .env.local */
  }
}

async function main() {
  loadEnvLocal();
  if (!process.env.GEMINI_EMBED_MODEL?.trim()) {
    process.env.GEMINI_EMBED_MODEL = "gemini-embedding-001";
  }
  resetRagIndexCache();

  if (!process.env.GEMINI_API_KEY?.trim()) {
    console.error("GEMINI_API_KEY가 .env.local에 필요합니다.");
    process.exit(1);
  }

  const full = process.argv.includes("--full") || process.env.BUILD_RAG_FULL === "1";
  const chunks = getRagChunksForEmbedding({ full });
  if (full) console.log("Mode: full embedding index");
  const vectors: Record<string, number[]> = {};
  let dimensions = 0;

  console.log(`Embedding ${chunks.length} chunks…`);

  for (let i = 0; i < chunks.length; i += 1) {
    const chunk = chunks[i]!;
    const text = `${chunk.title}\n${chunk.text}`.slice(0, 2048);
    const vector = await embedText(text);
    if (!vector) {
      console.warn(`Skip ${chunk.id} (embed failed)`);
      continue;
    }
    dimensions = vector.length;
    vectors[chunk.id] = vector;
    if ((i + 1) % 20 === 0) {
      console.log(`  ${i + 1}/${chunks.length}`);
    }
    await new Promise((r) => setTimeout(r, 120));
  }

  const count = Object.keys(vectors).length;
  if (count === 0) {
    console.error(
      "임베딩 0건 — 캐시를 덮어쓰지 않았습니다. GEMINI_EMBED_MODEL=gemini-embedding-001 확인 후 재실행하세요.",
    );
    process.exit(1);
  }

  const payload = {
    model: process.env.GEMINI_EMBED_MODEL?.trim() || "gemini-embedding-001",
    updatedAt: new Date().toISOString(),
    dimensions,
    vectors,
  };

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(payload));
  console.log(`Wrote ${count} vectors → ${OUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
