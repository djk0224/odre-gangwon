"use client";

import { AlertTriangle, Clock, MapPin } from "lucide-react";
import { TravelCardShell } from "@/components/ui/TravelCard";
import type { RouteDiningPlan } from "@/services/recommendation/routeDiningPlanner";

interface RouteDiningPlanPanelProps {
  plan: RouteDiningPlan;
}

export function RouteDiningPlanPanel({ plan }: RouteDiningPlanPanelProps) {
  const dayCount = new Set(plan.slots.map((slot) => slot.day).filter(Boolean)).size;
  const isMultiDay = dayCount > 1;
  const slotCount = plan.slots.length;
  const lastDayIndex = Math.max(...plan.slots.map((slot) => slot.day ?? 1), 1);
  const lastDayIsTwoMeals =
    plan.slots.filter((slot) => (slot.day ?? 1) === lastDayIndex).length === 2;

  return (
    <section className="space-y-3">
      <div className="rounded-xl border border-pine/10 bg-paper px-4 py-3">
        <p className="text-sm font-semibold text-ink">
          {isMultiDay
            ? `Day별 식사 ${slotCount}구간을 계산했어요${lastDayIsTwoMeals ? " · 마지막 날은 아침·점심만" : ""}`
            : slotCount === 2 && plan.slots.every((slot) => slot.role === "middle" || slot.role === "end")
              ? "하루 동선 기준 식사 2구간(점심·저녁)을 계산했어요"
              : slotCount === 2
                ? "하루 동선 기준 식사 2구간(아침·점심)을 계산했어요"
                : "하루 동선 기준 식사 3구간을 계산했어요"}
        </p>
        <p className="mt-1 text-xs leading-5 text-stone">
          {isMultiDay
            ? "각 Day의 관광 동선마다 식사를 배치합니다. 첫날·당일치기는 점심·저녁, 중간 Day는 3끼, 귀가일은 아침·점심까지만 넣습니다."
            : slotCount === 2 && plan.slots.every((slot) => slot.role === "middle" || slot.role === "end")
              ? "관광지는 이동 시간 기준으로 동선을 최적화한 뒤, 점심·저녁 식사를 경로 구간에 끼워 넣고 영업시간 충돌을 검사합니다."
              : slotCount === 2
                ? "관광지는 이동 시간 기준으로 동선을 최적화한 뒤, 아침·점심 식사를 경로 구간에 끼워 넣고 영업시간 충돌을 검사합니다."
                : "관광지는 이동 시간 기준으로 동선을 최적화한 뒤, 출발·중간·마무리 식사를 경로 구간에 끼워 넣고 영업시간 충돌을 검사합니다."}
        </p>
        {plan.hasOperatingHoursConflict ? (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-pine">
            <AlertTriangle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
            일부 식당은 예상 도착 시간과 영업시간이 겹칩니다. 아래 경고를 확인해 주세요.
          </p>
        ) : null}
      </div>

      {plan.slots.map((slot) => {
        const place = slot.suggestedPlace;
        return (
          <TravelCardShell className="p-4" key={`${slot.day ?? 1}-${slot.role}`}>
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-pine">{slot.label}</p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {place?.name ?? "추천 식당을 찾지 못했습니다"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-stone">
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden="true" className="size-3.5" />
                {slot.anchorLabel}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock aria-hidden="true" className="size-3.5" />
                도착 {slot.estimatedArrival}
                {slot.estimatedTravelMinutes > 0 ? ` · 이동 ${slot.estimatedTravelMinutes}분` : ""}
              </span>
            </div>
            {slot.warnings.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {slot.warnings.map((warning) => (
                  <li className="text-xs leading-5 text-pine" key={warning}>
                    {warning}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-stone">영업시간과 이동 시간 기준으로 배치 가능합니다.</p>
            )}
          </TravelCardShell>
        );
      })}
    </section>
  );
}
