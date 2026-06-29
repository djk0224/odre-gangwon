import { NextResponse } from "next/server";
import { fetchMidLandForecast } from "@/services/external/weatherService";

export async function GET() {
  try {
    const forecast = await fetchMidLandForecast({ regionLabel: "강원 (중기)" });
    if (!forecast) {
      return NextResponse.json(
        { error: "중기예보 데이터가 없습니다. API 승인·tmFc 시각을 확인하세요." },
        { status: 404 },
      );
    }
    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Mid weather API failed";
    const status = message.includes("Forbidden") || message.includes("403") ? 403 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
