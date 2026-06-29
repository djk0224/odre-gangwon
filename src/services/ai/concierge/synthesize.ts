import { completeJsonWithLlm } from "@/services/ai/provider";
import type { ConciergeToolResult } from "@/services/ai/concierge/types";
import type { AiChatDisplayBlocks, AiChatSource, AiProvider } from "@/services/ai/types";

const SYNTH_SYSTEM = `You are ODRÉ GANGWON travel concierge for all Gangwon travel zones (7 regions).
User asked a question. Tool results are ground truth — do not invent places or times.
Return ONLY JSON:
{
  "headline": "1-2 sentence direct answer in Korean",
  "tips": ["bullet facts from tools, max 4 short lines"],
  "acknowledgment": "optional warm phrase echoing user question, max 12 words"
}
Rules:
- days must NOT appear (omit days field).
- Cite only what tools provided. If tools empty, say what to ask next.
- No full day-by-day itinerary unless tools explicitly contain itinerary (they won't).
- Plain Korean, conversational but concise.`;

interface SynthPayload {
  headline?: string;
  tips?: string[];
  acknowledgment?: string;
}

export function collectSourcesFromResults(results: ConciergeToolResult[]): AiChatSource[] {
  const seen = new Set<string>();
  const out: AiChatSource[] = [];
  for (const result of results) {
    for (const source of result.sources) {
      if (seen.has(source.id)) continue;
      seen.add(source.id);
      out.push({
        id: source.id,
        label: source.label,
        kind: source.kind,
      });
    }
  }
  return out.slice(0, 6);
}

export function collectPlaceIdsFromResults(results: ConciergeToolResult[]): string[] {
  const ids = new Set<string>();
  for (const result of results) {
    result.placeIds?.forEach((id) => ids.add(id));
  }
  return [...ids].slice(0, 12);
}

export function rulesSynthesize(
  message: string,
  results: ConciergeToolResult[],
): AiChatDisplayBlocks {
  const okResults = results.filter((r) => r.ok);
  const primary = okResults[0] ?? results[0];

  if (!primary || !primary.ok) {
    return {
      headline: "아직 이 질문에 맞는 데이터를 찾지 못했어요.",
      days: [],
      tips: [
        "장소, 날씨, 네이처로드, 버스 도착, 맛집·숙소처럼 구체적으로 물어봐 주세요.",
        "맞춤 일정이 필요하면 「일정 추천해줘」라고 말씀해 주세요.",
      ],
      sources: collectSourcesFromResults(results),
    };
  }

  const headline =
    primary.summary.length > 80 ? `${primary.summary.slice(0, 77)}…` : primary.summary;

  const tips: string[] = [];
  for (const result of okResults) {
    tips.push(...result.lines.slice(0, 3));
  }

  const uniqueTips = [...new Set(tips)].slice(0, 5);

  if (/뭐야|무엇|알려|궁금/.test(message) && uniqueTips.length > 0) {
    return {
      headline: `질문하신 내용 기준으로 정리했어요.`,
      days: [],
      tips: uniqueTips,
      sources: collectSourcesFromResults(results),
    };
  }

  return {
    headline,
    days: [],
    tips: uniqueTips.length > 0 ? uniqueTips : [primary.summary],
    sources: collectSourcesFromResults(results),
  };
}

export async function synthesizeConciergeAnswer(options: {
  message: string;
  toolResults: ConciergeToolResult[];
}): Promise<{
  blocks: AiChatDisplayBlocks;
  suggestedPlaceIds: string[];
  provider: AiProvider;
}> {
  const { message, toolResults } = options;
  const suggestedPlaceIds = collectPlaceIdsFromResults(toolResults);
  const toolPayload = toolResults.map((r) => ({
    tool: r.tool,
    ok: r.ok,
    summary: r.summary,
    lines: r.lines,
  }));

  try {
    const llm = await completeJsonWithLlm<SynthPayload>({
      system: SYNTH_SYSTEM,
      user: JSON.stringify({ userMessage: message, toolResults: toolPayload }),
      temperature: 0.25,
    });

    if (llm?.data?.headline) {
      const tips = (llm.data.tips ?? []).filter(Boolean).slice(0, 5);
      const ack = llm.data.acknowledgment?.trim();
      return {
        blocks: {
          headline: ack ? `${ack} ${llm.data.headline}` : llm.data.headline,
          days: [],
          tips: tips.length > 0 ? tips : toolResults.flatMap((r) => r.lines).slice(0, 4),
          sources: collectSourcesFromResults(toolResults),
        },
        suggestedPlaceIds,
        provider: llm.provider,
      };
    }
  } catch {
    /* rules fallback */
  }

  return {
    blocks: rulesSynthesize(message, toolResults),
    suggestedPlaceIds,
    provider: "rules",
  };
}
