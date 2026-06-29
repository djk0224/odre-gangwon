import { tagoCityDefaults } from "@/config/publicApiDefaults";

/** TAGO 데모 — 삼척권 대표 정류소 */
export const demoTransitHub = {
  cityCode: tagoCityDefaults.samcheok,
  cityLabel: "삼척시",
  /** 현리시외버스터미널 (실측 nodeId) */
  primaryStop: {
    nodeId: "TSB265000056",
    name: "현리시외버스터미널",
  },
  /** 신월리 (도착 정보 샘플용 보조) */
  secondaryStop: {
    nodeId: "TSB264000210",
    name: "신월리",
  },
} as const;
