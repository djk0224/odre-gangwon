import type { OdreNote } from "@/data/odreNotes";
import { ODRE_NOTE_SEEDS } from "@/data/odreNotes";
import { ODRE_NOTE_SEED_DRIFT_KEYWORDS, ODRE_NOTE_SEED_TOPIC_KEYWORDS } from "@/lib/odreNoteAlignment";

function topicKeywordsFromSeed(seed: OdreNote): readonly string[] {
  return seed.placeKeywords?.length
    ? seed.placeKeywords
    : seed.zones.flatMap((zone) => zone.split("-"));
}

export function buildOdreNoteSeedTopicKeywords(
  seeds: OdreNote[] = ODRE_NOTE_SEEDS,
): Record<string, readonly string[]> {
  const map: Record<string, readonly string[]> = { ...ODRE_NOTE_SEED_TOPIC_KEYWORDS };

  for (const seed of seeds) {
    if (!map[seed.id]) {
      map[seed.id] = topicKeywordsFromSeed(seed);
    }
  }

  return map;
}

export function getOdreNoteSeedTopicKeywords(seedId: string): readonly string[] {
  return buildOdreNoteSeedTopicKeywords()[seedId] ?? [];
}

export function getOdreNoteSeedDriftKeywords(seedId: string): readonly string[] {
  return ODRE_NOTE_SEED_DRIFT_KEYWORDS[seedId] ?? [];
}
