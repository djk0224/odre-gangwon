/** ISO YYYY-MM-DD — 축제·행사 등 정보성 노트의 일정 */
export interface OdreNoteEventPeriod {
  startDate: string;
  endDate?: string;
  /** true면 UI에 「2026년 7월」처럼 월 단위만 표기 */
  monthOnly?: boolean;
}

const EVENT_HINT_RE = /축제|행사|음악제|페스티벌|개막|폐막|개최|열린다|열립니다|진행|기간|일간/;

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function toIsoDate(year: number, month: number, day: number): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function parseRefYear(pubDate?: string): number {
  if (pubDate) {
    const iso = /^(\d{4})-\d{2}-\d{2}$/.exec(pubDate.trim());
    if (iso) return Number(iso[1]);
    const parsed = new Date(pubDate);
    if (!Number.isNaN(parsed.getTime())) return parsed.getFullYear();
  }
  return new Date().getFullYear();
}

function parseRefMonthDay(pubDate?: string): { month: number; day: number } | undefined {
  if (!pubDate?.trim()) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(pubDate.trim());
  if (iso) return { month: Number(iso[2]), day: Number(iso[3]) };
  return undefined;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function buildPeriod(
  year: number,
  startMonth: number,
  startDay: number,
  endMonth?: number,
  endDay?: number,
  monthOnly?: boolean,
): OdreNoteEventPeriod | undefined {
  const start = toIsoDate(year, startMonth, startDay);
  if (!start) return undefined;

  if (monthOnly) {
    const lastDay = daysInMonth(year, startMonth);
    return {
      startDate: start,
      endDate: toIsoDate(year, startMonth, lastDay),
      monthOnly: true,
    };
  }

  const resolvedEndMonth = endMonth ?? startMonth;
  const resolvedEndDay = endDay ?? startDay;
  const end = toIsoDate(year, resolvedEndMonth, resolvedEndDay);
  if (!end) return undefined;

  return {
    startDate: start,
    endDate: end === start ? undefined : end,
  };
}

/**
 * 뉴스 제목·요약에서 축제/행사 기간 추출.
 * pubDate는 연·월 추론용 참조.
 */
export function extractEventPeriodFromText(
  text: string,
  pubDate?: string,
): OdreNoteEventPeriod | undefined {
  const normalized = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (!normalized || !EVENT_HINT_RE.test(normalized)) return undefined;

  const refYear = parseRefYear(pubDate);
  const refMonthDay = parseRefMonthDay(pubDate);

  // 2026.5.12~5.15 / 2026-05-12 ~ 2026-05-15
  const fullRange = normalized.match(
    /(\d{4})[.\-/년\s]*(\d{1,2})[.\-/월\s]*(\d{1,2})[.\-/일\s]*(?:부터)?\s*[~\-–~]\s*(?:(\d{4})[.\-/년\s]*)?(\d{1,2})[.\-/월\s]*(\d{1,2})[.\-/일]?/,
  );
  if (fullRange) {
    const year = Number(fullRange[1]);
    const endYear = fullRange[4] ? Number(fullRange[4]) : year;
    const startMonth = Number(fullRange[2]);
    const startDay = Number(fullRange[3]);
    const endMonth = Number(fullRange[5]);
    const endDay = Number(fullRange[6]);
    const sameYearPeriod = buildPeriod(year, startMonth, startDay, endMonth, endDay);
    if (sameYearPeriod) return sameYearPeriod;
    if (endYear !== year) {
      const start = toIsoDate(year, startMonth, startDay);
      const end = toIsoDate(endYear, endMonth, endDay);
      if (start && end) return { startDate: start, endDate: end };
    }
  }

  // 5월 12일~15일 / 5월 12~15일
  const monthDayRange = normalized.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*[~\-–~]\s*(\d{1,2})\s*(?:월\s*)?(\d{1,2})?\s*일?/,
  );
  if (monthDayRange) {
    const startMonth = Number(monthDayRange[1]);
    const startDay = Number(monthDayRange[2]);
    const endToken = monthDayRange[3];
    const endMonthToken = monthDayRange[4];
    if (endMonthToken) {
      return buildPeriod(refYear, startMonth, startDay, Number(endToken), Number(endMonthToken));
    }
    return buildPeriod(refYear, startMonth, startDay, startMonth, Number(endToken));
  }

  // 5월 12일부터 18일까지
  const fromUntil = normalized.match(
    /(\d{1,2})\s*월\s*(\d{1,2})\s*일?\s*부터\s*(\d{1,2})\s*일?\s*까지/,
  );
  if (fromUntil) {
    return buildPeriod(
      refYear,
      Number(fromUntil[1]),
      Number(fromUntil[2]),
      Number(fromUntil[1]),
      Number(fromUntil[3]),
    );
  }

  // 15일 개막 … 18일까지 (같은 달)
  const opening = normalized.match(/(\d{1,2})\s*일\s*개막/);
  const closingSameMonth = normalized.match(/(\d{1,2})\s*일\s*까지/);
  const durationDays = normalized.match(/(\d{1,2})\s*일\s*간/);
  if (opening) {
    const startDay = Number(opening[1]);
    const month = refMonthDay?.month ?? Number(normalized.match(/(\d{1,2})\s*월/)?.[1] ?? 0);
    if (month >= 1 && month <= 12) {
      if (closingSameMonth) {
        return buildPeriod(refYear, month, startDay, month, Number(closingSameMonth[1]));
      }
      if (durationDays) {
        const span = Number(durationDays[1]);
        const endDay = Math.min(startDay + span - 1, daysInMonth(refYear, month));
        return buildPeriod(refYear, month, startDay, month, endDay);
      }
      return buildPeriod(refYear, month, startDay);
    }
  }

  // 7월 평창대관령음악제 — 월 단위
  const monthEvent = normalized.match(/(\d{1,2})\s*월(?:\s*[^0-9~]{0,12})?(?:축제|음악제|행사|페스티벌)/);
  if (monthEvent) {
    const month = Number(monthEvent[1]);
    return buildPeriod(refYear, month, 1, undefined, undefined, true);
  }

  return undefined;
}

export function formatOdreNoteEventPeriod(period: OdreNoteEventPeriod): string {
  const startParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period.startDate);
  if (!startParts) return period.startDate;

  const year = Number(startParts[1]);
  const startMonth = Number(startParts[2]);
  const startDay = Number(startParts[3]);

  if (period.monthOnly) {
    return `${year}년 ${startMonth}월`;
  }

  if (!period.endDate) {
    return `${year}년 ${startMonth}월 ${startDay}일`;
  }

  const endParts = /^(\d{4})-(\d{2})-(\d{2})$/.exec(period.endDate);
  if (!endParts) {
    return `${year}년 ${startMonth}월 ${startDay}일~`;
  }

  const endYear = Number(endParts[1]);
  const endMonth = Number(endParts[2]);
  const endDay = Number(endParts[3]);

  if (year === endYear && startMonth === endMonth) {
    if (startDay === endDay) return `${year}년 ${startMonth}월 ${startDay}일`;
    return `${year}년 ${startMonth}월 ${startDay}일~${endDay}일`;
  }

  if (year === endYear) {
    return `${year}년 ${startMonth}월 ${startDay}일~${endMonth}월 ${endDay}일`;
  }

  return `${year}년 ${startMonth}월 ${startDay}일~${endYear}년 ${endMonth}월 ${endDay}일`;
}

/** 오늘 기준 행사 상태 — UI 배지용 */
export function getOdreNoteEventStatus(
  period: OdreNoteEventPeriod,
  today = new Date(),
): "upcoming" | "ongoing" | "ended" {
  const start = new Date(`${period.startDate}T00:00:00`);
  const endIso = period.endDate ?? period.startDate;
  const end = new Date(`${endIso}T23:59:59`);

  if (today < start) return "upcoming";
  if (today > end) return "ended";
  return "ongoing";
}

export function eventStatusLabel(status: ReturnType<typeof getOdreNoteEventStatus>): string {
  switch (status) {
    case "upcoming":
      return "예정";
    case "ongoing":
      return "진행 중";
    case "ended":
      return "종료";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

/** 시드 id → 알려진 행사 기간 (뉴스 본문에 날짜가 없을 때 fallback) */
export const ODRE_NOTE_EVENT_FALLBACKS: Record<string, OdreNoteEventPeriod> = {
  "note-jeongseon-festival": { startDate: "2026-05-15", endDate: "2026-05-18" },
  "note-gangneung-coffee": { startDate: "2026-10-09", endDate: "2026-10-12" },
  "note-pyeongchang-summer": { startDate: "2026-07-01", endDate: "2026-07-31", monthOnly: true },
};

export function resolveOdreNoteEventPeriod(
  seedId: string,
  title: string,
  description: string | undefined,
  pubDate: string | undefined,
  seedPeriod?: OdreNoteEventPeriod,
): OdreNoteEventPeriod | undefined {
  const fromText = extractEventPeriodFromText(`${title} ${description ?? ""}`, pubDate);
  if (fromText) {
    if (!fromText.endDate && seedPeriod?.endDate && fromText.startDate === seedPeriod.startDate) {
      return { ...fromText, endDate: seedPeriod.endDate, monthOnly: fromText.monthOnly ?? seedPeriod.monthOnly };
    }
    return fromText;
  }
  if (seedPeriod) return seedPeriod;
  return ODRE_NOTE_EVENT_FALLBACKS[seedId];
}
