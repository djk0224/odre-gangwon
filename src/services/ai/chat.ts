import { getMissingSlots, getNextMissingSlot } from "@/lib/aiChatReadiness";
import { resolveSuggestedPlaceIds } from "@/lib/resolveCatalogPlaceIds";
import { buildPlaceCatalogForAi, buildWeatherSummaryForAi } from "@/services/ai/context";
import { runConciergeTurn } from "@/services/ai/concierge/orchestrator";
import type { ConciergeToolResult } from "@/services/ai/concierge/types";
import { isExplicitPlanRequest } from "@/services/ai/concierge/router";
import {
  advanceSessionAfterMessage,
  applySlotPatch,
  buildClarifyBlocks,
  buildClarifyQuickReplies,
  buildConfirmBlocks,
  buildConfirmQuickReplies,
  classifyInfoQuery,
  detectIntent,
  formatSlotsSummary,
  isLikelySlotAnswer,
  mergeSlotsFromHistory,
  mergeSlotsFromMessage,
  sessionToTripPreferences,
} from "@/services/ai/chatSession";
import { appendPlanningNudge } from "@/services/ai/chatInfoHandlers";
import { completeJsonWithLlm } from "@/services/ai/provider";
import type {
  AiChatDisplayBlocks,
  AiChatMessage,
  AiChatPhase,
  AiChatResponse,
  AiChatSession,
  AiChatTripContext,
  AiProvider,
  AiQuickReply,
} from "@/services/ai/types";
import { defaultPreferences } from "@/data/mockTravelData";
import { createInitialChatSession } from "@/lib/aiChatSessionDefaults";
import type { TripPreferences } from "@/types/travel";

const CHAT_PROPOSE_SYSTEM = `You are ODRÉ GANGWON travel planner for Gangwon regional zones (7 clusters).
Return ONLY JSON (no markdown):
{
  "headline": "short Korean title matching tripSlots",
  "days": [{ "label": "1일차", "items": ["time + place + action, max 80 chars"] }],
  "tips": ["max 3 short tips"],
  "suggestedPlaceIds": ["catalog id"]
}
Rules:
- Use tripSlots and conversationHistory. Match duration (day-trip vs one-night day count).
- suggestedPlaceIds MUST be catalog ids used in day items.
- Plain Korean. No meta commentary.`;

const CHAT_REFINE_SYSTEM = `You are ODRÉ GANGWON. User wants to adjust a proposed itinerary.
Return ONLY JSON: { "headline": string, "days": [...], "tips": [], "suggestedPlaceIds": [] }
Change only what user asked. Keep other days stable when possible.`;

interface LlmChatPayload {
  headline?: string;
  days?: Array<{ label?: string; items?: string[] }>;
  tips?: string[];
  suggestedPlaceIds?: string[];
}

function applyPhaseGate(
  blocks: AiChatDisplayBlocks,
  phase: AiChatPhase,
): AiChatDisplayBlocks {
  if (phase === "propose" || phase === "refine") {
    return blocks;
  }
  return { ...blocks, days: [] };
}

function normalizeLlmBlocks(payload: LlmChatPayload): AiChatDisplayBlocks {
  const headline = payload.headline?.trim() || "안내";
  const days = (payload.days ?? [])
    .map((day) => ({
      label: day.label?.trim() || "일정",
      items: (day.items ?? []).map((item) => item.trim()).filter(Boolean).slice(0, 5),
    }))
    .filter((day) => day.items.length > 0)
    .slice(0, 3);
  const tips = (payload.tips ?? []).map((tip) => tip.trim()).filter(Boolean).slice(0, 4);
  return { headline, days, tips };
}

export function buildChatResponse(
  phase: AiChatPhase,
  blocks: AiChatDisplayBlocks,
  session: AiChatSession,
  quickReplies: AiQuickReply[],
  suggestedPlaceIds: string[],
  provider: AiProvider,
  storePrefs: TripPreferences,
  toolCalls?: string[],
): AiChatResponse {
  const gated = applyPhaseGate(blocks, phase);
  const slotsSummary = formatSlotsSummary(session.slots);
  const mergedPreferences = sessionToTripPreferences(session.slots, storePrefs);

  return {
    answer: gated.headline,
    phase,
    blocks: gated,
    quickReplies,
    session,
    slotsSummary,
    suggestedPlaceIds,
    itineraryReady:
      phase === "propose" && gated.days.length > 0 && suggestedPlaceIds.length > 0,
    mergedPreferences:
      phase === "propose" || phase === "refine" ? mergedPreferences : undefined,
    provider,
    toolCalls,
  };
}

function handleResetConfirm(session: AiChatSession): AiChatSession {
  return {
    ...session,
    mode: "concierge",
    confirmed: false,
    phase: "info",
  };
}

export async function runConciergeResponse(
  message: string,
  session: AiChatSession,
  storePrefs: TripPreferences,
  missing: ReturnType<typeof getMissingSlots>,
  options?: {
    tripContext?: AiChatTripContext;
    onToolResult?: (result: ConciergeToolResult) => void;
    onSynthDelta?: (blocks: Pick<AiChatDisplayBlocks, "headline" | "tips">) => void;
    streamSynth?: boolean;
  },
): Promise<AiChatResponse> {
  const turn = await runConciergeTurn({
    message,
    session,
    storePrefs,
    tripContext: options?.tripContext,
    onToolResult: options?.onToolResult,
    onSynthDelta: options?.onSynthDelta,
    streamSynth: options?.streamSynth,
  });
  let blocks: AiChatDisplayBlocks = {
    headline: turn.blocks.headline,
    days: [],
    tips: turn.blocks.tips,
    sources: turn.blocks.sources,
    actions: turn.blocks.actions,
  };

  if (
    session.mode === "planning" &&
    (session.phase === "clarify" || session.phase === "confirm") &&
    missing.length > 0
  ) {
    blocks = appendPlanningNudge(blocks, session);
  }

  const nextSlot = getNextMissingSlot(missing);
  const quickReplies =
    session.mode === "planning" && session.phase === "clarify" && missing.length > 0
      ? buildClarifyQuickReplies(missing, nextSlot)
      : session.mode === "planning" && session.phase === "confirm"
        ? buildConfirmQuickReplies()
        : [];

  const updatedSession: AiChatSession = {
    ...session,
    lastToolCalls: turn.toolCalls,
  };

  return buildChatResponse(
    "info",
    blocks,
    updatedSession,
    quickReplies,
    turn.suggestedPlaceIds,
    turn.provider,
    storePrefs,
    turn.toolCalls,
  );
}

export async function runProposeLlm(
  message: string,
  session: AiChatSession,
  history: AiChatMessage[],
  storePrefs: TripPreferences,
  phase: "propose" | "refine",
): Promise<{ blocks: AiChatDisplayBlocks; suggestedPlaceIds: string[]; provider: AiProvider }> {
  const catalog = buildPlaceCatalogForAi(session.slots.zoneId ?? storePrefs.zoneId);
  const weatherSummary = await buildWeatherSummaryForAi();
  const validIds = new Set(catalog.map((p) => p.id));
  const tripSlots = sessionToTripPreferences(session.slots, storePrefs);

  const system = phase === "refine" ? CHAT_REFINE_SYSTEM : CHAT_PROPOSE_SYSTEM;

  const llm = await completeJsonWithLlm<LlmChatPayload>({
    system,
    user: JSON.stringify({
      message,
      tripSlots,
      weatherSummary,
      conversationHistory: history.slice(-10),
      catalog,
      previousPlaceIds: session.lastProposedPlaceIds,
    }),
  });

  if (!llm?.data) {
    return {
      blocks: {
        headline: "응답을 만들지 못했어요.",
        days: [],
        tips: ["잠시 후 다시 시도해 주세요."],
      },
      suggestedPlaceIds: [],
      provider: "rules",
    };
  }

  const blocks = normalizeLlmBlocks(llm.data);
  const suggestedPlaceIds = resolveSuggestedPlaceIds(
    catalog,
    blocks,
    llm.data.suggestedPlaceIds ?? [],
    validIds,
  );

  return { blocks, suggestedPlaceIds, provider: llm.provider };
}

export function shouldUsePlanningPipeline(options: {
  message: string;
  intent: ReturnType<typeof detectIntent>;
  session: AiChatSession;
  slotPatch?: Partial<AiChatSession["slots"]>;
  action?: "confirm_go" | "reset_confirm";
}): boolean {
  if (options.action === "confirm_go") return true;
  if (classifyInfoQuery(options.message)) return false;

  if (isExplicitPlanRequest(options.message)) return true;

  const mode = options.session.mode ?? "concierge";
  if (mode !== "planning") return false;

  if (options.intent === "refine") return true;
  if (options.intent === "plan") return true;
  if (options.slotPatch) return true;
  if (isLikelySlotAnswer(options.message)) return true;

  return false;
}

export type AskTravelAssistantOptions = {
  message: string;
  preferences?: TripPreferences;
  history?: AiChatMessage[];
  session?: AiChatSession;
  slotPatch?: Partial<AiChatSession["slots"]>;
  action?: "confirm_go" | "reset_confirm";
  tripContext?: AiChatTripContext;
  streamSynth?: boolean;
  onToolResult?: (result: ConciergeToolResult) => void;
  onSynthDelta?: (blocks: Pick<AiChatDisplayBlocks, "headline" | "tips">) => void;
};

export function prepareChatTurn(options: AskTravelAssistantOptions) {
  const storePrefs = options.preferences ?? defaultPreferences;
  let session = options.session ?? createInitialChatSession();
  const history = options.history ?? [];

  const historyPatch = mergeSlotsFromHistory(history);
  if (Object.keys(historyPatch).length > 0) {
    session = applySlotPatch(session, historyPatch);
  }

  if (options.slotPatch) {
    session = applySlotPatch(session, options.slotPatch);
  }

  if (options.action === "reset_confirm") {
    session = handleResetConfirm(session);
  }

  let intent = detectIntent(options.message, history, session);

  if (options.action === "confirm_go") {
    intent = "confirm_go";
  }

  if (options.slotPatch || isLikelySlotAnswer(options.message)) {
    intent = "plan";
  }

  const infoKind = classifyInfoQuery(options.message);
  const slotMerge = mergeSlotsFromMessage(options.message);
  const slotKeys = Object.keys(slotMerge);
  const zoneOnlySlotPatch = slotKeys.length === 1 && slotKeys[0] === "zoneId";
  if (slotKeys.length > 0 && !infoKind && !zoneOnlySlotPatch) {
    intent = "plan";
  }

  if (isExplicitPlanRequest(options.message)) {
    session = { ...session, mode: "planning" };
  }

  session = advanceSessionAfterMessage(session, options.message, storePrefs, intent);
  const missing = getMissingSlots(session.slots);

  return { storePrefs, session, history, intent, missing };
}

export async function askTravelAssistant(
  options: AskTravelAssistantOptions,
): Promise<AiChatResponse> {
  const { storePrefs, session: preparedSession, history, intent, missing } =
    prepareChatTurn(options);
  let session = preparedSession;
  try {
    if (!shouldUsePlanningPipeline({ ...options, intent, session })) {
      return runConciergeResponse(options.message, session, storePrefs, missing, {
        tripContext: options.tripContext,
      });
    }

    if (intent === "plan" && missing.length > 0) {
      const nextSlot = getNextMissingSlot(missing);
      const clarify = buildClarifyBlocks(session, missing);
      return buildChatResponse(
        "clarify",
        { headline: clarify.headline, days: [], tips: clarify.tips },
        session,
        buildClarifyQuickReplies(missing, nextSlot),
        [],
        "rules",
        storePrefs,
      );
    }

    if (session.phase === "confirm" && !session.confirmed) {
      const confirm = buildConfirmBlocks(session);
      return buildChatResponse(
        "confirm",
        { headline: confirm.headline, days: [], tips: confirm.tips },
        session,
        buildConfirmQuickReplies(),
        [],
        "rules",
        storePrefs,
      );
    }

    if (
      intent === "confirm_go" ||
      (intent === "plan" && session.confirmed && missing.length === 0)
    ) {
      session = { ...session, phase: "propose", confirmed: true, mode: "planning" };
      const llm = await runProposeLlm(options.message, session, history, storePrefs, "propose");
      session = {
        ...session,
        lastProposedPlaceIds: llm.suggestedPlaceIds,
        phase: "propose",
      };
      return buildChatResponse(
        "propose",
        llm.blocks,
        session,
        [],
        llm.suggestedPlaceIds,
        llm.provider,
        storePrefs,
      );
    }

    if (intent === "refine") {
      session = { ...session, phase: "refine", confirmed: true, mode: "planning" };
      const llm = await runProposeLlm(options.message, session, history, storePrefs, "refine");
      session = {
        ...session,
        lastProposedPlaceIds: llm.suggestedPlaceIds,
        phase: "propose",
      };
      return buildChatResponse(
        "refine",
        llm.blocks,
        session,
        [],
        llm.suggestedPlaceIds,
        llm.provider,
        storePrefs,
      );
    }

    return runConciergeResponse(options.message, session, storePrefs, missing, {
      tripContext: options.tripContext,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const provider: AiProvider = "rules";

    if (/quota|429|RESOURCE_EXHAUSTED/i.test(message)) {
      return buildChatResponse(
        "info",
        {
          headline: "Gemini 사용 한도에 걸렸어요.",
          days: [],
          tips: ["잠시 후 다시 시도해 주세요."],
        },
        session,
        [],
        [],
        provider,
        storePrefs,
      );
    }

    return buildChatResponse(
      "info",
      {
        headline: "응답을 만들지 못했어요.",
        days: [],
        tips: ["잠시 후 다시 시도해 주세요."],
      },
      session,
      [],
      [],
      provider,
      storePrefs,
    );
  }
}
