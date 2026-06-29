import type { ConciergeToolName, ConciergeToolResult } from "@/services/ai/concierge/types";
import { runConciergeTool, type ToolRunContext } from "@/services/ai/concierge/tools";

const FALLBACK_TOOLS: ConciergeToolName[] = ["rag_search", "search_places", "get_trip_context"];

export async function runConciergeToolsWithFallback(
  tools: ConciergeToolName[],
  ctx: ToolRunContext,
  onTool?: (result: ConciergeToolResult) => void,
): Promise<ConciergeToolResult[]> {
  const results: ConciergeToolResult[] = [];

  for (const tool of tools) {
    const result = await runConciergeTool(tool, ctx);
    results.push(result);
    onTool?.(result);
  }

  const hasSuccess = results.some((r) => r.ok);
  if (hasSuccess) {
    return results;
  }

  for (const fallback of FALLBACK_TOOLS) {
    if (tools.includes(fallback)) continue;
    const result = await runConciergeTool(fallback, ctx);
    results.push(result);
    onTool?.(result);
    if (result.ok) break;
  }

  return results;
}
