"use client";

import { CalendarDays, Minus, Plus, X } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { durationOptions } from "@/data/mockTravelData";
import type { TravelDuration, TripPreferences } from "@/types/travel";

interface QuickPlanSheetProps {
  open: boolean;
  preferences: TripPreferences;
  placeCount: number;
  onChange: <K extends keyof TripPreferences>(key: K, value: TripPreferences[K]) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export function QuickPlanSheet({
  open,
  preferences,
  placeCount,
  onChange,
  onClose,
  onConfirm,
}: QuickPlanSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-4 pb-24 pt-10">
      <div className="w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-ivory shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-pine/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Quick Plan</p>
            <h2 className="text-lg font-semibold text-ink">찜한 {placeCount}곳으로 일정 만들기</h2>
            <p className="mt-1 text-xs text-stone">날짜와 인원만 입력하면 바로 실행 일정을 만듭니다.</p>
          </div>
          <button
            aria-label="닫기"
            className="flex size-9 items-center justify-center rounded-full text-stone"
            onClick={onClose}
            type="button"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-4">
          <section>
            <label className="text-sm font-semibold text-ink" htmlFor="quick-travel-date">
              여행 날짜
            </label>
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-pine/10 bg-paper px-4 py-3">
              <CalendarDays aria-hidden="true" className="size-4 text-pine" />
              <input
                className="w-full bg-transparent text-sm font-medium text-ink outline-none"
                id="quick-travel-date"
                onChange={(e) => onChange("travelDate", e.target.value)}
                type="date"
                value={preferences.travelDate}
              />
            </div>
          </section>

          <section className="flex items-center justify-between rounded-2xl border border-pine/10 bg-paper px-4 py-4">
            <div>
              <p className="text-sm font-semibold text-ink">여행 인원</p>
              <p className="text-xs text-stone">예약·혼잡 안내 기준</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                className="flex size-9 items-center justify-center rounded-full bg-pine/8 text-pine"
                onClick={() => onChange("travelers", Math.max(1, preferences.travelers - 1))}
                type="button"
              >
                <Minus aria-hidden="true" className="size-4" />
              </button>
              <span className="w-7 text-center text-lg font-semibold">{preferences.travelers}</span>
              <button
                className="flex size-9 items-center justify-center rounded-full bg-pine text-ivory"
                onClick={() => onChange("travelers", preferences.travelers + 1)}
                type="button"
              >
                <Plus aria-hidden="true" className="size-4" />
              </button>
            </div>
          </section>

          <section>
            <p className="text-sm font-semibold text-ink">여행 기간</p>
            <div className="mt-3">
              <SelectionGrid
                onChange={(v) => onChange("duration", v as TravelDuration)}
                options={durationOptions.map((o) => ({ id: o.id, label: o.label }))}
                value={preferences.duration}
              />
            </div>
          </section>
        </div>

        <div className="space-y-2 border-t border-pine/10 px-5 py-4">
          <PremiumButton className="w-full" onClick={onConfirm}>
            실행 일정 생성
          </PremiumButton>
          <PremiumButton className="w-full" onClick={onClose} variant="ghost">
            취소
          </PremiumButton>
        </div>
      </div>
    </div>
  );
}
