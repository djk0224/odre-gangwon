import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rateLimit";
import { createInitialChatSession } from "@/lib/aiChatSessionDefaults";
import { askTravelAssistant } from "@/services/ai/chat";
import { streamTravelAssistant } from "@/services/ai/chatStream";
import { encodeStreamLine } from "@/services/ai/chatStreamUtils";
import type { AiChatMessage, AiChatSession, AiChatTripContext } from "@/services/ai/types";
import type { TripPreferences } from "@/types/travel";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatBody = {
  message?: string;
  preferences?: TripPreferences;
  history?: AiChatMessage[];
  session?: AiChatSession;
  slotPatch?: AiChatSession["slots"];
  action?: "confirm_go" | "reset_confirm";
  stream?: boolean;
  tripContext?: AiChatTripContext;
};

function parseBody(body: ChatBody) {
  const message = body.message?.trim() ?? "";
  if (!message && !body.slotPatch && !body.action) {
    return { error: "message is required" as const };
  }
  return {
    message: message || "계속",
    preferences: body.preferences,
    history: body.history,
    session: body.session,
    slotPatch: body.slotPatch,
    action: body.action,
    tripContext: body.tripContext,
  };
}

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, "ai-chat", {
    limit: 40,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = (await request.json()) as ChatBody;
    const parsed = parseBody(body);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    if (body.stream) {
      const stream = new ReadableStream({
        async start(controller) {
          try {
            await streamTravelAssistant(parsed, (event) => {
              controller.enqueue(encodeStreamLine(event));
            });
          } catch (error) {
            const errMessage = error instanceof Error ? error.message : "AI chat failed";
            controller.enqueue(
              encodeStreamLine({
                type: "done",
                result: {
                  answer: "응답을 만들지 못했어요.",
                  phase: "info",
                  blocks: {
                    headline: "응답을 만들지 못했어요.",
                    days: [],
                    tips: ["잠시 후 다시 시도해 주세요."],
                  },
                  quickReplies: [],
                  session: parsed.session ?? createInitialChatSession(),
                  slotsSummary: "",
                  suggestedPlaceIds: [],
                  itineraryReady: false,
                  provider: "rules",
                },
              }),
            );
            console.error(errMessage);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "application/x-ndjson; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    }

    const result = await askTravelAssistant(parsed);
    return NextResponse.json(result);
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "AI chat failed";
    return NextResponse.json({ error: errMessage }, { status: 502 });
  }
}
