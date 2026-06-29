import { resolveConciergeTools } from "@/services/ai/concierge/planner";
import { synthesizeConciergeAnswer } from "@/services/ai/concierge/synthesize";
import { synthesizeConciergeAnswerStreaming } from "@/services/ai/concierge/synthesizeStream";
import { runConciergeToolsWithFallback } from "@/services/ai/concierge/toolRunner";
import type { ToolRunContext } from "@/services/ai/concierge/tools";
import type { ConciergeToolResult, ConciergeTurnResult } from "@/services/ai/concierge/types";
import type { AiChatDisplayBlocks, AiChatSession, AiChatTripContext } from "@/services/ai/types";
import type { TripPreferences } from "@/types/travel";

export async function runConciergeTurn(options: {
  message: string;
  session: AiChatSession;
  storePrefs: TripPreferences;
  tripContext?: AiChatTripContext;
  onToolResult?: (result: ConciergeToolResult) => void;
  onSynthDelta?: (blocks: Pick<AiChatDisplayBlocks, "headline" | "tips">) => void;
  streamSynth?: boolean;
}): Promise<ConciergeTurnResult> {
  const tools = await resolveConciergeTools(options.message);
  const ctx: ToolRunContext = {
    message: options.message,
    session: options.session,
    storePrefs: options.storePrefs,
    tripContext: options.tripContext,
  };

  const toolResults = await runConciergeToolsWithFallback(tools, ctx, options.onToolResult);

  const { blocks, suggestedPlaceIds, provider } = options.streamSynth && options.onSynthDelta
    ? await synthesizeConciergeAnswerStreaming({
        message: options.message,
        toolResults,
        onDelta: options.onSynthDelta,
      })
    : await synthesizeConciergeAnswer({
        message: options.message,
        toolResults,
      });

  const actions = toolResults.flatMap((r) => r.actions ?? []).slice(0, 4);

  return {
    blocks: {
      headline: blocks.headline,
      days: [],
      tips: blocks.tips,
      sources: blocks.sources,
      actions: actions.length > 0 ? actions : blocks.actions,
    },
    suggestedPlaceIds,
    toolCalls: tools,
    provider,
  };
}
