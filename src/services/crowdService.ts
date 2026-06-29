import type { CrowdConfidence, CrowdLevel, Place, PlaceCategory, ReservationSlot } from "@/types/travel";

export function getRemainingSeats(slot: ReservationSlot): number {
  return Math.max(slot.capacity - slot.reservedCount, 0);
}

export function getReservationRate(slot: ReservationSlot): number {
  if (slot.capacity <= 0) return 0;
  return Math.round((slot.reservedCount / slot.capacity) * 100);
}

export function getCrowdLabel(level: CrowdLevel): string {
  switch (level) {
    case "low":
      return "여유";
    case "moderate":
      return "보통";
    case "high":
      return "혼잡";
    case "very-high":
      return "매우 혼잡";
  }
}

/** 0–100 혼잡 점수 → 레벨 (데모용 휴리스틱, 보수적으로 여유·보통이 더 자주 나오도록 조정) */
export function estimateCrowdFromRate(rate: number): CrowdLevel {
  const clamped = Math.max(0, Math.min(100, rate));
  if (clamped < 52) return "low";
  if (clamped < 72) return "moderate";
  if (clamped < 86) return "high";
  return "very-high";
}

const LEVEL_BASE_MINUTES: Record<CrowdLevel, number> = {
  low: 5,
  moderate: 12,
  high: 24,
  "very-high": 40,
};

const CATEGORY_WAIT_FACTOR: Partial<Record<PlaceCategory, number>> = {
  cave: 1.35,
  "cable-car": 1.2,
  sea: 1.05,
  observatory: 1.05,
  trail: 0.95,
  market: 0.85,
  restaurant: 0.75,
  cafe: 0.7,
  experience: 1,
};

function levelFallbackRate(level: CrowdLevel): number {
  switch (level) {
    case "low":
      return 35;
    case "moderate":
      return 55;
    case "high":
      return 75;
    case "very-high":
      return 90;
  }
}

/** 혼잡도·예약률·카테고리를 반영한 대기 분(정수) */
export function estimateWaitMinutes(options: {
  level: CrowdLevel;
  occupancyRate?: number;
  category?: PlaceCategory;
}): number {
  const { level, occupancyRate, category } = options;
  const rate = occupancyRate ?? levelFallbackRate(level);
  const levelBase = LEVEL_BASE_MINUTES[level];
  const rateMinutes = (rate / 100) * 48;
  let minutes = levelBase * 0.45 + rateMinutes * 0.55;

  if (category) {
    minutes *= CATEGORY_WAIT_FACTOR[category] ?? 1;
  }

  if (level === "very-high") minutes += 4;
  if (level === "low" && rate < 40) minutes *= 0.65;

  return Math.max(0, Math.round(minutes));
}

export function formatExpectedWait(minutes: number): string {
  if (minutes <= 3) return "거의 없음";
  const rounded = Math.max(5, Math.round(minutes / 5) * 5);
  if (rounded >= 60) {
    const hours = Math.floor(rounded / 60);
    const remainder = rounded % 60;
    return remainder > 0 ? `약 ${hours}시간 ${remainder}분` : `약 ${hours}시간`;
  }
  return `약 ${rounded}분`;
}

export function estimateWaitFromCrowd(
  level: CrowdLevel,
  options?: { occupancyRate?: number; category?: PlaceCategory },
): string {
  return formatExpectedWait(
    estimateWaitMinutes({
      level,
      occupancyRate: options?.occupancyRate,
      category: options?.category,
    }),
  );
}

export function estimateWaitFromSlot(
  slot: ReservationSlot,
  options?: { category?: PlaceCategory },
): string {
  const rate = getReservationRate(slot);
  const level = slot.crowdLevel ?? estimateCrowdFromRate(rate);
  return estimateWaitFromCrowd(level, {
    occupancyRate: rate,
    category: options?.category,
  });
}

export function getCrowdConfidenceLabel(confidence: CrowdConfidence): string {
  switch (confidence) {
    case "high":
      return "신뢰 높음";
    case "medium":
      return "신뢰 보통";
    case "low":
      return "신뢰 낮음";
  }
}

export function placeHasPartnerSlots(
  place: Pick<Place, "partner" | "availableSlots">,
): boolean {
  return Boolean(place.partner && place.availableSlots.length > 0);
}

/** 제휴 슬롯이 있을 때만 대기시간을 노출하고, 그 외에는 혼잡도·신뢰도만 반환 */
export function resolveStopCrowdFields(
  place: Pick<Place, "partner" | "availableSlots">,
  estimate: {
    level: CrowdLevel;
    expectedWait: string;
    confidence: CrowdConfidence;
  },
): {
  crowdLevel: CrowdLevel;
  expectedWait?: string;
  crowdConfidence: CrowdConfidence;
} {
  if (placeHasPartnerSlots(place)) {
    return {
      crowdLevel: estimate.level,
      expectedWait: estimate.expectedWait,
      crowdConfidence: "high",
    };
  }

  return {
    crowdLevel: estimate.level,
    expectedWait: undefined,
    crowdConfidence: estimate.confidence,
  };
}
