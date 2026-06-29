import type { CompanionType, Transportation, TripPace } from "@/types/travel";

export interface RankingWeights {
  themeMatch: number;
  behavior: number;
  saved: number;
  partner: number;
  crowdPenalty: number;
  proximity: number;
  recencyPenalty: number;
}

const DEFAULT_WEIGHTS: RankingWeights = {
  themeMatch: 0.28,
  behavior: 0.22,
  saved: 0.18,
  partner: 0.12,
  crowdPenalty: 0.08,
  proximity: 0.07,
  recencyPenalty: 0.05,
};

const PRESETS: Partial<Record<string, Partial<RankingWeights>>> = {
  "public-transit": { proximity: 0.14, crowdPenalty: 0.1 },
  parents: { themeMatch: 0.24, crowdPenalty: 0.14, partner: 0.14 },
  relaxed: { crowdPenalty: 0.14, proximity: 0.1 },
  packed: { partner: 0.16, behavior: 0.18 },
};

export function resolveRankingWeights(options?: {
  transportation?: Transportation;
  companion?: CompanionType;
  pace?: TripPace;
}): RankingWeights {
  const merged = { ...DEFAULT_WEIGHTS };
  if (options?.transportation === "public-transit") {
    Object.assign(merged, PRESETS["public-transit"]);
  }
  if (options?.companion === "parents" || options?.companion === "family") {
    Object.assign(merged, PRESETS.parents);
  }
  if (options?.pace === "relaxed") {
    Object.assign(merged, PRESETS.relaxed);
  }
  if (options?.pace === "packed") {
    Object.assign(merged, PRESETS.packed);
  }
  return merged;
}
