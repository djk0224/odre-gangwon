import { NextResponse } from "next/server";
import { fetchBusRoutes } from "@/services/external/tagoTransitService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const items = await fetchBusRoutes({
      cityCode: searchParams.get("cityCode") ?? undefined,
      numOfRows: Number(searchParams.get("numOfRows")) || 30,
    });
    return NextResponse.json({ count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TAGO routes API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
