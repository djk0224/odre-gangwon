import type { ConciergeToolName } from "@/services/ai/concierge/types";

const EXPLICIT_PLAN =
  /일정\s*(추천|만들|짜)|맞춤\s*일정|코스\s*(추천|짜|만들)|플랜\s*짜/i;

export function isExplicitPlanRequest(message: string): boolean {
  return EXPLICIT_PLAN.test(message.trim());
}

/** 규칙 기반 툴 라우터 — LLM 없이도 안정적으로 도구 선택 */
export function routeConciergeTools(message: string): ConciergeToolName[] {
  const text = message.trim();
  const tools: ConciergeToolName[] = [];

  if (/버스|정류장|도착|교통|시외|터미널|ktx|열차/i.test(text)) {
    tools.push("get_transit_arrivals");
  }
  if (/날씨|기온|비\s*올|우산|맑|춥|덥|강수/i.test(text)) {
    tools.push("get_weather");
  }
  if (/언제|날짜|출발|가는지|떠나|몇\s*일\s*가/i.test(text)) {
    tools.push("get_trip_context");
  }
  if (/\d\s*코스|네이처|드라이브길|바다\s*드라이브/i.test(text)) {
    tools.push("get_nature_road");
  }
  if (/숙소|펜션|호텔|숙박|머물/i.test(text) && !/맛|식당|횟/.test(text)) {
    tools.push("search_stays", "rag_search");
  }
  if (/맛집|식당|횟|카페|음식|먹을/i.test(text)) {
    tools.push("search_local_commerce", "rag_search");
  }
  if (/혼잡|대기|웨이팅|한산|붐빌|사람\s*많/i.test(text)) {
    tools.push("get_crowd", "get_datalab", "rag_search");
  }
  if (/연관\s*관광|함께\s*가|주변\s*관광|빅데이터|관광빅데이터|수요\s*지수/i.test(text)) {
    tools.push("get_datalab", "search_places");
  }
  if (/예약|qr|티켓|입장|결제/i.test(text)) {
    tools.push("open_reservation", "get_crowd");
  }
  if (/케어|늦을|우회|당일|지금\s*뭐|다음\s*일정/i.test(text)) {
    tools.push("get_care", "get_weather");
  }
  if (/추천|어디|장소|관광|가볼|검색|볼만|코스/i.test(text) && !/\d\s*코스/.test(text)) {
    tools.push("search_places", "rag_search");
  }

  if (tools.length === 0) {
    tools.push("rag_search", "search_places");
  }

  return [...new Set(tools)].slice(0, 5);
}
