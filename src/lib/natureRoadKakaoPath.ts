import type { Coordinates } from "@/types/travel";

function isGangwonCoord(lat: number, lng: number) {
  return lat >= 37 && lat <= 39.2 && lng >= 127 && lng <= 131;
}

/** Kakao car-route `rt` query pairs → WGS84 (강원 네이처로드 nav_link 스케일 혼합 대응) */
function decodeRtPair(a: number, b: number): Coordinates | null {
  const attempts: Array<{ lat: number; lng: number }> = [
    { lat: a / 26328, lng: b / 8525 },
    { lat: b / 26328, lng: a / 8525 },
    { lat: b / 31000, lng: a / 5020 },
    { lat: a / 31000, lng: b / 5020 },
    { lat: a / 19600, lng: b / 9600 },
    { lat: b / 19600, lng: a / 9600 },
    { lat: a / 22800, lng: b / 10120 },
    { lat: b / 22800, lng: a / 10120 },
    { lat: a / 20000, lng: b / 10000 },
    { lat: b / 20000, lng: a / 10000 },
  ];

  for (const point of attempts) {
    if (isGangwonCoord(point.lat, point.lng)) {
      return point;
    }
  }

  return null;
}

export function parseKakaoNavLinkPath(navLink?: string | null): Coordinates[] {
  if (!navLink) return [];

  try {
    const url = new URL(navLink);
    const rt = url.searchParams.get("rt");
    if (!rt) return [];

    const nums = rt.split(",").map((part) => Number(part.trim()));
    if (nums.length < 2 || nums.some((n) => !Number.isFinite(n))) return [];

    const path: Coordinates[] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const point = decodeRtPair(nums[i], nums[i + 1]);
      if (point) path.push(point);
    }
    return path;
  } catch {
    return [];
  }
}

export function extractKakaoNavWaypointNames(navLink?: string | null): string[] {
  if (!navLink) return [];

  try {
    const url = new URL(navLink);
    const names: string[] = [];
    for (const [key, value] of url.searchParams.entries()) {
      if (/^rt\d+$/i.test(key) && value.trim()) {
        names.push(decodeURIComponent(value.trim()));
      }
    }
    return names;
  } catch {
    return [];
  }
}
