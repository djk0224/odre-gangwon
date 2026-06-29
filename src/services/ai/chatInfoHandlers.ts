import { fetchVilageForecast } from "@/services/external/weatherService";
import {
  getNatureRoadCourse,
  getNatureRoadCourseIdForZone,
} from "@/services/natureRoadCatalog";
import {
  classifyInfoQuery,
  formatSlotsSummary,
  sessionToTripPreferences,
} from "@/services/ai/chatSession";
import type { AiChatDisplayBlocks } from "@/services/ai/types";
import type { AiChatSession } from "@/services/ai/types";
import type { TripPreferences } from "@/types/travel";
import { getSeasonLabel } from "@/lib/regionalPreferences";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";

export type InfoQueryKind = NonNullable<ReturnType<typeof classifyInfoQuery>>;

function formatTravelDateAnswer(session: AiChatSession, storePrefs: TripPreferences): AiChatDisplayBlocks {
  const merged = sessionToTripPreferences(session.slots, storePrefs);
  const hasExplicitDate = Boolean(session.slots.travelDate);

  if (hasExplicitDate) {
    return {
      headline: `여행 출발일은 ${merged.travelDate}이에요.`,
      days: [],
      tips: [
        `${getSeasonLabel(merged.season)} 시즌으로 잡혀 있어요.`,
        "일정을 바꾸고 싶으면 날짜를 말씀해 주세요.",
      ],
    };
  }

  if (session.slots.season && !hasExplicitDate) {
    return {
      headline: `아직 정확한 날짜는 없고, ${getSeasonLabel(merged.season)} 여행으로 이해했어요.`,
      days: [],
      tips: ["출발일을 정해 주시면 날씨·동선까지 맞춰 드릴게요."],
    };
  }

  return {
    headline: "아직 출발일은 정해지지 않았어요.",
    days: [],
    tips: [
      `앱에 저장된 기본값은 ${storePrefs.travelDate}이지만, 채팅에서 아직 확정한 날짜는 없어요.`,
      "언제 떠나시는지 알려 주시면 그날 기준으로 안내할게요.",
    ],
  };
}

async function formatWeatherAnswer(
  zoneId?: TripPreferences["zoneId"],
): Promise<AiChatDisplayBlocks> {
  const zoneLabel = zoneId ? travelZoneShortLabels[zoneId] : "강원";
  const weather = await fetchVilageForecast({ regionLabel: zoneLabel });
  if (!weather) {
    return {
      headline: "날씨 정보를 지금은 불러오지 못했어요.",
      days: [],
      tips: ["잠시 후 다시 물어봐 주시거나, 출발일을 알려 주시면 더 정확해요."],
    };
  }

  return {
    headline: `${zoneLabel} 권역 단기 예보 (${weather.region})`,
    days: [],
    tips: [
      `${weather.skyLabel}${weather.temperatureC != null ? ` · ${weather.temperatureC}°C` : ""}${
        weather.precipitationMm != null ? ` · 강수 ${weather.precipitationMm}mm` : ""
      }`,
      "일정 짜기 전에 날씨만 보시는 거라면, 실내·실외 비중을 같이 맞춰 드릴 수 있어요.",
    ],
  };
}

function formatNatureRoadAnswer(zoneId: TripPreferences["zoneId"]): AiChatDisplayBlocks {
  const courseId = getNatureRoadCourseIdForZone(zoneId) ?? 6;
  const course = getNatureRoadCourse(courseId);
  if (!course) {
    return {
      headline: `${courseId}코스 정보를 불러오지 못했어요.`,
      days: [],
      tips: ["잠시 후 다시 시도해 주세요."],
    };
  }

  const spotNames = course.viewPoints
    .filter((spot) => spot.type === "View Point")
    .slice(0, 3)
    .map((spot) => spot.spotName);

  const routeHint =
    course.navWaypoints.length > 0
      ? course.navWaypoints.slice(0, 3).join(" → ")
      : spotNames.join(" → ");

  return {
    headline: `${course.name}는 강원 네이처로드 「${course.roadName}」이에요.`,
    days: [],
    tips: [
      `전체 ${course.distanceKm}km · ${course.routeSummary.split(" - ").slice(0, 2).join(" · ")}`,
      routeHint ? `주요 경유: ${routeHint}` : "홈에서 권역별 네이처로드 카드를 확인해 보세요.",
      "홈 화면 「네이처로드」에서 AI 드라이브 코스로 일정에 넣을 수 있어요.",
    ],
  };
}

export async function buildDeterministicInfoResponse(
  kind: InfoQueryKind,
  session: AiChatSession,
  storePrefs: TripPreferences,
): Promise<AiChatDisplayBlocks> {
  switch (kind) {
    case "travel_date":
      return formatTravelDateAnswer(session, storePrefs);
    case "weather":
      return await formatWeatherAnswer(storePrefs.zoneId);
    case "nature_road":
      return formatNatureRoadAnswer(storePrefs.zoneId);
    case "lodging":
    case "dining":
      return {
        headline: "맛집·숙소는 컨시어지 검색으로 안내해 드려요.",
        days: [],
        tips: ["잠시만 기다려 주세요."],
      };
    case "general":
      return {
        headline: "궁금한 점을 조금만 더 구체적으로 말씀해 주세요.",
        days: [],
        tips: ["예: 「6코스가 뭐야」, 「날씨 알려줘」, 「언제 가」"],
      };
  }
}

export function appendPlanningNudge(
  blocks: AiChatDisplayBlocks,
  session: AiChatSession,
): AiChatDisplayBlocks {
  const summary = formatSlotsSummary(session.slots);
  if (summary === "조건을 아직 모르고 있어요") {
    return {
      ...blocks,
      tips: [
        ...blocks.tips,
        "맞춤 일정을 원하시면 기간·동행·이동 수단을 알려 주세요.",
      ],
    };
  }
  return {
    ...blocks,
    tips: [...blocks.tips, `일정 이어서: ${summary} — 수정할 조건이 있으면 말씀해 주세요.`],
  };
}
