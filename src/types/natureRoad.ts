import type { Coordinates } from "@/types/travel";

export interface NatureRoadSpot {
  idx: number;
  type: string;
  spotName: string;
  text: string;
  address?: string | null;
  tel?: string | null;
  imageUrl?: string;
  thumbImageUrl?: string;
}

export interface NatureRoadGuideStore {
  idx: number;
  name: string;
  text: string;
  address?: string;
  tel?: string;
  link?: string;
  imageUrl?: string;
}

export interface NatureRoadGuideSection {
  idx: number;
  guideSubText: string;
  stores: NatureRoadGuideStore[];
}

export interface NatureRoadCourse {
  id: number;
  slug: string;
  name: string;
  roadName: string;
  distanceKm: number;
  description: string;
  routeSummary: string;
  officialUrl: string;
  navLink?: string;
  navName?: string;
  heroImages: string[];
  heroCaptions: string[];
  viewPoints: NatureRoadSpot[];
  guideSections: NatureRoadGuideSection[];
  /** 공식 카카오 네비 경로 (WGS84) */
  drivePath: Coordinates[];
  /** 네비 경유지 라벨 (rt1, rt2, …) */
  navWaypoints: string[];
}
