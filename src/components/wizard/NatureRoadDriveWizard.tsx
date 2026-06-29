"use client";

import { useMemo, useState } from "react";
import { CalendarDays, Gauge, MapPin, Minus, Plus, Route } from "lucide-react";
import { StepWizardHeader } from "@/components/wizard/StepWizardHeader";
import { ExpandableText } from "@/components/ui/ExpandableText";
import { SelectionGrid } from "@/components/ui/SelectionGrid";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { ToggleCard } from "@/components/ui/ToggleCard";
import { durationOptions, paceOptions } from "@/data/mockTravelData";
import { getSeasonFromDate } from "@/lib/regionalPreferences";
import { resolveNatureRoadPlacesForZone } from "@/services/natureRoadItineraryService";
import type { FeaturedNatureRoadSegment } from "@/services/natureRoadCatalog";
import type {
  TravelDuration,
  TravelZoneId,
  TripPace,
  TripPreferences,
} from "@/types/travel";

const TOTAL_STEPS = 3;

interface NatureRoadDriveWizardProps {
  preferences: TripPreferences;
  segment: FeaturedNatureRoadSegment;
  zoneId: TravelZoneId;
  onChange: <K extends keyof TripPreferences>(key: K, value: TripPreferences[K]) => void;
  onComplete: () => void;
  onBack: () => void;
}

export function NatureRoadDriveWizard({
  preferences,
  segment,
  zoneId,
  onChange,
  onComplete,
  onBack,
}: NatureRoadDriveWizardProps) {
  const [subStep, setSubStep] = useState(1);

  const routeStops = useMemo(
    () => resolveNatureRoadPlacesForZone(zoneId),
    [zoneId],
  );

  function handleBack() {
    if (subStep > 1) {
      setSubStep((current) => current - 1);
      return;
    }
    onBack();
  }

  function handleNext() {
    if (subStep < TOTAL_STEPS) {
      setSubStep((current) => current + 1);
      return;
    }
    onComplete();
  }

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
            description={`${segment.title} · ${segment.phaseLabel}`}
            icon={<MapPin aria-hidden="true" className="size-8 text-pine" />}
            step={subStep}
            title="드라이브 일정, 언제 떠나시나요?"
            total={TOTAL_STEPS}
          />
          <div className="mt-8 space-y-6 px-5">
            <section>
              <label className="text-sm font-semibold text-ink" htmlFor="nature-road-date">
                여행 날짜
              </label>
              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-pine/10 bg-ivory px-4 py-3">
                <CalendarDays aria-hidden="true" className="size-4 text-pine" />
                <input
                  className="w-full bg-transparent text-sm font-medium text-ink outline-none"
                  id="nature-road-date"
                  onChange={(event) => {
                    const date = event.target.value;
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
                <p className="text-xs text-stone">차량 이동·예약 기준</p>
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
            description="드라이브 코스에 맞는 기간을 선택해 주세요."
            icon={<Route aria-hidden="true" className="size-8 text-pine" />}
            step={subStep}
            title="당일·1박 중 선택"
            total={TOTAL_STEPS}
          />
          <div className="mt-10 px-5">
            <SelectionGrid
              onChange={(value) => onChange("duration", value as TravelDuration)}
              options={durationOptions.map((option) => ({
                id: option.id,
                label: option.label,
              }))}
              value={preferences.duration}
            />
          </div>
        </>
      ) : null}

      {subStep === 3 ? (
        <>
          <StepWizardHeader
            description="공식 코스 순서로 실행 일정을 만듭니다. 이동은 차량 기준입니다."
            icon={<Gauge aria-hidden="true" className="size-8 text-pine" />}
            step={subStep}
            title="이 코스로 일정을 만들까요?"
            total={TOTAL_STEPS}
          />
          <div className="mt-6 space-y-4 px-5">
            <div className="rounded-2xl border border-pine/10 bg-paper p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">
                {segment.eyebrow}
              </p>
              <p className="mt-2 text-lg font-semibold text-ink">{segment.title}</p>
              <p className="mt-1 text-sm text-stone">{segment.routeHint}</p>
              <ExpandableText className="mt-3 text-xs leading-5 text-stone">
                {segment.description}
              </ExpandableText>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">경유 실행 장소</p>
              <ul className="mt-2 space-y-2">
                {routeStops.map((place, index) => (
                  <li
                    className="flex items-center gap-2 rounded-xl border border-pine/10 bg-ivory px-3 py-2.5 text-sm text-ink"
                    key={place.id}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pine/10 text-xs font-semibold text-pine">
                      {index + 1}
                    </span>
                    {place.name}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-sm font-semibold text-ink">드라이브 페이스</p>
              <div className="mt-2 space-y-2">
                {paceOptions.map((option) => (
                  <ToggleCard
                    description={option.description}
                    key={option.id}
                    onClick={() => onChange("pace", option.id as TripPace)}
                    selected={preferences.pace === option.id}
                    title={option.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      ) : null}

      <div className="mt-auto px-5 pt-8">
        <PremiumButton className="w-full" onClick={handleNext}>
          {subStep === TOTAL_STEPS ? "드라이브 일정 만들기" : "다음"}
        </PremiumButton>
      </div>
    </main>
  );
}
