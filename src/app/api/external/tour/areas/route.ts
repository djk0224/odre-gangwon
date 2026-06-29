import { NextResponse } from "next/server";
import { fetchAreaBasedList } from "@/services/external/tourGwService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const items = await fetchAreaBasedList({
      areaCode: searchParams.get("areaCode") ?? undefined,
      sigunguCode: searchParams.get("sigunguCode") ?? undefined,
      contentTypeId: searchParams.get("contentTypeId") ?? undefined,
      numOfRows: Number(searchParams.get("numOfRows")) || 20,
    });
    return NextResponse.json({ count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tour area API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
