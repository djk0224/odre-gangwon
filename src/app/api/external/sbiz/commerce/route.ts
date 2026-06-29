import { NextResponse } from "next/server";
import { fetchSbizSamcheokDonghae } from "@/services/external/sbizService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("categoryLarge");
  try {
    const items = await fetchSbizSamcheokDonghae({
      city: searchParams.get("city") ?? undefined,
      categoryLarge:
        category === "음식" || category === "숙박" ? category : undefined,
      limit: Number(searchParams.get("limit")) || 60,
    });
    return NextResponse.json({ count: items.length, items });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SBIZ commerce load failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
