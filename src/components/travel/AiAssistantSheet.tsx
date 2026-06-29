"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarPlus, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { AiAssistantMessage } from "@/components/travel/AiAssistantMessage";
import { AiChatActionBar } from "@/components/travel/AiChatActionBar";
import { AiChatPlaceStrip } from "@/components/travel/AiChatPlaceStrip";
import { AiQuickReplyChips } from "@/components/travel/AiQuickReplyChips";
import { CONCIERGE_STARTER_REPLIES } from "@/services/ai/concierge/starterReplies";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { buildChatHistoryFromRows } from "@/lib/aiChatHistory";
import { createInitialChatSession } from "@/lib/aiChatSessionDefaults";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import { askAiTravelAssistantStream } from "@/services/aiRecommendationService";
import type { AiChatStreamEvent } from "@/services/ai/chatStreamTypes";
import type {
  AiChatDisplayBlocks,
  AiChatPhase,
  AiChatResponse,
  AiChatSession,
  AiChatTripContext,
  AiQuickReply,
} from "@/services/ai/types";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { getSeasonFromDate } from "@/lib/regionalPreferences";
import type { ReservationHubCategory } from "@/types/reservationHub";
import type { TripPreferences } from "@/types/travel";

interface AiAssistantSheetProps {
  open: boolean;
  preferences: TripPreferences;
  onClose: () => void;
  onOpenPlace: (placeId: string) => void;
  onOpenReservationPlace: (placeId: string) => void;
  onOpenReservationHub: (category?: ReservationHubCategory) => void;
  onCreateItinerary: (placeIds: string[], mergedPreferences?: TripPreferences) => void;
  onOpenPreferenceWizard?: () => void;
  tripContext?: AiChatTripContext;
  onOpenCare?: () => void;
  onOpenItinerary?: () => void;
}

type ChatRow =
  | { role: "user"; content: string }
  | {
      role: "assistant";
      blocks: AiChatDisplayBlocks;
      phase: AiChatPhase;
      placeIds: string[];
    };

const welcomeBlocksForZone = (zoneId: TripPreferences["zoneId"]): AiChatDisplayBlocks => {
  const zoneLabel = travelZoneShortLabels[zoneId] ?? "강원";
  return {
    headline: `${zoneLabel} 여행 비서예요. 뭐든 먼저 물어보세요.`,
    days: [],
    tips: [
      "날씨, 네이처로드, 버스 도착, 맛집·숙소, 장소 검색처럼 일정 없이도 답해 드려요.",
      "맞춤 일정이 필요할 때만 「일정 추천해줘」라고 말씀해 주세요.",
    ],
  };
};

function rowsToHistory(rows: ChatRow[]) {
  return buildChatHistoryFromRows(
    rows.map((row) =>
      row.role === "user"
        ? { role: "user", content: row.content }
        : { role: "assistant", blocks: row.blocks },
    ),
  );
}

export function AiAssistantSheet({
  open,
  preferences,
  onClose,
  onOpenPlace,
  onOpenReservationPlace,
  onOpenReservationHub,
  onCreateItinerary,
  onOpenPreferenceWizard,
  tripContext,
  onOpenCare,
  onOpenItinerary,
}: AiAssistantSheetProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamStatus, setStreamStatus] = useState("");
  const [session, setSession] = useState<AiChatSession>(createInitialChatSession);
  const [quickReplies, setQuickReplies] = useState<AiQuickReply[]>([]);
  const [slotsSummary, setSlotsSummary] = useState("");
  const [lastPhase, setLastPhase] = useState<AiChatPhase>("info");
  const [mergedPreferences, setMergedPreferences] = useState<TripPreferences | undefined>();
  const [messages, setMessages] = useState<ChatRow[]>(() => [
    {
      role: "assistant",
      blocks: welcomeBlocksForZone(preferences.zoneId),
      phase: "info",
      placeIds: [],
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  const lastAssistant = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const row = messages[i];
      if (row.role === "assistant") return row;
    }
    return null;
  }, [messages]);

  const suggestedPlaceIds = lastAssistant?.placeIds ?? [];
  const canCreateItinerary = Boolean(
    lastPhase === "propose" &&
      lastAssistant &&
      lastAssistant.blocks.days.length > 0 &&
      suggestedPlaceIds.length > 0,
  );

  const suggestedPlaces = suggestedPlaceIds
    .map((id) => getCatalogPlaces().find((place) => place.id === id))
    .filter((place): place is NonNullable<typeof place> => Boolean(place));

  const chatMode = session.mode ?? "concierge";
  const displayQuickReplies =
    quickReplies.length > 0
      ? quickReplies
      : chatMode === "concierge" && !loading
        ? CONCIERGE_STARTER_REPLIES
        : [];

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, canCreateItinerary, quickReplies.length]);

  if (!open) return null;

  function applyApiResult(result: AiChatResponse, userText?: string) {
    if (userText) {
      setMessages((current) => [...current, { role: "user", content: userText }]);
    }
    setSession(result.session);
    setQuickReplies(result.quickReplies);
    setSlotsSummary(result.slotsSummary);
    setLastPhase(result.phase);
    if (result.mergedPreferences) {
      setMergedPreferences(result.mergedPreferences);
    }
    setMessages((current) => [
      ...current,
      {
        role: "assistant",
        blocks: result.blocks,
        phase: result.phase,
        placeIds: result.suggestedPlaceIds,
      },
    ]);
  }

  function upsertStreamingAssistant(
    blocks: AiChatDisplayBlocks,
    phase: AiChatPhase = "info",
    placeIds: string[] = [],
  ) {
    setMessages((current) => {
      const last = current[current.length - 1];
      if (last?.role === "assistant") {
        return [
          ...current.slice(0, -1),
          { role: "assistant", blocks, phase, placeIds },
        ];
      }
      return [...current, { role: "assistant", blocks, phase, placeIds }];
    });
  }

  function handleStreamEvent(event: AiChatStreamEvent) {
    if (event.type === "status") {
      setStreamStatus(event.message);
      return;
    }
    if (event.type === "tool") {
      setStreamStatus(
        event.ok ? `${event.tool} 확인됨` : `${event.tool} 조회 중…`,
      );
      return;
    }
    if (event.type === "partial") {
      upsertStreamingAssistant(
        {
          headline: event.blocks.headline ?? "",
          days: event.blocks.days ?? [],
          tips: event.blocks.tips ?? [],
          sources: event.blocks.sources,
          actions: event.blocks.actions,
        },
        "info",
        event.placeIds ?? [],
      );
    }
  }

  async function sendToAssistant(options: {
    message: string;
    history: ChatRow[];
    slotPatch?: AiChatSession["slots"];
    action?: AiQuickReply["action"];
    showUserBubble?: boolean;
  }) {
    setLoading(true);
    setStreamStatus("답변 준비 중…");

    if (options.showUserBubble) {
      setMessages((current) => [...current, { role: "user", content: options.message }]);
    }

    upsertStreamingAssistant(
      { headline: "", days: [], tips: [] },
      "info",
      [],
    );

    try {
      const result = await askAiTravelAssistantStream(
        {
          message: options.message,
          preferences,
          history: rowsToHistory(options.history),
          session,
          slotPatch: options.slotPatch,
          action: options.action,
          tripContext,
        },
        handleStreamEvent,
      );

      setSession(result.session);
      setQuickReplies(result.quickReplies);
      setSlotsSummary(result.slotsSummary);
      setLastPhase(result.phase);
      if (result.mergedPreferences) {
        setMergedPreferences(result.mergedPreferences);
      }
      setMessages((current) => {
        const withoutPlaceholder =
          current.length > 0 && current[current.length - 1]?.role === "assistant"
            ? current.slice(0, -1)
            : current;
        return [
          ...withoutPlaceholder,
          {
            role: "assistant",
            blocks: result.blocks,
            phase: result.phase,
            placeIds: result.suggestedPlaceIds,
          },
        ];
      });
    } catch {
      setMessages((current) => {
        const withoutPlaceholder =
          current.length > 0 && current[current.length - 1]?.role === "assistant"
            ? current.slice(0, -1)
            : current;
        return [
          ...withoutPlaceholder,
          {
            role: "assistant",
            blocks: {
              headline: "응답에 실패했습니다.",
              days: [],
              tips: ["잠시 후 다시 시도해 주세요."],
            },
            phase: "info",
            placeIds: [],
          },
        ];
      });
    } finally {
      setLoading(false);
      setStreamStatus("");
    }
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    const nextRows: ChatRow[] = [...messages, { role: "user", content: text }];
    setMessages(nextRows);
    setInput("");
    await sendToAssistant({ message: text, history: nextRows, showUserBubble: false });
  }

  async function handleQuickReply(reply: AiQuickReply) {
    if (loading) return;

    if (reply.action === "confirm_go") {
      const nextRows: ChatRow[] = [...messages, { role: "user", content: reply.label }];
      setMessages(nextRows);
      await sendToAssistant({
        message: reply.label,
        history: nextRows,
        action: "confirm_go",
        showUserBubble: false,
      });
      return;
    }

    if (reply.action === "reset_confirm") {
      const nextRows: ChatRow[] = [...messages, { role: "user", content: reply.label }];
      setMessages(nextRows);
      await sendToAssistant({
        message: reply.label,
        history: nextRows,
        action: "reset_confirm",
        showUserBubble: false,
      });
      return;
    }

    const nextRows: ChatRow[] = [...messages, { role: "user", content: reply.label }];
    setMessages(nextRows);
    await sendToAssistant({
      message: reply.label,
      history: nextRows,
      slotPatch: reply.slotPatch,
      showUserBubble: false,
    });
  }

  function handleResetConversation() {
    setSession(createInitialChatSession());
    setQuickReplies([]);
    setSlotsSummary("");
    setLastPhase("info");
    setInput("");
    setMessages([
      { role: "assistant", blocks: welcomeBlocksForZone(preferences.zoneId), phase: "info", placeIds: [] },
    ]);
  }

  function handleCreateItinerary() {
    if (!canCreateItinerary) return;
    onClose();
    onCreateItinerary(
      suggestedPlaceIds,
      mergedPreferences ?? sessionToTripPreferencesFromSession(session, preferences),
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-24 pt-10">
      <div className="flex max-h-[82vh] w-full max-w-[430px] flex-col overflow-hidden rounded-t-3xl bg-ivory shadow-[var(--shadow-soft)]">
        <header className="flex shrink-0 items-center justify-between border-b border-pine/10 px-5 py-4">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-pine">
              <Sparkles aria-hidden="true" className="size-3.5" />
              AI Assistant
            </p>
            <h2 className="text-lg font-semibold text-ink">여행 AI 비서</h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              aria-label="대화 초기화"
              className="flex size-9 items-center justify-center rounded-full text-stone hover:bg-pine/8"
              onClick={handleResetConversation}
              type="button"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
            </button>
            <button
              aria-label="닫기"
              className="flex size-9 items-center justify-center rounded-full text-stone"
              onClick={onClose}
              type="button"
            >
              <X aria-hidden="true" className="size-5" />
            </button>
          </div>
        </header>

        {slotsSummary && slotsSummary !== "조건을 아직 모르고 있어요" ? (
          <div className="shrink-0 border-b border-pine/10 bg-pine/5 px-5 py-2.5">
            <p className="text-[11px] font-medium text-pine">내 여행 조건</p>
            <p className="text-xs text-ink">{slotsSummary}</p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {messages.map((message, index) =>
            message.role === "user" ? (
              <div
                className="ml-auto max-w-[90%] rounded-2xl bg-pine px-4 py-3 text-sm leading-6 text-ivory"
                key={`user-${index}`}
              >
                {message.content}
              </div>
            ) : (
              <div
                className="max-w-[95%] space-y-3 rounded-2xl bg-paper px-4 py-3"
                key={`assistant-${index}`}
              >
                <AiAssistantMessage blocks={message.blocks} phase={message.phase} />
                {message.blocks.actions && message.blocks.actions.length > 0 ? (
                  <AiChatActionBar
                    actions={message.blocks.actions}
                    onOpenCare={() => {
                      onClose();
                      onOpenCare?.();
                    }}
                    onOpenItinerary={() => {
                      onClose();
                      onOpenItinerary?.();
                    }}
                    onOpenPlace={(placeId) => {
                      onClose();
                      onOpenPlace(placeId);
                    }}
                    onOpenReservationHub={(category) => {
                      onClose();
                      onOpenReservationHub(category);
                    }}
                    onOpenReservationPlace={(placeId) => {
                      onClose();
                      onOpenReservationPlace(placeId);
                    }}
                  />
                ) : null}
                {message.placeIds.length > 0 &&
                (message.phase === "info" || message.phase === "propose") ? (
                  <AiChatPlaceStrip
                    onOpenPlace={(placeId) => {
                      onClose();
                      onOpenPlace(placeId);
                    }}
                    onOpenReservation={(placeId) => {
                      onClose();
                      onOpenReservationPlace(placeId);
                    }}
                    places={message.placeIds
                      .map((id) => getCatalogPlaces().find((p) => p.id === id))
                      .filter((p): p is NonNullable<typeof p> => Boolean(p))}
                  />
                ) : null}
              </div>
            ),
          )}
          {loading ? (
            <p className="text-center text-xs text-stone">
              {streamStatus || "AI가 답변을 작성하는 중…"}
            </p>
          ) : null}
          <div ref={endRef} />
        </div>

        <div className="shrink-0 space-y-3 border-t border-pine/10 px-5 py-3">
          {canCreateItinerary ? (
            <PremiumButton className="w-full" onClick={handleCreateItinerary}>
              <span className="flex items-center justify-center gap-2">
                <CalendarPlus aria-hidden="true" className="size-4" />
                이 코스로 일정 만들기
              </span>
            </PremiumButton>
          ) : null}

          {displayQuickReplies.length > 0 ? (
            <AiQuickReplyChips
              disabled={loading}
              onSelect={(reply) => void handleQuickReply(reply)}
              replies={displayQuickReplies}
            />
          ) : null}

          {onOpenPreferenceWizard ? (
            <button
              className="w-full text-center text-xs text-stone underline-offset-2 hover:underline"
              onClick={() => {
                onClose();
                onOpenPreferenceWizard();
              }}
              type="button"
            >
              조건 자세히 설정 (6단계)
            </button>
          ) : null}

          <div className="flex items-center gap-2 rounded-full border border-pine/10 bg-paper px-3 py-2">
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-stone"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSend();
              }}
              placeholder="날씨, 맛집, 버스, 6코스, 일정 추천…"
              value={input}
            />
            <button
              aria-label="전송"
              className="flex size-9 items-center justify-center rounded-full bg-pine text-ivory disabled:opacity-50"
              disabled={loading || !input.trim()}
              onClick={() => void handleSend()}
              type="button"
            >
              <Send aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 클라이언트에서 일정 생성 시 preferences 병합 (서버 sessionToTripPreferences와 동일 규칙) */
function sessionToTripPreferencesFromSession(
  session: AiChatSession,
  fallback: TripPreferences,
): TripPreferences {
  const slots = session.slots;
  const travelDate = slots.travelDate ?? fallback.travelDate;
  return {
    ...fallback,
    travelDate,
    travelers: slots.travelers ?? fallback.travelers,
    duration: slots.duration ?? fallback.duration,
    themes: slots.themes?.length ? slots.themes : fallback.themes,
    transportation: slots.transportation ?? fallback.transportation,
    companion: slots.companion ?? fallback.companion,
    pace: slots.pace ?? fallback.pace,
    season: slots.season ?? getSeasonFromDate(travelDate),
    zoneId: slots.zoneId ?? fallback.zoneId,
  };
}
