"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle } from "lucide-react";
import {
  getCoordinateCenter,
  getKakaoMapAppKey,
  loadKakaoMapSdk,
} from "@/services/mapService";
import type { ItineraryStop } from "@/types/travel";

interface KakaoRouteMapProps {
  stops: ItineraryStop[];
  onFallback?: (reason: string) => void;
}

export function KakaoRouteMap({ stops, onFallback }: KakaoRouteMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "fallback">("loading");
  const [message, setMessage] = useState("");
  const appKey = getKakaoMapAppKey();

  const immediateFallback =
    !appKey || stops.length === 0
      ? !appKey
        ? "Kakao Maps API key is not configured."
        : "No route stops available for map rendering."
      : "";

  useEffect(() => {
    let cancelled = false;

    if (immediateFallback) {
      const reason = immediateFallback;
      onFallback?.(reason);
      return;
    }

    loadKakaoMapSdk(appKey)
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        const center = getCoordinateCenter(stops.map((stop) => stop.coordinates));
        const map = new maps.Map(mapRef.current, {
          center: new maps.LatLng(center.lat, center.lng),
          level: 8,
        });

        const bounds = new maps.LatLngBounds();
        const path = stops.map((stop) => {
          const position = new maps.LatLng(stop.coordinates.lat, stop.coordinates.lng);
          bounds.extend(position);
          new maps.Marker({
            map,
            position,
            title: `${stop.order}. ${stop.placeName}`,
          });
          return position;
        });

        new maps.Polyline({
          map,
          path,
          strokeWeight: 4,
          strokeColor: "#2F4A3A",
          strokeOpacity: 0.88,
          strokeStyle: "solid",
        });

        if (path.length > 1) {
          map.setBounds(bounds);
        }

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
  }, [appKey, immediateFallback, onFallback, stops]);

  if (immediateFallback) {
    return <FallbackNotice message={immediateFallback} />;
  }

  if (status === "fallback") {
    return <FallbackNotice message={message} />;
  }

  return (
    <div className="relative h-56 overflow-hidden bg-mist">
      <div className="h-full w-full" ref={mapRef} />
      {status === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-ivory/70 text-sm font-semibold text-pine backdrop-blur-sm">
          Kakao Maps 불러오는 중
        </div>
      ) : null}
    </div>
  );
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
