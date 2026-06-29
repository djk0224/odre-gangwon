import { NextResponse } from "next/server";
import {
  dedupeNaverNewsItems,
  searchNaverNews,
} from "@/services/external/naverNewsService";
import { isNaverNewsConfigured } from "@/lib/serverEnv";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() ?? "강원 관광";
  const display = Number(searchParams.get("display") ?? "3");

  if (!isNaverNewsConfigured()) {
    return NextResponse.json({
      configured: false,
      items: [],
      query,
    });
  }

  try {
    const items = dedupeNaverNewsItems(
      await searchNaverNews(query, {
        display: Number.isFinite(display) ? Math.min(display, 10) : 3,
        sort: "date",
      }),
    );

    return NextResponse.json({
      configured: true,
      query,
      items,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Naver news fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
