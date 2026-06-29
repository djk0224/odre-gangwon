import type {
  DataLabDemandIndexRecord,
  DataLabSigunguBundle,
} from "@/types/externalData";

function parseNumeric(value: string | number | undefined): number | null {
  if (value === undefined || value === "") return null;
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function extractIndexValue(record: DataLabDemandIndexRecord): number | null {
  return (
    parseNumeric(record.dsIndex) ??
    parseNumeric(record.index) ??
    parseNumeric(record.value) ??
    parseNumeric(record.cnctrRate)
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** DataLab 지표를 0–100 수요 점수로 정규화 (crowdEngine 블렌딩용) */
export function computeDataLabDemandScore(bundle: DataLabSigunguBundle): number {
  const visitorNums = bundle.visitors
    .map((row) => parseNumeric(row.touNum))
    .filter((v): v is number => v !== null);
  const avgVisitors =
    visitorNums.length > 0
      ? visitorNums.reduce((sum, v) => sum + v, 0) / visitorNums.length
      : null;

  const concentrationValues = bundle.concentration
    .map((row) => parseNumeric(row.cnctrRate) ?? parseNumeric(row.vistNum))
    .filter((v): v is number => v !== null);
  const avgConcentration =
    concentrationValues.length > 0
      ? concentrationValues.reduce((sum, v) => sum + v, 0) /
        concentrationValues.length
      : null;

  const demandValues = [
    ...bundle.demandStay,
    ...bundle.demandConsumption,
    ...bundle.serviceDemand,
    ...bundle.cultureDemand,
  ]
    .map(extractIndexValue)
    .filter((v): v is number => v !== null);
  const avgDemand =
    demandValues.length > 0
      ? demandValues.reduce((sum, v) => sum + v, 0) / demandValues.length
      : null;

  const parts: number[] = [];
  if (avgVisitors !== null) {
    parts.push(clamp(30 + Math.log10(Math.max(avgVisitors, 1)) * 12, 0, 100));
  }
  if (avgConcentration !== null) {
    parts.push(
      clamp(avgConcentration > 1 ? avgConcentration : avgConcentration * 100, 0, 100),
    );
  }
  if (avgDemand !== null) {
    parts.push(clamp(avgDemand > 1 ? avgDemand : avgDemand * 100, 0, 100));
  }

  if (parts.length === 0) return 50;
  return parts.reduce((sum, v) => sum + v, 0) / parts.length;
}
