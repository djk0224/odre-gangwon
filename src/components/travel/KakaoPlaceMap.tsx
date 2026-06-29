"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { buildPlaceMapKey } from "@/lib/kakaoMapRouteKeys";
import { cn } from "@/lib/utils";
import {
  getKakaoMapAppKey,
  loadKakaoMapSdk,
} from "@/services/mapService";
import type { KakaoMap, KakaoMapsApi, KakaoMarker } from "@/types/travel";
import type { Coordinates } from "@/types/travel";

interface KakaoPlaceMapProps {
  coordinates: Coordinates;
  placeName: string;
  className?: string;
}

function MapPlaceholder({
  placeName,
  coordinates,
  className,
}: {
  placeName: string;
  coordinates: Coordinates;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-40 flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-mist via-ivory to-sand",
        className,
      )}
    >
      <MapPin aria-hidden="true" className="size-6 text-pine" />
      <p className="text-xs font-medium text-stone">{placeName}</p>
      <p className="text-[10px] text-stone">
        {coordinates.lat.toFixed(4)}, {coordinates.lng.toFixed(4)}
      </p>
    </div>
  );
}

export function KakaoPlaceMap({ coordinates, placeName, className }: KakaoPlaceMapProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<KakaoMap | null>(null);
  const mapsApiRef = useRef<KakaoMapsApi | null>(null);
  const markerRef = useRef<KakaoMarker | null>(null);
  const placeKey = useMemo(
    () => buildPlaceMapKey(coordinates, placeName),
    [coordinates, placeName],
  );

  const [mapReady, setMapReady] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const appKey = getKakaoMapAppKey();

  useEffect(() => {
    if (!appKey) {
      setUseFallback(true);
      return;
    }

    setUseFallback(false);
    let cancelled = false;

    if (!mapInstanceRef.current) {
      setMapReady(false);
    }

    loadKakaoMapSdk(appKey)
      .then((maps) => {
        if (cancelled || !mapRef.current) return;

        mapsApiRef.current = maps;
        const position = new maps.LatLng(coordinates.lat, coordinates.lng);

        if (!mapInstanceRef.current) {
          mapInstanceRef.current = new maps.Map(mapRef.current, {
            center: position,
            level: 5,
          });
        } else {
          mapInstanceRef.current.setCenter(position);
        }

        markerRef.current?.setMap(null);
        markerRef.current = new maps.Marker({
          map: mapInstanceRef.current,
          position,
          title: placeName,
        });

        if (!cancelled) {
          setMapReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) setUseFallback(true);
      });

    return () => {
      cancelled = true;
    };
  }, [appKey, coordinates.lat, coordinates.lng, placeKey, placeName]);

  useEffect(
    () => () => {
      markerRef.current?.setMap(null);
      mapInstanceRef.current = null;
      mapsApiRef.current = null;
    },
    [],
  );

  if (useFallback) {
    return (
      <MapPlaceholder
        className={className}
        coordinates={coordinates}
        placeName={placeName}
      />
    );
  }

  return (
    <div className={cn("relative h-40 w-full", className)}>
      {!mapReady ? (
        <MapPlaceholder
          className="absolute inset-0"
          coordinates={coordinates}
          placeName={placeName}
        />
      ) : null}
      <div
        className={cn("h-full w-full rounded-xl", !mapReady && "opacity-0")}
        ref={mapRef}
      />
    </div>
  );
}
