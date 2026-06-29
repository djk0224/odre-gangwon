import {
  getMvpNatureRoadCourse,
  getNatureRoadCourse,
  getNatureRoadCourseIdForZone,
  getNatureRoadOverlay,
} from "@/services/natureRoadCatalog";
import type { Coordinates, TravelZoneId } from "@/types/travel";

/** @deprecated 공식 데이터는 `natureRoadCatalog` / `imported/nature-road-*.json` 사용 */
export function getNatureRoadPathForZone(zoneId: TravelZoneId): Coordinates[] | null {
  const courseId = getNatureRoadCourseIdForZone(zoneId);
  if (!courseId) return null;
  const path = getNatureRoadCourse(courseId)?.drivePath;
  return path?.length ? path : null;
}

export { getNatureRoadOverlay, getMvpNatureRoadCourse };
