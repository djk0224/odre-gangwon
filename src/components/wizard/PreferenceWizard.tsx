"use client";

import { useState } from "react";
import {
  BedDouble,
  CalendarDays,
  MapPin,
  Minus,
  Plus,
  Users,
  Compass,
  Gauge,
} from "lucide-react";
import { StepWizardHeader } from "@/components/wizard/StepWizardHeader";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { ToggleCard } from "@/components/ui/ToggleCard";
import {
  companionOptions,
  durationOptions,
  mvpRegion,
  paceOptions,
  themeOptions,
  transportationOptions,
} from "@/data/mockTravelData";
import { itineraryTravelPurposeOptions } from "@/data/mockRegionalFraming";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { getSeasonFromDate, getSuggestedTheme, getPurposeLabel } from "@/lib/regionalPreferences";
import {
  getNightCountForDuration,
  isPlaceholderDepot,
} from "@/lib/tripLodgingPlan";
import { useTripStore } from "@/stores/tripStore";
import type {
  CompanionType,
  Transportation,
  TravelDuration,
  TravelPurposeId,
  TripPace,
  TripPreferences,
  TripTheme,
} from "@/types/travel";

const TOTAL_STEPS = 7;
const NOTE_LOCKED_SKIP_STEPS = new Set([4, 5]);

interface NoteLockedPreferences {
  travelPurpose: TravelPurposeId;
  themes: TripTheme[];
}

interface PreferenceWizardProps {
  preferences: TripPreferences;
  onChange: <K extends keyof TripPreferences>(key: K, value: TripPreferences[K]) => void;
  onComplete: () => void;
  onBack: () => void;
  onOpenLodgingPicker: (nightIndex: number) => void;
  /** 오드레 노트 — 여행 목적·카테고리는 노트에서 고정, 위저드 4·5단계 생략 */
  noteLockedPreferences?: NoteLockedPreferences | null;
}

function resolveVisibleStep(subStep: number, noteLocked: boolean): number {
  if (!noteLocked) return subStep;
  if (subStep <= 3) return subStep;
  return subStep - NOTE_LOCKED_SKIP_STEPS.size;
}

function resolveVisibleTotal(noteLocked: boolean): number {
  return noteLocked ? TOTAL_STEPS - NOTE_LOCKED_SKIP_STEPS.size : TOTAL_STEPS;
}

function advanceSubStep(subStep: number, noteLocked: boolean): number {
  if (!noteLocked) return subStep + 1;
  if (subStep === 3) return 6;
  return subStep + 1;
}

function retreatSubStep(subStep: number, noteLocked: boolean): number {
  if (!noteLocked) return subStep - 1;
  if (subStep === 6) return 3;
  return subStep - 1;
}

export function PreferenceWizard({
  preferences,
  onChange,
  onComplete,
  onBack,
  onOpenLodgingPicker,
  noteLockedPreferences = null,
}: PreferenceWizardProps) {
  const noteLocked = Boolean(noteLockedPreferences);
  const visibleTotal = resolveVisibleTotal(noteLocked);
  const [subStep, setSubStep] = useState(1);
  const lodgingPlan = useTripStore((s) => s.lodgingPlan);
  const useLodgingBasedRoutes = useTripStore((s) => s.useLodgingBasedRoutes);
  const setUseLodgingBasedRoutes = useTripStore((s) => s.setUseLodgingBasedRoutes);
  const applySameLodgingAllNights = useTripStore((s) => s.applySameLodgingAllNights);
  const nightCount = getNightCountForDuration(preferences.duration);

  function handleBack() {
    if (subStep > 1) {
      setSubStep((current) => retreatSubStep(current, noteLocked));
      return;
    }
    onBack();
  }

  function handleNext() {
    if (subStep < TOTAL_STEPS) {
      setSubStep((current) => advanceSubStep(current, noteLocked));
      return;
    }
    onComplete();
  }

  const visibleStep = resolveVisibleStep(subStep, noteLocked);
  const lockedThemeLabels = noteLockedPreferences
    ? noteLockedPreferences.themes
        .map((theme) => themeOptions.find((option) => option.id === theme)?.label ?? theme)
        .join(" · ")
    : "";

  return (
    <main className="flex min-h-full flex-col pb-8">
      <div className="flex items-center px-5 pt-2">
        <button
          className="flex size-10 items-center justify-center rounded-full text-pine"
          onClick={handleBack}
          type="button"
        >
          ←
        </button>
      </div>

      {subStep === 1 ? (
        <>
          <StepWizardHeader
            description={`${travelZoneShortLabels[preferences.zoneId] ?? mvpRegion.name} 권역으로 실행 일정을 만듭니다.`}
            icon={<MapPin aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="언제, 몇 명이 떠나나요?"
            total={visibleTotal}
          />
          <div className="mt-8 space-y-6 px-5">
            <section>
              <label className="text-sm font-semibold text-ink" htmlFor="travel-date">
                여행 날짜
              </label>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-pine/10 bg-ivory px-4 py-3">
                <CalendarDays aria-hidden="true" className="size-4 text-pine" />
                <input
                  className="w-full bg-transparent text-sm font-medium text-ink outline-none"
                  id="travel-date"
                  onChange={(e) => {
                    const date = e.target.value;
                    onChange("travelDate", date);
                    onChange("season", getSeasonFromDate(date));
                  }}
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
          </div>
        </>
      ) : null}

      {subStep === 2 ? (
        <>
          <StepWizardHeader
            description="원하는 기간을 선택해 주세요."
            icon={<CalendarDays aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="여행 기간은?"
            total={visibleTotal}
          />
          <div className="mt-10 px-5">
            <SelectionGrid
              onChange={(v) => onChange("duration", v as TravelDuration)}
              options={durationOptions.map((o) => ({ id: o.id, label: o.label }))}
              value={preferences.duration}
            />
          </div>
        </>
      ) : null}

      {subStep === 3 ? (
        <>
          <StepWizardHeader
            description="동행 유형을 선택해 주세요."
            icon={<Users aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="누구와 떠나나요?"
            total={visibleTotal}
          />
          <div className="mt-10 px-5">
            <SelectionGrid
              onChange={(v) => onChange("companion", v as CompanionType)}
              options={companionOptions.map((o) => ({ id: o.id, label: o.label }))}
              value={preferences.companion}
            />
          </div>
          {noteLockedPreferences ? (
            <div className="mt-6 px-5">
              <p className="rounded-2xl border border-pine/12 bg-pine/5 px-4 py-3 text-xs leading-5 text-stone">
                <span className="font-semibold text-pine">오드레 노트에서 읽은 여행 성향</span>
                <span className="mt-1 block">
                  목적 · {getPurposeLabel(noteLockedPreferences.travelPurpose)}
                  {lockedThemeLabels ? ` · ${lockedThemeLabels}` : ""}
                </span>
                <span className="mt-1 block text-[11px] text-stone/90">
                  글과 맞지 않게 바꾸면 장소·동선 추천이 어긋날 수 있어 자동 적용합니다.
                </span>
              </p>
            </div>
          ) : null}
        </>
      ) : null}

      {subStep === 4 && !noteLocked ? (
        <>
          <StepWizardHeader
            description="강원 특화 여행 목적에 맞춰 코스 성향을 잡습니다."
            icon={<Compass aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="어떤 여행 목적인가요?"
            total={visibleTotal}
          />
          <div className="mt-8 space-y-3 px-5">
            {itineraryTravelPurposeOptions.map((option) => (
              <ToggleCard
                description={option.description}
                key={option.id}
                onClick={() => {
                  onChange("travelPurpose", option.id as TravelPurposeId);
                  onChange("themes", [option.suggestedTheme]);
                }}
                selected={preferences.travelPurpose === option.id}
                title={option.label}
              />
            ))}
          </div>
        </>
      ) : null}

      {subStep === 5 && !noteLocked ? (
        <>
          <StepWizardHeader
            description="복수 선택 가능합니다. 고른 카테고리를 바탕으로 AI가 실행 일정을 구성합니다."
            icon={<Compass aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="관심 카테고리는?"
            total={visibleTotal}
          />
          <div className="mt-6 px-5">
            <p className="rounded-2xl bg-pine/6 px-4 py-3 text-xs leading-5 text-stone">
              추천 카테고리:{" "}
              <span className="font-semibold text-pine">
                {
                  themeOptions.find(
                    (o) =>
                      o.id ===
                      getSuggestedTheme(preferences.season, preferences.travelPurpose),
                  )?.label
                }
              </span>{" "}
              (목적·계절 기준)
            </p>
          </div>
          <div className="mt-6 px-5">
            <SelectionGrid
              columns={3}
              multiple
              onChange={(v) => onChange("themes", v as TripTheme[])}
              options={themeOptions.map((o) => ({ id: o.id, label: o.label }))}
              value={preferences.themes}
            />
          </div>
        </>
      ) : null}

      {subStep === 6 ? (
        <>
          <StepWizardHeader
            description="박마다 다른 숙소도 지정할 수 있어요. 관광 stop에는 넣지 않고 출발·복귀 동선만 반영합니다."
            icon={<BedDouble aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="숙소 기준 동선"
            total={visibleTotal}
          />
          <div className="mt-8 space-y-4 px-5">
            <ToggleCard
              description="숙소에서 출발해 저녁에 복귀하는 leg·이동 시간을 일정에 반영합니다."
              onClick={() => setUseLodgingBasedRoutes(!useLodgingBasedRoutes)}
              selected={useLodgingBasedRoutes}
              title="숙소 기준 동선 사용"
            />
            {nightCount === 0 ? (
              <p className="rounded-2xl bg-pine/6 px-4 py-3 text-xs leading-5 text-stone">
                당일치기는 숙박 슬롯이 없습니다. 예약 탭에서 숙소를 지정하면 당일 기준점으로 쓸 수
                있습니다.
              </p>
            ) : (
              <>
                {lodgingPlan.nights.map((night) => (
                  <button
                    className="flex w-full items-center justify-between rounded-2xl border border-pine/10 bg-paper px-4 py-3 text-left"
                    key={night.nightIndex}
                    onClick={() => onOpenLodgingPicker(night.nightIndex)}
                    type="button"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {night.nightIndex}박째 숙소
                      </span>
                      <span
                        className={
                          isPlaceholderDepot(night.depot)
                            ? "mt-1 block text-xs text-pine"
                            : "mt-1 block text-xs text-stone"
                        }
                      >
                        {isPlaceholderDepot(night.depot) ? "미지정 · 탭하여 선택" : night.depot.name}
                      </span>
                    </span>
                    <MapPin aria-hidden="true" className="size-4 text-pine" />
                  </button>
                ))}
                {lodgingPlan.nights.some((n) => !isPlaceholderDepot(n.depot)) ? (
                  <PremiumButton
                    className="w-full"
                    onClick={() => {
                      const first = lodgingPlan.nights.find((n) => !isPlaceholderDepot(n.depot));
                      if (first) applySameLodgingAllNights(first.depot);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    모든 박 같은 숙소로 적용
                  </PremiumButton>
                ) : null}
              </>
            )}
          </div>
        </>
      ) : null}

      {subStep === 7 ? (
        <>
          <StepWizardHeader
            description="선택하신 스타일로 실행 일정을 만들어 드려요."
            icon={<Gauge aria-hidden="true" className="size-8 text-pine" />}
            step={visibleStep}
            title="이동과 일정 속도는?"
            total={visibleTotal}
          />
          <div className="mt-8 space-y-6 px-5">
            <section className="space-y-3">
              <p className="text-sm font-semibold text-ink">이동 수단</p>
              <SelectionGrid
                onChange={(v) => onChange("transportation", v as Transportation)}
                options={transportationOptions.map((o) => ({
                  id: o.id,
                  label: o.label,
                }))}
                value={preferences.transportation}
              />
            </section>
            <section className="space-y-3">
              <p className="text-sm font-semibold text-ink">일정 속도</p>
              {paceOptions.map((option) => (
                <ToggleCard
                  description={option.description}
                  key={option.id}
                  onClick={() => onChange("pace", option.id as TripPace)}
                  selected={preferences.pace === option.id}
                  title={option.label}
                />
              ))}
            </section>
          </div>
        </>
      ) : null}

      <div className="mt-auto px-5 pt-8">
        <PremiumButton className="w-full" onClick={handleNext}>
          {subStep === TOTAL_STEPS ? "맞춤 일정 생성" : "다음"}
        </PremiumButton>
      </div>
    </main>
  );
}
