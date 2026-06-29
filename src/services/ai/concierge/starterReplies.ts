import type { AiQuickReply } from "@/services/ai/types";

/** 컨시어지 모드 기본 제안 칩 */
export const CONCIERGE_STARTER_REPLIES: AiQuickReply[] = [
  { id: "starter-weather", label: "날씨 알려줘" },
  { id: "starter-6course", label: "6코스가 뭐야?" },
  { id: "starter-bus", label: "버스 언제 와?" },
  { id: "starter-food", label: "삼척 맛집 추천" },
  { id: "starter-stay", label: "동해 근처 숙소" },
  { id: "starter-plan", label: "일정 추천해줘" },
];
