import type { TravelZoneId } from "@/types/travel";

const ZONE_PATTERNS: Array<{ zoneId: TravelZoneId; pattern: RegExp }> = [
  { zoneId: "samcheok-donghae", pattern: /삼척|동해/ },
  { zoneId: "gangneung-yangyang", pattern: /강릉|양양|안목|주문진|경포/ },
  { zoneId: "sokcho-goseong", pattern: /속초|고성|설악|아바이/ },
  { zoneId: "pyeongchang-jeongseon", pattern: /평창|대관령|알펜시아|월정사/ },
  { zoneId: "yeongwol-jeongseon", pattern: /영월|동강|래프팅|레일바이크/ },
  { zoneId: "cheorwon-dmz", pattern: /철원|화천|DMZ|접경|평화/ },
  { zoneId: "wonju-chuncheon", pattern: /원주|춘천|막국수|닭갈비|의암|소양/ },
];

export function detectTravelZoneFromText(text: string): TravelZoneId | undefined {
  for (const { zoneId, pattern } of ZONE_PATTERNS) {
    if (pattern.test(text)) return zoneId;
  }
  return undefined;
}
