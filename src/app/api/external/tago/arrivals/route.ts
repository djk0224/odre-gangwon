import { NextResponse } from "next/server";
import { fetchBusArrivals } from "@/services/external/tagoTransitService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeId = searchParams.get("nodeId")?.trim();
  if (!nodeId) {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  try {
    const items = await fetchBusArrivals({
      cityCode: searchParams.get("cityCode") ?? undefined,
      nodeId,
    });
    return NextResponse.json({ nodeId, count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "TAGO arrival API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
