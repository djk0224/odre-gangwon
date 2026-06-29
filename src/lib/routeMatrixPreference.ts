import { getKakaoRestApiKey } from "@/lib/serverEnv";

export type RouteMatrixMode = "haversine" | "kakao-road" | "hybrid";

export type RouteMatrixPhase = "visit-order" | "day-local" | "final-legs" | "day-split";

/** fast = 결정론 5~8초 경로(Kakao REST 미사용). accurate = 실도로 보정·지도 단계 */
export type RouteMatrixProfile = "fast" | "accurate";

/**
 * fast 프로필: 항상 Haversine (Kakao segment 배치 없음).
 * accurate: Kakao REST가 있으면 소규모 일정은 실도로 매트릭스 우선.
 */
export function resolveRouteMatrixOptions(
  placeCount: number,
  phase: RouteMatrixPhase,
  profile: RouteMatrixProfile = "accurate",
): { preferHaversine: boolean; mode: RouteMatrixMode } {
  if (profile === "fast") {
    return { preferHaversine: true, mode: "haversine" };
  }

  const hasKakao = Boolean(getKakaoRestApiKey());
  if (!hasKakao) {
    return { preferHaversine: true, mode: "haversine" };
  }

  const threshold =
    phase === "visit-order" ? 9 : phase === "day-split" ? 12 : phase === "day-local" ? 7 : 11;

  if (placeCount > threshold) {
    return { preferHaversine: true, mode: "hybrid" };
  }

  return { preferHaversine: false, mode: "kakao-road" };
}
