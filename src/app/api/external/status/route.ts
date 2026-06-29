import { NextResponse } from "next/server";
import { isDemoAuthEnabled } from "@/lib/demoAuth";
import {
  getDataSourceStatus,
  getKakaoRestApiKey,
  getPublicDataPortalKey,
  getTourApiServiceKey,
  isLlmConfigured,
} from "@/lib/serverEnv";
import { loadGangwonDataLabSnapshot } from "@/lib/tourDataLabSnapshot";

export async function GET() {
  const datalab = loadGangwonDataLabSnapshot();
  const kakaoMapKey = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";

  return NextResponse.json({
    sources: getDataSourceStatus(),
    checkedAt: new Date().toISOString(),
    deploy: {
      kakaoMapClient: Boolean(kakaoMapKey),
      kakaoRest: Boolean(getKakaoRestApiKey()),
      publicDataPortal: Boolean(getPublicDataPortalKey()),
      tourGw: Boolean(getTourApiServiceKey()),
      demoAuth: isDemoAuthEnabled(),
      llm: isLlmConfigured(),
      nodeEnv: process.env.NODE_ENV ?? "development",
      vercel: Boolean(process.env.VERCEL),
      region: process.env.VERCEL_REGION ?? null,
    },
    execution: {
      kakaoRestConfigured: Boolean(getKakaoRestApiKey()),
      llmConfigured: isLlmConfigured(),
      datalabSnapshot: datalab
        ? {
            fetchedAt: datalab.fetchedAt,
            source: datalab.source,
            sigunguCount: Object.keys(datalab.sigungu).length,
            baseYm: datalab.baseYm ?? null,
          }
        : null,
    },
  });
}
