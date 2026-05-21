import type {
  Coordinates,
  ItineraryStop,
  KakaoMapsApi,
  KakaoWindow,
  Place,
} from "@/types/travel";

const KAKAO_SDK_ID = "kakao-map-sdk";

export function getRouteCoordinates(items: Array<Place | ItineraryStop>): Coordinates[] {
  return items.map((item) => item.coordinates);
}

export function hasCoordinates(item: { coordinates?: Coordinates }): item is {
  coordinates: Coordinates;
} {
  return (
    typeof item.coordinates?.lat === "number" &&
    typeof item.coordinates?.lng === "number"
  );
}

export function getKakaoMapAppKey() {
  return process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY?.trim() ?? "";
}

export function getCoordinateCenter(coordinates: Coordinates[]): Coordinates {
  if (coordinates.length === 0) {
    return { lat: 37.7519, lng: 128.8761 };
  }

  const total = coordinates.reduce(
    (acc, coordinate) => ({
      lat: acc.lat + coordinate.lat,
      lng: acc.lng + coordinate.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: total.lat / coordinates.length,
    lng: total.lng / coordinates.length,
  };
}

export function loadKakaoMapSdk(appKey: string): Promise<KakaoMapsApi> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Kakao Maps SDK can only load in the browser."));
  }

  const kakaoWindow = window as KakaoWindow;

  if (kakaoWindow.kakao?.maps) {
    return Promise.resolve(kakaoWindow.kakao.maps);
  }

  if (!appKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_KAKAO_MAP_APP_KEY is missing."));
  }

  return new Promise((resolve, reject) => {
    const existingScript = document.getElementById(KAKAO_SDK_ID) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => {
        const maps = kakaoWindow.kakao?.maps;
        if (!maps) {
          reject(new Error("Kakao Maps SDK loaded without maps namespace."));
          return;
        }
        maps.load(() => resolve(maps));
      });
      existingScript.addEventListener("error", () =>
        reject(new Error("Failed to load Kakao Maps SDK.")),
      );
      return;
    }

    const script = document.createElement("script");
    script.id = KAKAO_SDK_ID;
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(
      appKey,
    )}&autoload=false`;
    script.onload = () => {
      const maps = kakaoWindow.kakao?.maps;
      if (!maps) {
        reject(new Error("Kakao Maps SDK loaded without maps namespace."));
        return;
      }
      maps.load(() => resolve(maps));
    };
    script.onerror = () => reject(new Error("Failed to load Kakao Maps SDK."));

    document.head.appendChild(script);
  });
}
