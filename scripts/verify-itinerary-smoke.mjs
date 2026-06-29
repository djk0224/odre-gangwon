/**
 * Smoke: POST /api/ai/itinerary returns stops within timeout.
 * Usage: npm run dev  →  npm run verify:itinerary-smoke
 */
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3000";
const TIMEOUT_MS = Number(process.env.ITINERARY_SMOKE_TIMEOUT_MS ?? 45_000);

const payload = {
  preferences: {
    zoneId: "samcheok-donghae",
    travelDate: "2026-06-14",
    travelers: 2,
    duration: "day-trip",
    themes: ["nature", "culture"],
    transportation: "car",
    companion: "couple",
    pace: "balanced",
    season: "summer",
    travelPurpose: "coast",
  },
};

async function main() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const started = Date.now();

  let response;
  try {
    response = await fetch(`${BASE_URL}/api/ai/itinerary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    console.error("✗ fetch failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }

  const elapsed = Date.now() - started;
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error(`✗ HTTP ${response.status} (${elapsed}ms)`, body.error ?? body);
    process.exit(1);
  }

  const stopCount = body.itinerary?.stops?.length ?? 0;
  if (stopCount < 1) {
    console.error(`✗ empty itinerary (${elapsed}ms)`);
    process.exit(1);
  }

  console.log(
    `✓ itinerary smoke OK — ${stopCount} stops, provider=${body.provider}, ${elapsed}ms`,
  );

  const lodgingPayload = {
    preferences: {
      ...payload.preferences,
      duration: "two-nights",
    },
    lodgingPlan: {
      mode: "per_night",
      nights: [
        {
          nightIndex: 1,
          depot: {
            id: "smoke-a",
            name: "삼척 숙소 A",
            coordinates: { lat: 37.2891, lng: 129.3085 },
            source: "manual_geocode",
          },
        },
        {
          nightIndex: 2,
          depot: {
            id: "smoke-b",
            name: "동해 숙소 B",
            coordinates: { lat: 37.5516, lng: 129.1173 },
            source: "manual_geocode",
          },
        },
      ],
    },
  };

  const lodgingRes = await fetch(`${BASE_URL}/api/ai/itinerary`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(lodgingPayload),
  });
  const lodgingBody = await lodgingRes.json().catch(() => ({}));
  if (!lodgingRes.ok || !lodgingBody.itinerary?.dayLodgingLegs) {
    console.error("✗ lodging itinerary smoke failed", lodgingBody.error ?? lodgingBody);
    process.exit(1);
  }
  console.log("✓ lodging plan smoke OK — dayLodgingLegs present");
}

main();
