import { NextResponse } from "next/server";
import { fetchSearchKeyword } from "@/services/external/tourGwService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword")?.trim();
  if (!keyword) {
    return NextResponse.json({ error: "keyword is required" }, { status: 400 });
  }

  try {
    const items = await fetchSearchKeyword({
      keyword,
      areaCode: searchParams.get("areaCode") ?? undefined,
      numOfRows: Number(searchParams.get("numOfRows")) || 10,
    });
    return NextResponse.json({ keyword, count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tour keyword API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
