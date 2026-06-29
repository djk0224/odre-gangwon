import { isDiningCategory } from "@/lib/itineraryMeals";
import { isLodgingPlaceId } from "@/lib/placeLodging";
import type {
  Coordinates,
  ItineraryStop,
  KakaoCustomOverlay,
  KakaoLatLng,
  KakaoMap,
  KakaoMapsApi,
  KakaoWindow,
  Place,
  PlaceCategory,
} from "@/types/travel";

const DINING_UTENSILS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F8F5EE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8"/><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Z"/><path d="m2.1 21.8 6.4-6.3"/><path d="m19 5-7 7"/></svg>`;

const LODGING_BED_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F8F5EE" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><path d="M12 4v6"/><path d="M2 18h20"/></svg>`;

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

function createAnchoredOverlay(
  maps: KakaoMapsApi,
  map: KakaoMap,
  position: KakaoLatLng,
  content: HTMLElement,
): KakaoCustomOverlay {
  return new maps.CustomOverlay({
    map,
    position,
    content,
    xAnchor: 0.5,
    yAnchor: 0.5,
  });
}

export function isDiningStopCategory(category: PlaceCategory): boolean {
  return isDiningCategory(category);
}

function createIconMarker(
  maps: KakaoMapsApi,
  map: KakaoMap,
  position: KakaoLatLng,
  placeName: string,
  options: {
    ariaLabel: string;
    iconSvg: string;
    background?: string;
    borderRadius?: string;
  },
): KakaoCustomOverlay {
  const content = document.createElement("div");
  content.setAttribute("role", "img");
  content.setAttribute("aria-label", options.ariaLabel);
  content.title = placeName;
  content.style.cssText = [
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:32px",
    "height:32px",
    "margin:0",
    "padding:0",
    `border-radius:${options.borderRadius ?? "10px"}`,
    `background:${options.background ?? "#1F3429"}`,
    "border:2px solid #F8F5EE",
    "filter:drop-shadow(0 2px 4px rgba(11,31,51,0.28))",
    "pointer-events:none",
  ].join(";");
  content.innerHTML = options.iconSvg;

  return createAnchoredOverlay(maps, map, position, content);
}

/** 음식점·카페·시장 — 식기 아이콘 마커 (번호 없음) */
export function createDiningMarker(
  maps: KakaoMapsApi,
  map: KakaoMap,
  position: KakaoLatLng,
  placeName: string,
): KakaoCustomOverlay {
  return createIconMarker(maps, map, position, placeName, {
    ariaLabel: `식사 장소 ${placeName}`,
    iconSvg: DINING_UTENSILS_SVG,
  });
}

/** 숙소 — 침대 아이콘 마커 (번호 없음) */
export function createLodgingMarker(
  maps: KakaoMapsApi,
  map: KakaoMap,
  position: KakaoLatLng,
  placeName: string,
): KakaoCustomOverlay {
  return createIconMarker(maps, map, position, placeName, {
    ariaLabel: `숙소 ${placeName}`,
    iconSvg: LODGING_BED_SVG,
    background: "#2F4A3A",
    borderRadius: "9999px",
  });
}

/** 방문 순서 숫자 마커 (관광·체험 등) */
export function createVisitOrderMarker(
  maps: KakaoMapsApi,
  map: KakaoMap,
  position: KakaoLatLng,
  order: number,
  placeName: string,
): KakaoCustomOverlay {
  const content = document.createElement("div");
  content.setAttribute("role", "img");
  content.setAttribute(
    "aria-label",
    `${order}번째 방문지 ${placeName}`,
  );
  content.title = `${order}. ${placeName}`;
  // Kakao CustomOverlay는 x/yAnchor로 좌표에 붙입니다.
  // CSS transform·비대칭 box-shadow는 앵커 박스와 시각 중심을 어긋나게 해 줌아웃 시 떨어져 보입니다.
  content.style.cssText = [
    "box-sizing:border-box",
    "display:flex",
    "align-items:center",
    "justify-content:center",
    "width:28px",
    "height:28px",
    "margin:0",
    "padding:0",
    "border-radius:9999px",
    "background:#2F4A3A",
    "color:#F8F5EE",
    "font:700 13px/1 Pretendard,system-ui,sans-serif",
    "border:2px solid #F8F5EE",
    "filter:drop-shadow(0 2px 4px rgba(11,31,51,0.28))",
    "pointer-events:none",
  ].join(";");
  content.textContent = String(order);

  return createAnchoredOverlay(maps, map, position, content);
}

export function createRouteStopMarker(
  maps: KakaoMapsApi,
  map: KakaoMap,
  position: KakaoLatLng,
  stop: Pick<ItineraryStop, "category" | "placeName" | "placeId">,
  visitOrder: number,
): KakaoCustomOverlay {
  if (isDiningStopCategory(stop.category)) {
    return createDiningMarker(maps, map, position, stop.placeName);
  }
  if (isLodgingPlaceId(stop.placeId)) {
    return createLodgingMarker(maps, map, position, stop.placeName);
  }
  return createVisitOrderMarker(maps, map, position, visitOrder, stop.placeName);
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
