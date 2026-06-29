import { NextResponse } from "next/server";
import { searchKakaoKeyword } from "@/services/external/kakaoLocalService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim();

  if (!query) {
    return NextResponse.json({ error: "query is required" }, { status: 400 });
  }

  try {
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    const center =
      Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : undefined;

    const documents = await searchKakaoKeyword({
      query,
      center,
      radiusMeters: Number(searchParams.get("radius")) || 30_000,
      size: Number(searchParams.get("size")) || 5,
    });

    return NextResponse.json({ query, documents });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kakao local search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
