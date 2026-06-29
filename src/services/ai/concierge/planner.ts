import { completeJsonWithLlm } from "@/services/ai/provider";
import { routeConciergeTools } from "@/services/ai/concierge/router";
import type { ConciergeToolName } from "@/services/ai/concierge/types";

const ALL_TOOLS: ConciergeToolName[] = [
  "rag_search",
  "search_places",
  "search_local_commerce",
  "search_stays",
  "get_datalab",
  "get_weather",
  "get_nature_road",
  "get_transit_arrivals",
  "get_trip_context",
  "get_crowd",
  "get_care",
  "open_reservation",
];

const PLANNER_SYSTEM = `You are the tool router for ODRÉ GANGWON travel concierge (Gangwon-wide, 7 zones).
Pick 1-5 tools to answer the user message. Return ONLY JSON: { "tools": string[] }.
Valid tools: ${ALL_TOOLS.join(", ")}.
Rules:
- Prefer specific tools over rag_search when possible.
- open_reservation for booking/QR/how to reserve.
- get_crowd for wait times and busy hours.
- get_care for day-of delays, rain changes, what to do today.
- search_stays for lodging; search_local_commerce for restaurants.
- get_datalab for regional tourism demand / visitor trend questions.
- Do not pick propose_itinerary (not a tool). User must say plan explicitly elsewhere.`;

function isDefaultRulePick(tools: ConciergeToolName[]): boolean {
  return (
    tools.length === 2 &&
    tools.includes("rag_search") &&
    tools.includes("search_places")
  );
}

function mergeTools(
  rule: ConciergeToolName[],
  planned: ConciergeToolName[],
): ConciergeToolName[] {
  const merged = [...rule];
  for (const tool of planned) {
    if (ALL_TOOLS.includes(tool) && !merged.includes(tool)) {
      merged.push(tool);
    }
  }
  return merged.slice(0, 5);
}

export async function resolveConciergeTools(message: string): Promise<ConciergeToolName[]> {
  const ruleTools = routeConciergeTools(message);

  if (!isDefaultRulePick(ruleTools) && ruleTools.length >= 1) {
    return ruleTools;
  }

  try {
    const llm = await completeJsonWithLlm<{ tools?: string[] }>({
      system: PLANNER_SYSTEM,
      user: JSON.stringify({ message, suggestedByRules: ruleTools }),
      temperature: 0.1,
    });

    const planned = (llm?.data.tools ?? [])
      .filter((name): name is ConciergeToolName =>
        ALL_TOOLS.includes(name as ConciergeToolName),
      )
      .slice(0, 5);

    if (planned.length > 0) {
      return mergeTools(ruleTools, planned);
    }
  } catch {
    /* rule only */
  }

  return ruleTools;
}
