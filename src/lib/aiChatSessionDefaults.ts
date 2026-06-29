import type { AiChatSession } from "@/services/ai/types";

export function createInitialChatSession(): AiChatSession {
  return {
    slots: {},
    mode: "concierge",
    phase: "info",
    confirmed: false,
    lastProposedPlaceIds: [],
    askedSlots: [],
    lastToolCalls: [],
  };
}
