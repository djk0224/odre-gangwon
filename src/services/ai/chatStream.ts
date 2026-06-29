import { getNextMissingSlot } from "@/lib/aiChatReadiness";
import {
  askTravelAssistant,
  buildChatResponse,
  prepareChatTurn,
  runConciergeResponse,
  runProposeLlm,
  shouldUsePlanningPipeline,
  type AskTravelAssistantOptions,
} from "@/services/ai/chat";
import {
  buildClarifyBlocks,
  buildClarifyQuickReplies,
  buildConfirmBlocks,
  buildConfirmQuickReplies,
  classifyInfoQuery,
} from "@/services/ai/chatSession";
import type { AiChatStreamEvent } from "@/services/ai/chatStreamTypes";
import { chunkText, delay } from "@/services/ai/chatStreamUtils";
import type { AiChatDisplayBlocks, AiChatResponse } from "@/services/ai/types";

export type StreamEmit = (event: AiChatStreamEvent) => void;

async function streamTextBlocks(
  blocks: AiChatDisplayBlocks,
  emit: StreamEmit,
  base?: Partial<AiChatDisplayBlocks>,
  placeIds: string[] = [],
) {
  let headline = "";
  for await (const chunk of chunkText(blocks.headline)) {
    headline += chunk;
    emit({
      type: "partial",
      blocks: {
        ...base,
        headline,
        tips: [],
        days: blocks.days,
        sources: blocks.sources,
        actions: blocks.actions,
      },
      placeIds,
    });
  }

  const tips: string[] = [];
  for (const tip of blocks.tips) {
    tips.push(tip);
    emit({
      type: "partial",
      blocks: {
        ...base,
        headline,
        tips: [...tips],
        days: blocks.days,
        sources: blocks.sources,
        actions: blocks.actions,
      },
      placeIds,
    });
    await delay(60);
  }
}

export async function streamTravelAssistant(
  options: AskTravelAssistantOptions,
  emit: StreamEmit,
): Promise<AiChatResponse> {
  emit({ type: "status", message: "답변 준비 중…" });

  const { storePrefs, session, history, intent, missing } = prepareChatTurn(options);

  const usePlanning = shouldUsePlanningPipeline({
    message: options.message,
    intent,
    session,
    slotPatch: options.slotPatch,
    action: options.action,
  });

  const conciergeStreamOpts = {
    tripContext: options.tripContext,
    streamSynth: true,
    onToolResult: (toolResult: { tool: string; ok: boolean; summary: string }) => {
      emit({
        type: "tool",
        tool: toolResult.tool,
        ok: toolResult.ok,
        summary: toolResult.summary,
      });
    },
    onSynthDelta: (partial: Pick<AiChatDisplayBlocks, "headline" | "tips">) => {
      emit({
        type: "partial",
        blocks: {
          headline: partial.headline,
          tips: partial.tips,
          days: [],
        },
      });
    },
  };

  if (!usePlanning) {
    const infoKind = classifyInfoQuery(options.message);
    if (infoKind === "dining") {
      emit({ type: "status", message: "맛집·식당을 찾는 중…" });
    } else if (infoKind === "lodging") {
      emit({ type: "status", message: "숙소를 찾는 중…" });
    } else {
      emit({ type: "status", message: "정보를 찾는 중…" });
    }

    const result = await runConciergeResponse(
      options.message,
      session,
      storePrefs,
      missing,
      conciergeStreamOpts,
    );

    emit({
      type: "partial",
      blocks: result.blocks,
      placeIds: result.suggestedPlaceIds,
    });
    emit({ type: "done", result });
    return result;
  }

  try {
    if (intent === "plan" && missing.length > 0) {
      const nextSlot = getNextMissingSlot(missing);
      const clarify = buildClarifyBlocks(session, missing);
      const blocks: AiChatDisplayBlocks = {
        headline: clarify.headline,
        days: [],
        tips: clarify.tips,
      };
      const result = buildChatResponse(
        "clarify",
        blocks,
        session,
        buildClarifyQuickReplies(missing, nextSlot),
        [],
        "rules",
        storePrefs,
      );
      await streamTextBlocks(blocks, emit);
      emit({ type: "partial", blocks, placeIds: [] });
      emit({ type: "done", result });
      return result;
    }

    if (session.phase === "confirm" && !session.confirmed) {
      const confirm = buildConfirmBlocks(session);
      const blocks: AiChatDisplayBlocks = {
        headline: confirm.headline,
        days: [],
        tips: confirm.tips,
      };
      const result = buildChatResponse(
        "confirm",
        blocks,
        session,
        buildConfirmQuickReplies(),
        [],
        "rules",
        storePrefs,
      );
      await streamTextBlocks(blocks, emit);
      emit({ type: "partial", blocks, placeIds: [] });
      emit({ type: "done", result });
      return result;
    }

    if (
      intent === "confirm_go" ||
      (intent === "plan" && session.confirmed && missing.length === 0)
    ) {
      emit({ type: "status", message: "맞춤 일정을 만드는 중…" });
      let nextSession = { ...session, phase: "propose" as const, confirmed: true, mode: "planning" as const };
      const llm = await runProposeLlm(options.message, nextSession, history, storePrefs, "propose");
      nextSession = {
        ...nextSession,
        lastProposedPlaceIds: llm.suggestedPlaceIds,
        phase: "propose",
      };
      const result = buildChatResponse(
        "propose",
        llm.blocks,
        nextSession,
        [],
        llm.suggestedPlaceIds,
        llm.provider,
        storePrefs,
      );
      await streamTextBlocks(llm.blocks, emit, undefined, llm.suggestedPlaceIds);
      emit({
        type: "partial",
        blocks: llm.blocks,
        placeIds: llm.suggestedPlaceIds,
      });
      emit({ type: "done", result });
      return result;
    }

    if (intent === "refine") {
      emit({ type: "status", message: "일정을 수정하는 중…" });
      const llm = await runProposeLlm(options.message, session, history, storePrefs, "refine");
      const nextSession = {
        ...session,
        phase: "propose" as const,
        confirmed: true,
        mode: "planning" as const,
        lastProposedPlaceIds: llm.suggestedPlaceIds,
      };
      const result = buildChatResponse(
        "refine",
        llm.blocks,
        nextSession,
        [],
        llm.suggestedPlaceIds,
        llm.provider,
        storePrefs,
      );
      await streamTextBlocks(llm.blocks, emit, undefined, llm.suggestedPlaceIds);
      emit({
        type: "partial",
        blocks: llm.blocks,
        placeIds: llm.suggestedPlaceIds,
      });
      emit({ type: "done", result });
      return result;
    }

    emit({ type: "status", message: "정보를 찾는 중…" });
    const result = await runConciergeResponse(
      options.message,
      session,
      storePrefs,
      missing,
      conciergeStreamOpts,
    );
    emit({
      type: "partial",
      blocks: result.blocks,
      placeIds: result.suggestedPlaceIds,
    });
    emit({ type: "done", result });
    return result;
  } catch {
    const result = await askTravelAssistant(options);
    emit({ type: "partial", blocks: result.blocks, placeIds: result.suggestedPlaceIds });
    emit({ type: "done", result });
    return result;
  }
}
