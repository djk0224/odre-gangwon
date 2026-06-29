import { completeJsonWithLlm } from "@/services/ai/provider";
import {
  estimateWaitFromCrowd,
  getCrowdLabel,
} from "@/services/crowdService";
import type { EngineContext } from "@/services/engines/engineContext";
import {
  estimateSlotCrowd,
  pickRecommendedSlot,
} from "@/services/engines/crowdEngine";
import type { AiCrowdGuidance, AiProvider } from "@/services/ai/types";
import type { Place, ReservationSlot } from "@/types/travel";

const CROWD_SYSTEM = `You are ODRÉ GANGWON crowd advisor for attraction time slots.
Return ONLY JSON: { "summary": string, "recommendedSlotId": string, "avoidSlotIds": string[] }.
summary in Korean. Pick recommendedSlotId from slot ids. Prefer lower crowd and shorter wait.`;

export async function generateCrowdGuidance(
  place: Place,
  slots: ReservationSlot[],
  engineContext?: EngineContext,
): Promise<AiCrowdGuidance> {
  const context = engineContext;
  const slotFacts = slots.map((slot) => {
    const estimate = context ? estimateSlotCrowd(slot, context) : null;
    return {
      id: slot.id,
      time: slot.time,
      crowd: getCrowdLabel(estimate?.level ?? slot.crowdLevel),
      wait: estimate?.expectedWait ?? slot.expectedWait ?? estimateWaitFromCrowd(slot.crowdLevel),
      confidence: estimate?.confidence,
      remaining: Math.max(slot.capacity - slot.reservedCount, 0),
    };
  });

  const best = context
    ? pickRecommendedSlot(slots, context)
    : [...slots].sort(
        (a, b) =>
          (a.reservedCount / Math.max(a.capacity, 1)) -
          (b.reservedCount / Math.max(b.capacity, 1)),
      )[0];

  try {
    const llm = await completeJsonWithLlm<{
      summary: string;
      recommendedSlotId: string;
      avoidSlotIds: string[];
    }>({
      system: CROWD_SYSTEM,
      user: JSON.stringify({ place: { id: place.id, name: place.name }, slots: slotFacts }),
    });

    if (llm?.data.summary) {
      const validIds = new Set(slots.map((s) => s.id));
      return {
        summary: llm.data.summary,
        recommendedSlotId: validIds.has(llm.data.recommendedSlotId)
          ? llm.data.recommendedSlotId
          : best?.id,
        avoidSlotIds: (llm.data.avoidSlotIds ?? []).filter((id) => validIds.has(id)),
        provider: llm.provider,
      };
    }
  } catch {
    /* rules */
  }

  const provider: AiProvider = "rules";
  if (!best) {
    return {
      summary: "예약 가능한 시간대가 없습니다.",
      avoidSlotIds: [],
      provider,
    };
  }

  const avoid = slots
    .filter((s) => {
      const est = context ? estimateSlotCrowd(s, context) : null;
      const level = est?.level ?? s.crowdLevel;
      return level === "high" || level === "very-high";
    })
    .map((s) => s.id)
    .filter((id) => id !== best.id);

  return {
    summary: `${best.time} 시간대가 ${getCrowdLabel(best.crowdLevel)}(예상 대기 ${best.expectedWait ?? estimateWaitFromCrowd(best.crowdLevel)})로 가장 여유롭습니다.`,
    recommendedSlotId: best.id,
    avoidSlotIds: avoid,
    provider,
  };
}
