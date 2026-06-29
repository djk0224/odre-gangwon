import type { RouteMatrixProfile } from "@/lib/routeMatrixPreference";
import type { AiProvider } from "@/services/ai/types";
import type { EngineContext } from "@/services/engines/engineContext";
import type { FeasibilityIssue, Itinerary, TripPreferences } from "@/types/travel";

export type RoutingSource = "kakao" | "haversine";

export type ExecutionProvider = AiProvider | "ai+verified";

export interface PlaceSelection {
  placeIds: string[];
  removedIds: string[];
  warnings: string[];
}

export interface ExecutionSignals {
  weatherSummary: string | null;
  weatherIndoorShift: boolean;
  routingSource: RoutingSource;
  dataMode: "live" | "demo";
  tourApiConfigured: boolean;
  kakaoRestConfigured: boolean;
  dataLabActive: boolean;
  dataLabSource: "imported" | "live" | "none";
  dataLabZoneDemandScore: number | null;
}

export interface BuildItineraryKernelInput {
  preferences: TripPreferences;
  anchorPlaceId?: string | null;
  orderedPlaceIds?: string[] | null;
  preserveOrder?: boolean;
  engineContext?: EngineContext;
  aiMeta?: { explanation?: string; alternatives?: string[] };
  selectionSource: "rules" | "llm";
  weatherSummary?: string | null;
  llmProvider?: AiProvider;
  /** 기본 fast — Kakao 매트릭스는 accurate·백그라운드 보강용 */
  routeProfile?: RouteMatrixProfile;
}

export interface BuildItineraryKernelResult {
  itinerary: Itinerary;
  provider: ExecutionProvider;
  feasibilityIssues: FeasibilityIssue[];
  signals: ExecutionSignals;
}
