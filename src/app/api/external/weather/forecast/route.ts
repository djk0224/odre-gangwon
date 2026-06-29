import { NextResponse } from "next/server";
import { fetchVilageForecast } from "@/services/external/weatherService";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  try {
    const forecast = await fetchVilageForecast({
      nx: searchParams.get("nx") ? Number(searchParams.get("nx")) : undefined,
      ny: searchParams.get("ny") ? Number(searchParams.get("ny")) : undefined,
      regionLabel: searchParams.get("region") ?? "강원",
    });

    if (!forecast) {
      return NextResponse.json({ error: "No forecast data" }, { status: 404 });
    }

    return NextResponse.json(forecast);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weather API failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
