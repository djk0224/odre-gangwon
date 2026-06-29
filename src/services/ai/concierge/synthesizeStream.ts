import { streamGeminiText } from "@/services/ai/provider";
import type { ConciergeToolResult } from "@/services/ai/concierge/types";
import {
  collectPlaceIdsFromResults,
  collectSourcesFromResults,
  rulesSynthesize,
} from "@/services/ai/concierge/synthesize";
import type { AiChatDisplayBlocks, AiProvider } from "@/services/ai/types";

const STREAM_SYNTH_SYSTEM = `You are ODRÉ GANGWON travel concierge for all Gangwon travel zones.
Tool results are ground truth — do not invent places or times.
Reply in Korean plain text only (no JSON, no markdown headings).
Line 1: direct answer in 1-2 sentences.
Following lines: short facts from tools, each line starting with · (max 4 lines).
No full day-by-day itinerary.`;

export function parseStreamedConciergeText(text: string): Pick<AiChatDisplayBlocks, "headline" | "tips"> {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { headline: "", tips: [] };
  }
  const headline = lines[0] ?? "";
  const tips = lines
    .slice(1)
    .map((line) => line.replace(/^[·•\-]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 5);
  return { headline, tips };
}

export async function synthesizeConciergeAnswerStreaming(options: {
  message: string;
  toolResults: ConciergeToolResult[];
  onDelta: (blocks: Pick<AiChatDisplayBlocks, "headline" | "tips">) => void;
}): Promise<{
  blocks: AiChatDisplayBlocks;
  suggestedPlaceIds: string[];
  provider: AiProvider;
}> {
  const { message, toolResults, onDelta } = options;
  const suggestedPlaceIds = collectPlaceIdsFromResults(toolResults);
  const sources = collectSourcesFromResults(toolResults);
  const toolPayload = toolResults.map((r) => ({
    tool: r.tool,
    ok: r.ok,
    summary: r.summary,
    lines: r.lines,
  }));

  let accumulated = "";
  let streamed = false;

  try {
    for await (const piece of streamGeminiText({
      system: STREAM_SYNTH_SYSTEM,
      user: JSON.stringify({ userMessage: message, toolResults: toolPayload }),
      temperature: 0.25,
    })) {
      accumulated += piece;
      streamed = true;
      onDelta(parseStreamedConciergeText(accumulated));
    }
  } catch {
    streamed = false;
  }

  if (streamed && accumulated.trim()) {
    const parsed = parseStreamedConciergeText(accumulated);
    const blocks: AiChatDisplayBlocks = {
      headline: parsed.headline || "안내",
      days: [],
      tips:
        parsed.tips.length > 0
          ? parsed.tips
          : toolResults.flatMap((r) => r.lines).slice(0, 4),
      sources,
    };
    onDelta(parsed);
    return { blocks, suggestedPlaceIds, provider: "gemini" };
  }

  const blocks = rulesSynthesize(message, toolResults);
  onDelta({ headline: blocks.headline, tips: blocks.tips });
  return { blocks, suggestedPlaceIds, provider: "rules" };
}
