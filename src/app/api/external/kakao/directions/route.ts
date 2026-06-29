import { NextResponse } from "next/server";
import {
  fetchDirectionsSegment,
  fetchRoutePolylineDetailed,
} from "@/services/external/kakaoDirectionsService";
import type { Coordinates } from "@/types/travel";

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "segment";

  const originLat = parseCoord(searchParams.get("originLat"));
  const originLng = parseCoord(searchParams.get("originLng"));
  const destLat = parseCoord(searchParams.get("destLat"));
  const destLng = parseCoord(searchParams.get("destLng"));

  if (
    originLat === null ||
    originLng === null ||
    destLat === null ||
    destLng === null
  ) {
    return NextResponse.json({ error: "origin and destination coordinates required" }, { status: 400 });
  }

  const origin: Coordinates = { lat: originLat, lng: originLng };
  const destination: Coordinates = { lat: destLat, lng: destLng };

  try {
    if (mode === "polyline") {
      const waypointsRaw = searchParams.get("waypoints");
      let coordinates: Coordinates[] = [origin, destination];
      if (waypointsRaw) {
        const parsed = JSON.parse(waypointsRaw) as Coordinates[];
        if (Array.isArray(parsed) && parsed.length >= 2) {
          coordinates = parsed;
        }
      }
      const built = await fetchRoutePolylineDetailed(coordinates);
      const source =
        built.fallbackLegIndexes.length === 0 && built.usedKakao
          ? "kakao"
          : built.fallbackLegIndexes.length > 0 && built.usedKakao
            ? "partial"
            : "fallback";
      return NextResponse.json({
        path: built.path,
        fallbackLegIndexes: built.fallbackLegIndexes,
        waypointIndexes: built.waypointIndexes,
        source,
      });
    }

    const segment = await fetchDirectionsSegment(origin, destination);
    if (!segment) {
      return NextResponse.json({ error: "directions unavailable", fallback: true }, { status: 502 });
    }

    return NextResponse.json(segment);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kakao directions failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      mode?: string;
      coordinates?: Coordinates[];
    };

    if (body.mode !== "polyline" || !Array.isArray(body.coordinates)) {
      return NextResponse.json({ error: "mode=polyline and coordinates[] required" }, { status: 400 });
    }

    if (body.coordinates.length < 2) {
      return NextResponse.json({
        path: body.coordinates,
        fallbackLegIndexes: [],
        waypointIndexes: body.coordinates.map((_, index) => index),
        source: "fallback",
      });
    }

    const built = await fetchRoutePolylineDetailed(body.coordinates);
    const source =
      built.fallbackLegIndexes.length === 0 && built.usedKakao
        ? "kakao"
        : built.fallbackLegIndexes.length > 0 && built.usedKakao
          ? "partial"
          : "fallback";

    return NextResponse.json({
      path: built.path,
      fallbackLegIndexes: built.fallbackLegIndexes,
      waypointIndexes: built.waypointIndexes,
      source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kakao directions failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
