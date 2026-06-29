"use client";

import type { Place } from "@/types/travel";

interface ItineraryReservationProgressProps {
  confirmed: number;
  total: number;
  nextPendingPlace?: Place;
}

export function ItineraryReservationProgress({
  confirmed,
  total,
  nextPendingPlace,
}: ItineraryReservationProgressProps) {
  const ratio = total > 0 ? (confirmed / total) * 100 : 0;

  return (
    <section className="rounded-xl border border-pine/10 bg-paper px-4 py-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-ink">
          {total > 0 ? `${confirmed}/${total} 제휴 예약 완료` : "제휴 예약 대상 없음"}
        </span>
        {total > 0 ? <span className="text-stone">{Math.round(ratio)}%</span> : null}
      </div>
      {total > 0 ? (
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-pine/10">
          <div
            className="h-full rounded-full bg-pine transition-all duration-300"
            style={{ width: `${ratio}%` }}
          />
        </div>
      ) : null}
      {total === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-stone">
          이번 일정에는 시간 예약이 필요한 제휴 명소가 없습니다. 일정으로 돌아가거나 예약 탭에서
          다른 항목을 확인할 수 있습니다.
        </p>
      ) : nextPendingPlace ? (
        <p className="mt-3 text-sm text-stone">
          다음: <span className="font-medium text-ink">{nextPendingPlace.name}</span> 입장 시간을
          선택해 주세요
        </p>
      ) : (
        <p className="mt-3 text-sm font-medium text-pine">제휴 예약이 모두 완료되었습니다</p>
      )}
    </section>
  );
}
