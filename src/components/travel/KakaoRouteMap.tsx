"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import { fetchClientRoutePolylineDetailed } from "@/services/engines/routeEngine";
import { isLodgingPlaceId } from "@/lib/placeLodging";
import {
  buildLodgingAnchorsKey,
  buildRouteStopsKey,
} from "@/lib/kakaoMapRouteKeys";
import {
  createLodgingMarker,
  createRouteStopMarker,
  getCoordinateCenter,
  getKakaoMapAppKey,
  isDiningStopCategory,
  loadKakaoMapSdk,
} from "@/services/mapService";
import type { KakaoCustomOverlay, KakaoMap, KakaoMapsApi } from "@/types/travel";
import type { Coordinates, ItineraryDay, ItineraryStop } from "@/types/travel";

type MarkerKind = "visit" | "dining" | "lodging";

interface MarkerEntry {
  overlay: KakaoCustomOverlay;
  element: HTMLElement;
  kind: MarkerKind;
  coordinates: Coordinates;
}

interface KakaoRouteMapProps {
  stops: ItineraryStop[];
  lodgingAnchorsByDay?: Partial<Record<ItineraryDay, { start?: Coordinates; end?: Coordinates }>>;
  highlightStopId?: string | null;
  onHighlightStop?: (stopId: string) => void;
  onFallback?: (reason: string) => void;
}

export const KakaoRouteMap = memo(function KakaoRouteMap({
  stops,
  lodgingAnchorsByDay,
  highlightStopId = null,
  onHighlightStop,
  onFallback,
}: KakaoRouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<KakaoMap | null>(null);
  const mapsApiRef = useRef<KakaoMapsApi | null>(null);
  const overlaysRef = useRef<Array<{ setMap: (map: KakaoMap | null) => void }>>([]);
  const markerRegistryRef = useRef<Map<string, MarkerEntry>>(new Map());
  const onHighlightStopRef = useRef(onHighlightStop);
  onHighlightStopRef.current = onHighlightStop;

  const stopsKey = useMemo(() => buildRouteStopsKey(stops), [stops]);
  const lodgingKey = useMemo(
    () => buildLodgingAnchorsKey(lodgingAnchorsByDay),
    [lodgingAnchorsByDay],
  );

  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [message, setMessage] = useState("");
  const [routeHint, setRouteHint] = useState("");
  const [markerLegend, setMarkerLegend] = useState(false);
  const appKey = getKakaoMapAppKey();

  const immediateFallback =
    !appKey || stops.length === 0
      ? !appKey
        ? "Kakao Maps API key is not configured."
        : "No route stops available for map rendering."
      : "";

  const applyMarkerHighlight = useCallback((activeStopId: string | null) => {
    markerRegistryRef.current.forEach((entry, stopId) => {
      entry.element.classList.toggle("route-map-marker--active", stopId === activeStopId);
    });
  }, []);

  const clearOverlays = useCallback(() => {
    overlaysRef.current.forEach((overlay) => overlay.setMap(null));
    overlaysRef.current = [];
    markerRegistryRef.current.clear();
  }, []);

  useEffect(() => {
    let cancelled = false;

    if (immediateFallback) {
      onFallback?.(immediateFallback);
      return;
    }

    if (!mapInstanceRef.current) {
      setStatus("loading");
    }

    loadKakaoMapSdk(appKey)
      .then(async (maps) => {
        if (cancelled || !mapRef.current) return;

        mapsApiRef.current = maps;

        if (!mapInstanceRef.current) {
          const center = getCoordinateCenter(stops.map((stop) => stop.coordinates));
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center: new maps.LatLng(center.lat, center.lng),
            level: 8,
          });
        }

        const map = mapInstanceRef.current;
        clearOverlays();

        const orderedStops = [...stops].sort((a, b) => {
          if (a.day !== b.day) return a.day - b.day;
          return a.order - b.order;
        });

        const bounds = new maps.LatLngBounds();
        const markerCoordsByStopId = new Map<string, Coordinates>();
        orderedStops.forEach((stop) => {
          markerCoordsByStopId.set(stop.id, stop.coordinates);
        });
        spreadOverlappingMarkerCoords(orderedStops, markerCoordsByStopId);

        const dayGroups = [...new Set(orderedStops.map((stop) => stop.day))].sort(
          (a, b) => a - b,
        );
        let hasPartialRoute = false;

        for (const day of dayGroups) {
          const dayStops = orderedStops.filter((stop) => stop.day === day);
          const anchors = lodgingAnchorsByDay?.[day as ItineraryDay];
          const dayCoords: Coordinates[] = [];
          if (anchors?.start) dayCoords.push(anchors.start);
          dayCoords.push(...dayStops.map((stop) => stop.coordinates));
          if (anchors?.end && anchors.end !== anchors.start) {
            dayCoords.push(anchors.end);
          } else if (anchors?.start && dayStops.length > 0) {
            dayCoords.push(anchors.start);
          }

          if (anchors?.start) {
            const position = new maps.LatLng(anchors.start.lat, anchors.start.lng);
            bounds.extend(position);
            const lodgingOverlay = createLodgingMarker(maps, map, position, "숙소");
            overlaysRef.current.push(lodgingOverlay);
          }

          if (dayCoords.length < 2) continue;

          const routed = await fetchClientRoutePolylineDetailed(dayCoords);
          if (cancelled) return;
          if (routed.source === "partial" || routed.source === "fallback") {
            hasPartialRoute = true;
          }

          const visitPath = routed.path.map((coord) => {
            const position = new maps.LatLng(coord.lat, coord.lng);
            bounds.extend(position);
            return position;
          });

          if (visitPath.length > 1) {
            const polyline = new maps.Polyline({
              map,
              path: visitPath,
              strokeWeight: 4,
              strokeColor: "#2F4A3A",
              strokeOpacity: 0.9,
              strokeStyle: routed.fallbackLegIndexes.length > 0 ? "shortdash" : "solid",
            });
            overlaysRef.current.push(polyline);
          }
        }

        const hasDiningOnRoute = orderedStops.some((stop) => isDiningStopCategory(stop.category));
        const hasLodgingOnRoute = orderedStops.some((stop) => isLodgingPlaceId(stop.placeId));
        const hasSightOnRoute = orderedStops.some(
          (stop) => !isDiningStopCategory(stop.category) && !isLodgingPlaceId(stop.placeId),
        );
        const hasLodgingAnchor = dayGroups.some(
          (day) => lodgingAnchorsByDay?.[day as ItineraryDay]?.start,
        );

        let visitOrder = 0;
        orderedStops.forEach((stop) => {
          const coords = markerCoordsByStopId.get(stop.id) ?? stop.coordinates;
          const position = new maps.LatLng(coords.lat, coords.lng);
          bounds.extend(position);
          const usesIconMarker =
            isDiningStopCategory(stop.category) || isLodgingPlaceId(stop.placeId);
          if (!usesIconMarker) {
            visitOrder += 1;
          }
          const overlay = createRouteStopMarker(
            maps,
            map,
            position,
            stop,
            usesIconMarker ? 0 : visitOrder,
          );
          overlaysRef.current.push(overlay);

          const content = overlay.getContent() as HTMLElement | null;
          if (content) {
            content.classList.add("route-map-marker");
            content.style.pointerEvents = "auto";
            content.style.cursor = "pointer";
            content.addEventListener("click", (event) => {
              event.stopPropagation();
              onHighlightStopRef.current?.(stop.id);
            });
            const kind: MarkerKind = isDiningStopCategory(stop.category)
              ? "dining"
              : isLodgingPlaceId(stop.placeId)
                ? "lodging"
                : "visit";
            markerRegistryRef.current.set(stop.id, {
              overlay,
              element: content,
              kind,
              coordinates: coords,
            });
          }
        });

        if (orderedStops.length > 0) {
          map.setBounds(bounds);
        }

        if (cancelled) return;

        setRouteHint(
          hasPartialRoute
            ? "일부 구간은 도로 경로를 불러오지 못해 직선으로 표시됩니다."
            : "",
        );
        setMarkerLegend(
          (hasDiningOnRoute || hasLodgingOnRoute || hasLodgingAnchor) && hasSightOnRoute,
        );
        setStatus("ready");
      })
      .catch((error: unknown) => {
        const reason =
          error instanceof Error ? error.message : "Failed to initialize Kakao Maps.";
        if (!cancelled) {
          setStatus("fallback");
          setMessage(reason);
          onFallback?.(reason);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [appKey, clearOverlays, immediateFallback, lodgingKey, onFallback, stopsKey]);

  useEffect(() => {
    applyMarkerHighlight(highlightStopId);
  }, [applyMarkerHighlight, highlightStopId]);

  useEffect(
    () => () => {
      clearOverlays();
      mapInstanceRef.current = null;
      mapsApiRef.current = null;
    },
    [clearOverlays],
  );

  if (immediateFallback) {
    return <FallbackNotice message={immediateFallback} />;
  }

  if (status === "fallback") {
    return <FallbackNotice message={message} />;
  }

  return (
    <div className="relative h-[13.5rem] overflow-hidden bg-mist">
      <div className="h-full w-full" ref={mapRef} />
      {markerLegend ? (
        <div className="pointer-events-none absolute right-3 top-3 flex flex-col gap-1 rounded-lg bg-paper/92 px-2.5 py-2 text-[10px] text-stone shadow-sm backdrop-blur">
          <span className="flex items-center gap-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-full bg-pine text-[9px] font-bold text-ivory">
              1
            </span>
            관광·체험
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-[5px] border border-ivory bg-[#1F3429]">
              <svg
                aria-hidden="true"
                className="size-2.5 text-ivory"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" />
                <path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Z" />
              </svg>
            </span>
            식당·카페
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex size-4 items-center justify-center rounded-full border border-ivory bg-pine">
              <svg
                aria-hidden="true"
                className="size-2.5 text-ivory"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.2"
                viewBox="0 0 24 24"
              >
                <path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8" />
                <path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                <path d="M12 4v6" />
              </svg>
            </span>
            숙소
          </span>
        </div>
      ) : null}
      {routeHint ? (
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg bg-paper/92 px-3 py-2 text-[10px] leading-snug text-stone shadow-sm backdrop-blur">
          {routeHint}
        </div>
      ) : null}
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ivory/70 text-sm font-semibold text-pine backdrop-blur-sm">
          Kakao Maps 불러오는 중
        </div>
      ) : null}
    </div>
  );
});

const COORD_EPSILON = 0.00008;

function spreadOverlappingMarkerCoords(
  orderedStops: ItineraryStop[],
  markerCoordsByStopId: Map<string, Coordinates>,
): void {
  for (let index = 1; index < orderedStops.length; index += 1) {
    const prevStop = orderedStops[index - 1];
    const stop = orderedStops[index];
    const prev = markerCoordsByStopId.get(prevStop.id);
    const current = markerCoordsByStopId.get(stop.id);
    if (!prev || !current) continue;

    const sameLat = Math.abs(prev.lat - current.lat) < COORD_EPSILON;
    const sameLng = Math.abs(prev.lng - current.lng) < COORD_EPSILON;
    if (!sameLat || !sameLng) continue;

    markerCoordsByStopId.set(stop.id, {
      lat: current.lat + 0.00012 * (index % 3 || 1),
      lng: current.lng + 0.00015,
    });
  }
}

function FallbackNotice({ message }: { message: string }) {
  return (
    <div className="flex h-56 items-center justify-center bg-mist/60 px-6 text-center">
      <div>
        <AlertCircle aria-hidden="true" className="mx-auto size-6 text-pine" />
        <p className="mt-3 text-sm font-semibold text-ink">지도는 fallback으로 표시됩니다</p>
        <p className="mt-1 text-xs leading-5 text-stone">{message}</p>
      </div>
    </div>
  );
}
