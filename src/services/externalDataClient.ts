import type {
  GeocodedPlaceResult,
  GangwonRestaurantRecord,
  MidWeatherSnapshot,
  TransitArrivalItem,
  WeatherSnapshot,
} from "@/types/externalData";
import type { DataSourceDefinition } from "@/config/dataSources";
import type { ReservationOffer } from "@/types/reservationHub";
import type { TravelZoneId } from "@/types/travel";
import type { Coordinates } from "@/types/travel";

export type ExternalDataStatusPayload = {
  sources: Array<DataSourceDefinition & { configured: boolean; missingEnvKeys: string[] }>;
  checkedAt: string;
  execution?: {
    kakaoRestConfigured: boolean;
    llmConfigured: boolean;
    datalabSnapshot: {
      fetchedAt: string;
      source?: string;
      sigunguCount: number;
      baseYm?: string | null;
    } | null;
  };
};

export async function fetchDataSourceStatus(): Promise<ExternalDataStatusPayload> {
  const response = await fetch("/api/external/status", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("데이터 소스 상태를 불러오지 못했습니다.");
  }
  return response.json();
}

export async function syncPlaceCoordinates(placeIds?: string[]): Promise<{
  results: GeocodedPlaceResult[];
  failures: Array<{ placeId: string; query: string; reason: string }>;
}> {
  const response = await fetch("/api/external/places/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ placeIds }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "좌표 동기화에 실패했습니다.");
  }

  return response.json();
}

export async function geocodeAddressByQuery(
  query: string,
  center?: Coordinates,
): Promise<{ coordinates: Coordinates; address: string; placeName?: string }> {
  const response = await fetch("/api/external/places/geocode-address", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, center }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "주소 검색에 실패했습니다.");
  }

  return response.json();
}

export type LiveReservationLoadResult = {
  offers: ReservationOffer[];
  sources: string[];
};

export async function fetchTourStayOffers(
  zoneId?: TravelZoneId,
): Promise<LiveReservationLoadResult> {
  const query = zoneId
    ? `scope=zone&zoneId=${encodeURIComponent(zoneId)}&offers=1`
    : "scope=mvp&offers=1";
  const response = await fetch(`/api/external/tour/stays?${query}`, {
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    offers?: ReservationOffer[];
    configured?: boolean;
  };
  if (!response.ok) {
    throw new Error(payload.error ?? "숙박 목록을 불러오지 못했습니다.");
  }
  const offers = payload.offers ?? [];
  if (offers.length === 0) {
    throw new Error(
      payload.configured === false
        ? "관광공사 API 키가 설정되지 않았습니다. TOUR_API_SERVICE_KEY를 확인해 주세요."
        : "숙박 데이터가 비어 있습니다. API 키·할당량을 확인해 주세요.",
    );
  }
  return { offers, sources: ["tour-gw"] };
}

export async function fetchGangwonRestaurantOffers(
  limit = 40,
  zoneId?: TravelZoneId,
): Promise<LiveReservationLoadResult> {
  const zoneQuery = zoneId ? `&zoneId=${encodeURIComponent(zoneId)}` : "";
  const response = await fetch(`/api/external/gangwon/restaurants?limit=${limit}${zoneQuery}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(payload.error ?? "강원 음식점 목록을 불러오지 못했습니다.");
  }
  const data = (await response.json()) as {
    items: GangwonRestaurantRecord[];
    source?: string;
  };
  const { mapGangwonRestaurantsToOffers } = await import("@/lib/localDiningOfferMapper");
  const offers = mapGangwonRestaurantsToOffers(data.items);
  if (offers.length === 0) {
    throw new Error("강원 음식점 데이터가 비어 있습니다. npm run import:data 로 데이터를 갱신해 주세요.");
  }
  return { offers, sources: [data.source ?? "gangwon-restaurant"] };
}

/** 관광 GW 음식점 + 강원 공공 음식점 API 병합 */
export async function fetchReservationDiningOffers(
  options?: { limit?: number; zoneId?: TravelZoneId },
): Promise<LiveReservationLoadResult> {
  const limit = options?.limit ?? 48;
  const zoneId = options?.zoneId;
  const merged = new Map<string, ReservationOffer>();
  const sources: string[] = [];
  const errors: string[] = [];

  const diningQuery = zoneId
    ? `offers=1&zoneId=${encodeURIComponent(zoneId)}`
    : "offers=1";

  try {
    const response = await fetch(`/api/external/tour/dining?${diningQuery}`, { cache: "no-store" });
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
      offers?: ReservationOffer[];
    };
    if (response.ok && payload.offers?.length) {
      payload.offers.forEach((offer) => merged.set(offer.id, offer));
      sources.push("tour-gw");
    } else if (!response.ok) {
      errors.push(payload.error ?? "관광공사 음식점 API 오류");
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "관광공사 음식점 API 연결 실패");
  }

  try {
    const gangwon = await fetchGangwonRestaurantOffers(limit, zoneId);
    gangwon.offers.forEach((offer) => {
      if (!merged.has(offer.id)) merged.set(offer.id, offer);
    });
    gangwon.sources.forEach((source) => {
      if (!sources.includes(source)) sources.push(source);
    });
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "강원 음식점 API 오류");
  }

  const offers = [...merged.values()];
  if (offers.length === 0) {
    throw new Error(errors.join(" · ") || "음식점 목록을 불러오지 못했습니다.");
  }

  return { offers, sources };
}

export async function fetchMidWeatherForecast(): Promise<MidWeatherSnapshot | null> {
  const response = await fetch("/api/external/weather/mid", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchShortWeatherForecast(): Promise<WeatherSnapshot | null> {
  const response = await fetch("/api/external/weather/forecast", { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json();
}

export async function fetchTagoArrivals(nodeId: string): Promise<TransitArrivalItem[]> {
  const response = await fetch(
    `/api/external/tago/arrivals?nodeId=${encodeURIComponent(nodeId)}`,
    { cache: "no-store" },
  );
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { items?: TransitArrivalItem[] };
  return data.items ?? [];
}

export async function fetchTagoRoutes(limit = 12) {
  const response = await fetch(`/api/external/tago/routes?numOfRows=${limit}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return [];
  }
  const data = (await response.json()) as { items?: unknown[] };
  return data.items ?? [];
}
