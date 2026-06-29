import { NextResponse } from "next/server";
import {
  fetchBusRoutes,
  fetchBusStops,
} from "@/services/external/tagoTransitService";
import { fetchGangwonRestaurants } from "@/services/external/gangwonOpenDataService";
import { fetchSbizSamcheokDonghae } from "@/services/external/sbizService";
import { fetchMvpRegionStays } from "@/services/external/tourGwService";
import { fetchMidLandForecast, fetchVilageForecast } from "@/services/external/weatherService";
import {
  fetchGangwonSigunguDataLabBundle,
  getCachedGangwonDataLabSnapshot,
} from "@/services/external/tourDataLabService";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 404 });
  }

  const results: Record<string, { ok: boolean; count?: number; error?: string }> = {};

  await Promise.all([
    (async () => {
      try {
        const items = await fetchMvpRegionStays({ numOfRowsPerCity: 3 });
        results["tour-gw-stay"] = { ok: true, count: items.length };
      } catch (error) {
        results["tour-gw-stay"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const items = await fetchBusStops({ numOfRows: 3 });
        results["tago-stops"] = { ok: true, count: items.length };
      } catch (error) {
        results["tago-stops"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const items = await fetchBusRoutes({ numOfRows: 3 });
        results["tago-routes"] = { ok: true, count: items.length };
      } catch (error) {
        results["tago-routes"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const forecast = await fetchVilageForecast();
        results["weather-short"] = { ok: Boolean(forecast), count: forecast ? 1 : 0 };
      } catch (error) {
        results["weather-short"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const forecast = await fetchMidLandForecast();
        results["weather-mid"] = { ok: Boolean(forecast), count: forecast ? 1 : 0 };
      } catch (error) {
        results["weather-mid"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const items = await fetchGangwonRestaurants({ limit: 3 });
        results["gangwon-restaurant"] = { ok: true, count: items.length };
      } catch (error) {
        results["gangwon-restaurant"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const items = await fetchSbizSamcheokDonghae({ categoryLarge: "음식", limit: 3 });
        results["sbiz-stroll"] = { ok: true, count: items.length };
      } catch (error) {
        results["sbiz-stroll"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
    (async () => {
      try {
        const snapshot = getCachedGangwonDataLabSnapshot();
        if (snapshot) {
          results["data-lab-gangwon"] = {
            ok: true,
            count: Object.keys(snapshot.sigungu).length,
          };
          return;
        }
        const bundle = await fetchGangwonSigunguDataLabBundle("4");
        const hasData = Object.values(bundle).some((rows) => rows.length > 0);
        results["data-lab-gangwon"] = { ok: hasData, count: hasData ? 1 : 0 };
      } catch (error) {
        results["data-lab-gangwon"] = {
          ok: false,
          error: error instanceof Error ? error.message : "failed",
        };
      }
    })(),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    results,
    allOk: Object.values(results).every((item) => item.ok),
  });
}
