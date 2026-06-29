import { NextResponse } from "next/server";
import { fetchBusLocations } from "@/services/external/tagoTransitService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId")?.trim();
  if (!routeId) {
    return NextResponse.json({ error: "routeId is required" }, { status: 400 });
  }

  try {
    const items = await fetchBusLocations({
      cityCode: searchParams.get("cityCode") ?? undefined,
      routeId,
    });
    return NextResponse.json({ routeId, count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TAGO location API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
