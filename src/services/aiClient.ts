import type { AiChatStreamEvent } from "@/services/ai/chatStreamTypes";
import type {
  AiChatMessage,
  AiChatResponse,
  AiChatSession,
  AiChatTripContext,
  AiProvider,
  AiQuickReply,
} from "@/services/ai/types";
import type {
  CareAlert,
  Itinerary,
  QRTicket,
  ReservationRecord,
  TripLodgingPlan,
  TripPreferences,
} from "@/types/travel";
import type { HubReservationBooking } from "@/types/reservationHub";

/** 빠른 결정론 일정 (LLM 서술 없음) — 서버 규칙 엔진은 권역·커널 포함 15~25초 가능 */
const FAST_ITINERARY_TIMEOUT_MS = 45_000;
const ENRICH_TIMEOUT_MS = 14_000;
const ROUTE_ENRICH_TIMEOUT_MS = 55_000;

export async function requestAiItinerary(
  preferences: TripPreferences,
  options?: {
    anchorPlaceId?: string | null;
    orderedPlaceIds?: string[] | null;
    preserveOrder?: boolean;
    lodgingPlan?: TripLodgingPlan;
  },
): Promise<{ itinerary: Itinerary; provider: AiProvider }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FAST_ITINERARY_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch("/api/ai/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences,
        anchorPlaceId: options?.anchorPlaceId ?? null,
        orderedPlaceIds: options?.orderedPlaceIds ?? null,
        preserveOrder: options?.preserveOrder,
        lodgingPlan: options?.lodgingPlan,
      }),
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("일정 생성이 지연되어 빠른 경로로 전환합니다. 잠시 후 다시 시도해 주세요.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "AI 일정 생성에 실패했습니다.");
  }
  const data = (await response.json()) as { itinerary: Itinerary; provider: AiProvider };
  return data;
}

export async function requestExecutionItinerary(
  preferences: TripPreferences,
  options?: {
    anchorPlaceId?: string | null;
    orderedPlaceIds?: string[] | null;
    preserveOrder?: boolean;
    accurateRoutes?: boolean;
  },
): Promise<{ itinerary: Itinerary; provider: AiProvider }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

  try {
    const response = await fetch("/api/execution/itinerary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        preferences,
        anchorPlaceId: options?.anchorPlaceId ?? null,
        orderedPlaceIds: options?.orderedPlaceIds ?? null,
        preserveOrder: options?.preserveOrder,
        accurateRoutes: options?.accurateRoutes ?? true,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(payload.error ?? "실행 커널 일정 생성에 실패했습니다.");
    }
    return (await response.json()) as { itinerary: Itinerary; provider: AiProvider };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestItineraryRouteEnrich(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options?: {
    reservations?: ReservationRecord[];
    qrTickets?: QRTicket[];
  },
): Promise<{ itinerary: Itinerary; routesEnriched: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ROUTE_ENRICH_TIMEOUT_MS);

  try {
    const response = await fetch("/api/execution/itinerary/enrich-routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itinerary,
        preferences,
        reservations: options?.reservations,
        qrTickets: options?.qrTickets,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { itinerary, routesEnriched: false };
    }
    return (await response.json()) as { itinerary: Itinerary; routesEnriched: boolean };
  } catch {
    return { itinerary, routesEnriched: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestItineraryEnrich(
  itinerary: Itinerary,
  preferences: TripPreferences,
  options?: { anchorPlaceId?: string | null },
): Promise<{ itinerary: Itinerary; provider: AiProvider; enriched: boolean }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ENRICH_TIMEOUT_MS);

  try {
    const response = await fetch("/api/ai/itinerary/enrich", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        itinerary,
        preferences,
        anchorPlaceId: options?.anchorPlaceId ?? null,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { itinerary, provider: "rules", enriched: false };
    }
    return (await response.json()) as {
      itinerary: Itinerary;
      provider: AiProvider;
      enriched: boolean;
    };
  } catch {
    return { itinerary, provider: "rules", enriched: false };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function requestAiPlaceSearch(query: string, preferences: TripPreferences) {
  const response = await fetch("/api/ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, preferences }),
  });
  if (!response.ok) {
    throw new Error("AI 검색에 실패했습니다.");
  }
  return response.json() as Promise<{
    placeIds: string[];
    summary: string;
    provider: AiProvider;
  }>;
}

export async function requestAiCare(options: {
  itinerary?: Itinerary;
  preferences: TripPreferences;
  reservations: ReservationRecord[];
  hubBookings: HubReservationBooking[];
  claimedLocalOfferIds: string[];
}) {
  const response = await fetch("/api/ai/care", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error("AI 케어 생성에 실패했습니다.");
  }
  return response.json() as Promise<{
    alerts: CareAlert[];
    provider: AiProvider;
  }>;
}

export async function requestAiChat(options: {
  message: string;
  preferences?: TripPreferences;
  history?: AiChatMessage[];
  session?: AiChatSession;
  slotPatch?: AiChatSession["slots"];
  action?: AiQuickReply["action"];
  tripContext?: AiChatTripContext;
}) {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });
  if (!response.ok) {
    throw new Error("AI 응답에 실패했습니다.");
  }
  return response.json() as Promise<AiChatResponse>;
}

export async function requestAiChatStream(
  options: {
    message: string;
    preferences?: TripPreferences;
    history?: AiChatMessage[];
    session?: AiChatSession;
    slotPatch?: AiChatSession["slots"];
    action?: AiQuickReply["action"];
    tripContext?: AiChatTripContext;
  },
  onEvent: (event: AiChatStreamEvent) => void,
): Promise<AiChatResponse> {
  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...options, stream: true }),
  });
  if (!response.ok || !response.body) {
    throw new Error("AI 스트리밍 응답에 실패했습니다.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let finalResult: AiChatResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const event = JSON.parse(trimmed) as AiChatStreamEvent;
      onEvent(event);
      if (event.type === "done") {
        finalResult = event.result;
      }
    }
  }

  if (buffer.trim()) {
    const event = JSON.parse(buffer.trim()) as AiChatStreamEvent;
    onEvent(event);
    if (event.type === "done") {
      finalResult = event.result;
    }
  }

  if (!finalResult) {
    throw new Error("스트리밍 응답이 비어 있습니다.");
  }
  return finalResult;
}

export async function requestAiCrowdGuidance(placeId: string) {
  const response = await fetch("/api/ai/crowd", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeId }),
  });
  if (!response.ok) {
    throw new Error("혼잡 안내를 불러오지 못했습니다.");
  }
  return response.json() as Promise<{
    summary: string;
    recommendedSlotId?: string;
    avoidSlotIds: string[];
    provider: AiProvider;
  }>;
}

export async function fetchAiStatus() {
  const response = await fetch("/api/ai/status", { cache: "no-store" });
  if (!response.ok) return null;
  return response.json() as Promise<{
    llmConfigured: boolean;
    providers: AiProvider[];
    primary: AiProvider;
  }>;
}
