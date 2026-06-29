import { mvpGeocodeCenter } from "@/data/placeGeocodeQueries";
import { getKakaoRestApiKey } from "@/lib/serverEnv";
import { fetchJson } from "@/services/external/fetchJson";
import type { Coordinates } from "@/types/travel";
import type { KakaoKeywordSearchResult, KakaoLocalDocument } from "@/types/externalData";

const KAKAO_LOCAL_BASE = "https://dapi.kakao.com/v2/local";

function getAuthHeader(restKey: string) {
  return { Authorization: `KakaoAK ${restKey}` };
}

export function kakaoDocumentToCoordinates(document: KakaoLocalDocument): Coordinates {
  return {
    lat: Number(document.y),
    lng: Number(document.x),
  };
}

export async function searchKakaoKeyword(options: {
  query: string;
  center?: Coordinates;
  radiusMeters?: number;
  size?: number;
}): Promise<KakaoLocalDocument[]> {
  const restKey = getKakaoRestApiKey();
  if (!restKey) {
    throw new Error("KAKAO_REST_API_KEY is not configured.");
  }

  const center = options.center ?? mvpGeocodeCenter;
  const params = new URLSearchParams({
    query: options.query,
    x: String(center.lng),
    y: String(center.lat),
    radius: String(options.radiusMeters ?? 30_000),
    size: String(options.size ?? 5),
    sort: "accuracy",
  });

  const result = await fetchJson<KakaoKeywordSearchResult>(
    `${KAKAO_LOCAL_BASE}/search/keyword.json?${params}`,
    { headers: getAuthHeader(restKey) },
  );

  return result.documents ?? [];
}

export async function geocodePlaceByQuery(
  query: string,
  center?: Coordinates,
): Promise<{ coordinates: Coordinates; document: KakaoLocalDocument } | null> {
  const documents = await searchKakaoKeyword({ query, center });
  const best = documents[0];
  if (!best) {
    return null;
  }

  return {
    coordinates: kakaoDocumentToCoordinates(best),
    document: best,
  };
}
