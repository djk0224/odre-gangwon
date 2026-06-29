import course1Raw from "@/data/imported/nature-road-course-1.json";
import course2Raw from "@/data/imported/nature-road-course-2.json";
import course3Raw from "@/data/imported/nature-road-course-3.json";
import course4Raw from "@/data/imported/nature-road-course-4.json";
import course5Raw from "@/data/imported/nature-road-course-5.json";
import course6Raw from "@/data/imported/nature-road-course-6.json";
import course7Raw from "@/data/imported/nature-road-course-7.json";
import path1Raw from "@/data/imported/nature-road-path-1.json";
import path2Raw from "@/data/imported/nature-road-path-2.json";
import path3Raw from "@/data/imported/nature-road-path-3.json";
import path4Raw from "@/data/imported/nature-road-path-4.json";
import path5Raw from "@/data/imported/nature-road-path-5.json";
import path6Raw from "@/data/imported/nature-road-path-6.json";
import path7Raw from "@/data/imported/nature-road-path-7.json";
import mvpPathRaw from "@/data/imported/nature-road-mvp-path.json";
import {
  MVP_NATURE_ROAD_COURSE_ID,
  natureRoadCourseUrl,
  natureRoadImageUrl,
  NATURE_ROAD_ATTRIBUTION,
  NATURE_ROAD_OFFICIAL_SITE,
} from "@/config/natureRoadOfficial";
import {
  extractKakaoNavWaypointNames,
  parseKakaoNavLinkPath,
} from "@/lib/natureRoadKakaoPath";
import type {
  NatureRoadCourse,
  NatureRoadGuideSection,
  NatureRoadGuideStore,
  NatureRoadSpot,
} from "@/types/natureRoad";
import { isZoneCatalogExecutable } from "@/lib/gangwonZoneAvailability";
import { travelZones } from "@/data/mockRegionalFraming";
import type { Coordinates, TravelZoneId, TripPreferences } from "@/types/travel";

export interface FeaturedNatureRoadSegment {
  id: string;
  eyebrow: string;
  title: string;
  distanceKm: number;
  durationLabel: string;
  recommendedSeasons: string[];
  routeHint: string;
  description: string;
  phaseLabel: string;
  heroImageUrl?: string;
  officialUrl: string;
  attribution: string;
  officialSite: string;
  courseId: number;
  /** 공식 코스 데이터 + 실행 장소가 있으면 AI 드라이브 일정 생성 가능 */
  executablePlan: boolean;
}

export const NATURE_ROAD_COURSE_IDS = [1, 2, 3, 4, 5, 6, 7] as const;

export const zoneNatureRoadCourseId: Partial<Record<TravelZoneId, number>> = {
  "samcheok-donghae": 6,
  "gangneung-yangyang": 6,
  "pyeongchang-jeongseon": 5,
  "sokcho-goseong": 2,
  "yeongwol-jeongseon": 3,
  "cheorwon-dmz": 1,
  "wonju-chuncheon": 4,
};

const zonePhaseLabel: Partial<Record<TravelZoneId, string>> = {
  "samcheok-donghae": "공식 6코스 · 삼척~동해 해안",
  "gangneung-yangyang": "6코스 · 강릉·안목·정동진",
  "pyeongchang-jeongseon": "5코스 · 깊은산·평창",
  "sokcho-goseong": "2코스 · 산과 바다",
  "yeongwol-jeongseon": "3코스 · 동강·레저",
  "cheorwon-dmz": "1코스 · 접경·DMZ",
  "wonju-chuncheon": "4코스 · 섬진강·호수",
};

interface RawCoursePage {
  idx: number;
  name: string;
  road_name: string;
  km: string;
  text: string;
  coarse_list: string;
  nav_link?: string;
  nav_name?: string;
  slide_img_1?: string;
  slide_img_2?: string;
  slide_img_3?: string;
  source_1?: string | null;
  source_2?: string | null;
  source_3?: string | null;
  viewPoint?: Array<{
    idx: number;
    type: string;
    spot_name: string;
    text: string;
    address?: string | null;
    tel?: string | null;
    img?: string;
    thumb_img?: string | null;
  }>;
  guideCoarse?: Array<{
    idx: number;
    guideSubText: string;
    store?: Array<{
      idx: number;
      name: string;
      text: string;
      address?: string;
      tel?: string;
      link?: string;
      img?: string;
    }>;
  }>;
}

interface ImportedPathFile {
  courseId: number;
  path?: Coordinates[];
  waypoints?: Array<{ name: string; lat?: number; lng?: number }>;
}

function mapSpot(raw: NonNullable<RawCoursePage["viewPoint"]>[number]): NatureRoadSpot {
  return {
    idx: raw.idx,
    type: raw.type,
    spotName: raw.spot_name,
    text: raw.text,
    address: raw.address,
    tel: raw.tel,
    imageUrl: raw.img ? natureRoadImageUrl(raw.img) : undefined,
    thumbImageUrl: raw.thumb_img ? natureRoadImageUrl(raw.thumb_img) : undefined,
  };
}

function mapGuideSections(raw: RawCoursePage): NatureRoadGuideSection[] {
  return (raw.guideCoarse ?? []).map((section) => ({
    idx: section.idx,
    guideSubText: section.guideSubText,
    stores: (section.store ?? []).map(
      (store): NatureRoadGuideStore => ({
        idx: store.idx,
        name: store.name,
        text: store.text,
        address: store.address,
        tel: store.tel,
        link: store.link,
        imageUrl: store.img ? natureRoadImageUrl(store.img) : undefined,
      }),
    ),
  }));
}

function resolveDrivePath(
  id: number,
  raw: RawCoursePage,
  importedPath?: ImportedPathFile,
): Coordinates[] {
  if (id === MVP_NATURE_ROAD_COURSE_ID && mvpPathRaw.waypoints?.length) {
    const mvp = (mvpPathRaw.waypoints as Array<{ lat: number; lng: number }>).map((w) => ({
      lat: w.lat,
      lng: w.lng,
    }));
    if (mvp.length >= 2) return mvp;
  }

  const fromFile = importedPath?.path?.filter(
    (p) => Number.isFinite(p.lat) && Number.isFinite(p.lng),
  );
  if (fromFile && fromFile.length >= 2) return fromFile;

  const fromNav = parseKakaoNavLinkPath(raw.nav_link);
  if (fromNav.length >= 2) return fromNav;

  const waypointCoords = (importedPath?.waypoints ?? [])
    .filter((w) => w.lat != null && w.lng != null)
    .map((w) => ({ lat: w.lat!, lng: w.lng! }));
  if (waypointCoords.length >= 2) return waypointCoords;

  return [];
}

function mapCourse(raw: RawCoursePage, importedPath?: ImportedPathFile): NatureRoadCourse {
  const id = raw.idx;
  const heroImages = [raw.slide_img_1, raw.slide_img_2, raw.slide_img_3]
    .filter(Boolean)
    .map((path) => natureRoadImageUrl(path!));

  const navWaypoints =
    importedPath?.waypoints?.map((w) => w.name).filter(Boolean) ??
    extractKakaoNavWaypointNames(raw.nav_link);

  return {
    id,
    slug: `course-${id}`,
    name: raw.name,
    roadName: raw.road_name,
    distanceKm: Number(raw.km) || 0,
    description: raw.text,
    routeSummary: raw.coarse_list,
    officialUrl: natureRoadCourseUrl(id),
    navLink: raw.nav_link,
    navName: raw.nav_name,
    heroImages,
    heroCaptions: [raw.source_1, raw.source_2, raw.source_3].filter(Boolean) as string[],
    viewPoints: (raw.viewPoint ?? []).map(mapSpot),
    guideSections: mapGuideSections(raw),
    drivePath: resolveDrivePath(id, raw, importedPath),
    navWaypoints,
  };
}

const pathByCourseId: Record<number, ImportedPathFile> = {
  1: path1Raw as ImportedPathFile,
  2: path2Raw as ImportedPathFile,
  3: path3Raw as ImportedPathFile,
  4: path4Raw as ImportedPathFile,
  5: path5Raw as ImportedPathFile,
  6: path6Raw as ImportedPathFile,
  7: path7Raw as ImportedPathFile,
};

const courseCatalog: Record<number, NatureRoadCourse> = {
  1: mapCourse(course1Raw as RawCoursePage, pathByCourseId[1]),
  2: mapCourse(course2Raw as RawCoursePage, pathByCourseId[2]),
  3: mapCourse(course3Raw as RawCoursePage, pathByCourseId[3]),
  4: mapCourse(course4Raw as RawCoursePage, pathByCourseId[4]),
  5: mapCourse(course5Raw as RawCoursePage, pathByCourseId[5]),
  6: mapCourse(course6Raw as RawCoursePage, pathByCourseId[6]),
  7: mapCourse(course7Raw as RawCoursePage, pathByCourseId[7]),
};

export function listNatureRoadCourses(): NatureRoadCourse[] {
  return NATURE_ROAD_COURSE_IDS.map((id) => courseCatalog[id]).filter(Boolean);
}

export function getNatureRoadCourse(courseId: number): NatureRoadCourse | undefined {
  return courseCatalog[courseId];
}

export function getNatureRoadCourseIdForZone(zoneId: TravelZoneId): number | undefined {
  return zoneNatureRoadCourseId[zoneId];
}

export function getMvpNatureRoadCourse() {
  return courseCatalog[MVP_NATURE_ROAD_COURSE_ID];
}

function zoneKeywords(zoneId: TravelZoneId): string[] {
  const zone = travelZones.find((item) => item.id === zoneId);
  if (!zone) return [];
  return zone.cities
    .split(/[·,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function spotMatchesZone(spot: NatureRoadSpot, keywords: string[]): boolean {
  const haystack = `${spot.address ?? ""} ${spot.spotName}`;
  return keywords.some((keyword) => haystack.includes(keyword));
}

/** 권역 키워드·네비 경유지·View Point로 실행 가능한 스팟이 있는지 */
export function zoneHasExecutableNatureRoadStops(zoneId: TravelZoneId): boolean {
  const courseId = zoneNatureRoadCourseId[zoneId];
  if (!courseId) return false;
  const course = getNatureRoadCourse(courseId);
  if (!course) return false;

  const keywords = zoneKeywords(zoneId);
  const viewPoints = course.viewPoints.filter((s) => s.type === "View Point");
  if (viewPoints.some((spot) => spotMatchesZone(spot, keywords))) return true;

  const navHits = course.navWaypoints.filter((name) =>
    keywords.some((keyword) => name.includes(keyword)),
  );
  if (navHits.length > 0) return true;

  if (zoneId === "samcheok-donghae" && mvpPathRaw.waypoints?.length) return true;

  return viewPoints.length > 0 && isZoneCatalogExecutable(zoneId);
}

function buildSegmentFromCourse(
  course: NatureRoadCourse,
  zoneId: TravelZoneId,
  executablePlan: boolean,
): FeaturedNatureRoadSegment {
  const keywords = zoneKeywords(zoneId);
  const zoneSpots = course.viewPoints.filter((spot) => spotMatchesZone(spot, keywords));

  const routeHint =
    zoneId === "samcheok-donghae" && mvpPathRaw.waypoints?.length
      ? (mvpPathRaw.waypoints as Array<{ name: string }>).map((w) => w.name).join(" → ")
      : course.navWaypoints.length > 0
        ? course.navWaypoints.slice(0, 4).join(" → ")
        : zoneSpots.length > 0
          ? zoneSpots
              .slice(0, 3)
              .map((spot) => spot.spotName)
              .join(" → ")
          : course.routeSummary
              .split(" - ")
              .slice(0, 3)
              .join(" → ");

  return {
    id: `nature-road-course-${course.id}-${zoneId}`,
    eyebrow: "강원 네이처로드",
    title: `${course.name} ${course.roadName}`,
    distanceKm: course.distanceKm,
    durationLabel: executablePlan ? "1박 2일 추천 · 당일 가능" : "권역 미리보기 · 코스 연동",
    recommendedSeasons: ["여름", "가을"],
    routeHint,
    description: course.description,
    phaseLabel: zonePhaseLabel[zoneId] ?? `공식 ${course.id}코스`,
    heroImageUrl: course.heroImages[0],
    officialUrl: course.officialUrl,
    attribution: NATURE_ROAD_ATTRIBUTION,
    officialSite: NATURE_ROAD_OFFICIAL_SITE,
    courseId: course.id,
    executablePlan,
  };
}

function buildNatureRoadTeaser(zoneId: TravelZoneId): FeaturedNatureRoadSegment | null {
  const zone = travelZones.find((item) => item.id === zoneId);
  if (!zone) return null;

  return {
    id: `nature-road-teaser-${zoneId}`,
    eyebrow: "강원 네이처로드",
    title: `${zone.label} 드라이브`,
    distanceKm: 0,
    durationLabel: "코스 데이터 준비 중",
    recommendedSeasons: ["봄", "여름", "가을", "겨울"],
    routeHint: zone.intent,
    description: `${zone.label} 권역은 강원 네이처로드 7코스와 연결됩니다. 공식 데이터 갱신 후 AI 드라이브 일정에 반영됩니다.`,
    phaseLabel: "공식 7코스 · 권역별 연결",
    officialUrl: `${NATURE_ROAD_OFFICIAL_SITE}/natureroad`,
    attribution: NATURE_ROAD_ATTRIBUTION,
    officialSite: NATURE_ROAD_OFFICIAL_SITE,
    courseId: zoneNatureRoadCourseId[zoneId] ?? 0,
    executablePlan: false,
  };
}

export function getFeaturedNatureRoadForZone(
  zoneId: TravelZoneId,
): FeaturedNatureRoadSegment | null {
  const courseId = zoneNatureRoadCourseId[zoneId];
  if (!courseId) {
    return buildNatureRoadTeaser(zoneId);
  }

  const course = getNatureRoadCourse(courseId);
  if (!course) {
    return buildNatureRoadTeaser(zoneId);
  }

  const executablePlan =
    isZoneCatalogExecutable(zoneId) && zoneHasExecutableNatureRoadStops(zoneId);

  return buildSegmentFromCourse(course, zoneId, executablePlan);
}

export function getFeaturedNatureRoadSegment() {
  return getFeaturedNatureRoadForZone("samcheok-donghae");
}

export function getNatureRoadOverlay(
  preferences: TripPreferences,
): { label: string; path: Coordinates[]; officialUrl: string } | null {
  const isDriveLed =
    preferences.travelPurpose === "drive" || preferences.transportation === "car";

  if (!isDriveLed) {
    return null;
  }

  const courseId = getNatureRoadCourseIdForZone(preferences.zoneId);
  if (!courseId) return null;

  const course = getNatureRoadCourse(courseId);
  if (!course?.drivePath?.length) {
    return null;
  }

  return {
    label: `${course.name} ${course.roadName}`,
    path: course.drivePath,
    officialUrl: course.officialUrl,
  };
}

export function getSamcheokDonghaeViewPoints() {
  const course = getMvpNatureRoadCourse();
  if (!course) return [];

  return course.viewPoints.filter((spot) => {
    const addr = spot.address ?? "";
    return addr.includes("삼척") || addr.includes("동해");
  });
}
