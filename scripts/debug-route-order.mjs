/**
 * Run: npx --yes tsx scripts/debug-route-order.mjs
 */
import { getCatalogPlaceById } from "../src/services/placeGeocodeService.ts";
import { optimizeVisitOrder } from "../src/services/engines/routeEngine.ts";

const ids = [
  "hwanseon-cave",
  "samcheok-cablecar",
  "jangho-port",
  "chuam-candle",
  "mukho-lighthouse",
];

for (const id of ids) {
  const p = getCatalogPlaceById(id);
  if (p) {
    console.log(
      `${id}\t${p.name}\tlat=${p.coordinates.lat.toFixed(4)}\tlng=${p.coordinates.lng.toFixed(4)}`,
    );
  } else {
    console.log(`${id}\tMISSING`);
  }
}

const r = await optimizeVisitOrder(ids, { transportation: "car" });
console.log("\noptimized:", r.usedKakao ? "kakao" : "haversine");
for (const [i, id] of r.orderedPlaceIds.entries()) {
  const p = getCatalogPlaceById(id);
  console.log(
    `${i + 1}. ${p?.name} lat=${p?.coordinates.lat.toFixed(4)} lng=${p?.coordinates.lng.toFixed(4)}`,
  );
}
