/**
 * Verify full-kernel itinerary generation across all 7 zones (empty selection, day-trip).
 * Usage: npx tsx scripts/verify-zone-itineraries.ts
 */
import {
  GANGWON_TRAVEL_ZONE_IDS,
  getCatalogCountsByZone,
} from "@/lib/gangwonZoneAvailability";
import { loadFullGangwonCatalog } from "@/data/placeCatalog";
import { isDiningPlace } from "@/lib/itineraryMeals";
import { buildEngineContextFromTripStore } from "@/services/engines/engineContext";
import { generateExecutableItinerary } from "@/services/itineraryService";
import { buildRouteDiningPlan } from "@/services/recommendation/routeDiningPlanner";
import { getCatalogPlaceById } from "@/services/placeGeocodeService";
import { generateItineraryDeterministic } from "@/services/ai/itinerary";
import { buildItineraryClientFallback } from "@/lib/executionKernel/clientFallback";
import type { TravelZoneId, TripPreferences } from "@/types/travel";

function basePreferences(zoneId: TravelZoneId): TripPreferences {
  return {
    zoneId,
    travelDate: "2026-06-14",
    travelers: 2,
    duration: "day-trip",
    themes: ["nature", "culture"],
    transportation: "car",
    companion: "couple",
    pace: "balanced",
    season: "summer",
    travelPurpose: "coast",
  };
}

function summarizeStops(stops: { placeId: string; placeName: string }[]) {
  const tour = stops.filter((s) => {
    const p = getCatalogPlaceById(s.placeId);
    return p && !isDiningPlace(p);
  });
  const dining = stops.filter((s) => {
    const p = getCatalogPlaceById(s.placeId);
    return p && isDiningPlace(p);
  });
  return { total: stops.length, tour: tour.length, dining: dining.length };
}

async function main() {
  console.log("=== Catalog BEFORE full load ===");
  console.log(getCatalogCountsByZone());

  await loadFullGangwonCatalog();

  const counts = getCatalogCountsByZone();
  console.log("=== Catalog AFTER full load ===");
  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    console.log(`  ${zoneId}: ${counts[zoneId]}`);
  }
  console.log("");

  const rows: Array<Record<string, string | number>> = [];

  for (const zoneId of GANGWON_TRAVEL_ZONE_IDS) {
    const preferences = basePreferences(zoneId);
    const diningPlan = buildRouteDiningPlan({
      preferences,
      selectedPlaceState: {},
    });
    const ctx = buildEngineContextFromTripStore({
      preferences,
      savedPlaceIds: [],
      recentPlaceIds: [],
      itineraryAnchorPlaceId: null,
      selectedPlaceState: {},
    });

    const kernel = await generateExecutableItinerary(preferences, null, ctx, {
      routeProfile: "fast",
    });
    const k = summarizeStops(kernel.stops);

    const det = await generateItineraryDeterministic(preferences, {
      engineContext: ctx,
    });
    const d = summarizeStops(det.itinerary.stops);

    const fallback = await buildItineraryClientFallback({
      preferences,
      engineContext: ctx,
    });
    const f = summarizeStops(fallback.itinerary.stops);

    rows.push({
      zone: zoneId,
      catalog: counts[zoneId],
      diningPlanTour: diningPlan.tourPlaceIds.length,
      kernelTotal: k.total,
      kernelTour: k.tour,
      kernelDining: k.dining,
      detTotal: d.total,
      clientTotal: f.total,
    });

    console.log(`--- ${zoneId} ---`);
    console.log(
      `  diningPlan(empty): tour=${diningPlan.tourPlaceIds.length} ordered=${diningPlan.orderedPlaceIds.length}`,
    );
    console.log(
      `  generateExecutableItinerary: total=${k.total} tour=${k.tour} dining=${k.dining}`,
    );
    console.log(`    stops: ${kernel.stops.map((s) => s.placeName).join(" → ")}`);
    console.log(
      `  generateItineraryDeterministic: total=${d.total} tour=${d.tour} dining=${d.dining}`,
    );
    console.log(
      `  clientFallback: total=${f.total} tour=${f.tour} dining=${f.dining}`,
    );
    console.log("");
  }

  console.log("=== Summary table ===");
  console.table(rows);

  const sparse = rows.filter((r) => Number(r.kernelTour) < 2);
  if (sparse.length > 0) {
    console.error(`\n✗ ${sparse.length} zone(s) with <2 tour stops in kernel path`);
    process.exit(1);
  }
  console.log("\n✓ All zones produced >=2 tour stops via full kernel");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
