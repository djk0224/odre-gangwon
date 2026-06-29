import { NextResponse } from "next/server";
import { fetchBusStops } from "@/services/external/tagoTransitService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const items = await fetchBusStops({
      cityCode: searchParams.get("cityCode") ?? undefined,
      numOfRows: Number(searchParams.get("numOfRows")) || 30,
      pageNo: Number(searchParams.get("pageNo")) || 1,
    });
    return NextResponse.json({ count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TAGO stops API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
