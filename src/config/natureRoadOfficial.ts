/** 강원 네이처로드 공식 사이트 (GWTO) */
export const NATURE_ROAD_OFFICIAL_SITE = "https://natureroad.gangwon.kr";

export const NATURE_ROAD_ATTRIBUTION = "출처: 강원특별자치도 강원 네이처로드 (GWTO)";

/** 삼척·동해 MVP — 6코스 바다 드라이브길 (삼척~동해 해안 구간) */
export const MVP_NATURE_ROAD_COURSE_ID = 6;

/** 삼척 진입 — 5코스 깊은산 드라이브길 종점 구간 */
export const SAMCHEOK_NATURE_ROAD_COURSE_ID = 5;

export function natureRoadCourseUrl(courseId: number) {
  return `${NATURE_ROAD_OFFICIAL_SITE}/coarse/${courseId}`;
}

export function natureRoadImageUrl(path: string) {
  if (path.startsWith("http")) return path;
  return `${NATURE_ROAD_OFFICIAL_SITE}${path.startsWith("/") ? path : `/${path}`}`;
}
