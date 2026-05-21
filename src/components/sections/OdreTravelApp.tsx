"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronRight,
  Clock,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { BottomNav, type BottomNavItem } from "@/components/layout/BottomNav";
import { MobileFrame } from "@/components/layout/MobileFrame";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { PreferenceChip } from "@/components/ui/PreferenceChip";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ToggleCard } from "@/components/ui/ToggleCard";
import { ItineraryTimeline } from "@/components/travel/ItineraryTimeline";
import { PlaceCard } from "@/components/travel/PlaceCard";
import { RegionCard } from "@/components/travel/RegionCard";
import { RoutePreviewCard } from "@/components/travel/RoutePreviewCard";
import {
  attractions,
  cafes,
  defaultPreferences,
  foodPreferences,
  regions,
  restaurants,
  travelStyles,
} from "@/data/mockTravelData";
import { generateRegionRecommendations } from "@/services/aiRecommendationService";
import { generateItinerary } from "@/services/itineraryService";
import { cn } from "@/lib/utils";
import { useTripStore } from "@/stores/tripStore";
import type {
  BudgetLevel,
  Itinerary,
  MobilityPreference,
  Place,
  Region,
  TripPreferences,
  TravelDuration,
} from "@/types/travel";

type Step =
  | "onboarding"
  | "home"
  | "preferences"
  | "regions"
  | "places"
  | "itinerary"
  | "saved"
  | "map";

const stepOrder: Step[] = [
  "onboarding",
  "home",
  "preferences",
  "regions",
  "places",
  "itinerary",
  "saved",
  "map",
];

const budgetOptions: Array<{ id: BudgetLevel; label: string; description: string }> = [
  { id: "standard", label: "실속형", description: "대표 장소 중심의 균형 잡힌 일정" },
  { id: "comfort", label: "컴포트", description: "식사와 카페 선택지에 여유를 둔 일정" },
  { id: "premium", label: "프리미엄", description: "장소 밀도보다 체류감과 완성도를 우선" },
];

const mobilityOptions: Array<{ id: MobilityPreference; label: string; description: string }> = [
  { id: "compact", label: "짧은 이동", description: "차량 이동을 최대한 줄입니다." },
  { id: "balanced", label: "균형 이동", description: "좋은 장소라면 적당한 이동을 허용합니다." },
  { id: "spacious", label: "여유 동선", description: "장소 수를 줄이고 머무는 시간을 늘립니다." },
];

const durationOptions: Array<{ id: TravelDuration; label: string }> = [
  { id: "half-day", label: "반나절" },
  { id: "one-day", label: "하루" },
  { id: "two-days", label: "1박 2일" },
];

export function OdreTravelApp() {
  const [step, setStep] = useState<Step>("onboarding");
  const [localPreferences, setLocalPreferences] =
    useState<TripPreferences>(defaultPreferences);
  const [regionRecommendations, setRegionRecommendations] = useState<Region[]>(regions);
  const [isGenerating, setIsGenerating] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const {
    preferences,
    selectedRegion,
    selectedPlaces,
    itinerary,
    savedItineraries,
    setPreferences,
    setSelectedRegion,
    togglePlace,
    setItinerary,
    saveCurrentItinerary,
    loadItinerary,
    resetTrip,
  } = useTripStore();

  const selectedRegionId = selectedRegion?.id ?? regionRecommendations[0]?.id;
  const recommendedAttractions = useMemo(
    () => attractions.filter((place) => place.region === selectedRegionId),
    [selectedRegionId],
  );
  const recommendedRestaurants = useMemo(
    () => restaurants.filter((place) => place.region === selectedRegionId),
    [selectedRegionId],
  );
  const recommendedCafes = useMemo(
    () => cafes.filter((place) => place.region === selectedRegionId),
    [selectedRegionId],
  );

  const currentIndex = stepOrder.indexOf(step);

  function goBack() {
    const nextStep = stepOrder[Math.max(currentIndex - 1, 0)];
    setStep(nextStep);
  }

  function updatePreference<K extends keyof TripPreferences>(
    key: K,
    value: TripPreferences[K],
  ) {
    setLocalPreferences((current) => ({ ...current, [key]: value }));
  }

  function toggleStyle(styleId: string) {
    setLocalPreferences((current) => {
      const exists = current.travelStyleIds.includes(styleId);
      return {
        ...current,
        travelStyleIds: exists
          ? current.travelStyleIds.filter((id) => id !== styleId)
          : [...current.travelStyleIds, styleId],
      };
    });
  }

  function toggleFood(foodId: string) {
    setLocalPreferences((current) => {
      const exists = current.foodPreferenceIds.includes(foodId);
      return {
        ...current,
        foodPreferenceIds: exists
          ? current.foodPreferenceIds.filter((id) => id !== foodId)
          : [...current.foodPreferenceIds, foodId],
      };
    });
  }

  async function handleGenerateRegions() {
    setIsGenerating(true);
    setPreferences(localPreferences);
    const recommendations = await generateRegionRecommendations(localPreferences);
    setRegionRecommendations(recommendations);
    setIsGenerating(false);
    setStep("regions");
  }

  function handleSelectRegion(region: Region) {
    setSelectedRegion(region);
    setStep("places");
  }

  async function handleGenerateItinerary() {
    const region = selectedRegion ?? regionRecommendations[0];
    if (!region) return;

    setIsGenerating(true);
    const fallbackPlaces = [
      ...recommendedAttractions.slice(0, 2),
      ...recommendedRestaurants.slice(0, 1),
      ...recommendedCafes.slice(0, 1),
    ];
    const places = selectedPlaces.length > 0 ? selectedPlaces : fallbackPlaces;
    const generated = await generateItinerary(region.id, places, preferences);
    setItinerary(generated);
    setIsGenerating(false);
    setStep("itinerary");
  }

  function handleRestart() {
    resetTrip();
    setLocalPreferences(defaultPreferences);
    setRegionRecommendations(regions);
    setSaveMessage("");
    setStep("home");
  }

  function handleSaveItinerary() {
    const saved = saveCurrentItinerary();
    setSaveMessage(saved ? "일정이 저장되었습니다." : "저장할 일정이 없습니다.");
  }

  function handleLoadItinerary(saved: Itinerary) {
    loadItinerary(saved);
    setSaveMessage("");
    setStep("itinerary");
  }

  function handleBottomNav(item: BottomNavItem) {
    if (item === "home") setStep("home");
    if (item === "recommendations") setStep(selectedRegion ? "places" : "regions");
    if (item === "saved") setStep("saved");
    if (item === "map") setStep("map");
  }

  function getActiveBottomItem(): BottomNavItem {
    if (step === "saved") return "saved";
    if (step === "map") return "map";
    if (step === "regions" || step === "places" || step === "preferences") {
      return "recommendations";
    }
    return "home";
  }

  return (
    <AppShell>
      <MobileFrame>
        <div className="relative min-h-screen bg-ivory pb-24">
          {step !== "onboarding" ? (
            <AppHeader step={step} onBack={goBack} onHome={() => setStep("home")} />
          ) : null}

          {step === "onboarding" ? (
            <OnboardingScreen onStart={() => setStep("home")} />
          ) : null}
          {step === "home" ? (
            <HomeScreen onStart={() => setStep("preferences")} />
          ) : null}
          {step === "preferences" ? (
            <PreferenceScreen
              preferences={localPreferences}
              isGenerating={isGenerating}
              onGenerate={handleGenerateRegions}
              onTravelerChange={(travelers) =>
                updatePreference("travelers", Math.max(1, travelers))
              }
              onDateChange={(travelDate) => updatePreference("travelDate", travelDate)}
              onDurationChange={(duration) => updatePreference("duration", duration)}
              onBudgetChange={(budget) => updatePreference("budgetLevel", budget)}
              onMobilityChange={(mobility) =>
                updatePreference("mobilityPreference", mobility)
              }
              onToggleStyle={toggleStyle}
              onToggleFood={toggleFood}
            />
          ) : null}
          {step === "regions" ? (
            <RegionRecommendationScreen
              regions={regionRecommendations}
              onSelect={handleSelectRegion}
            />
          ) : null}
          {step === "places" ? (
            <PlaceRecommendationScreen
              region={selectedRegion ?? regionRecommendations[0]}
              attractions={recommendedAttractions}
              restaurants={recommendedRestaurants}
              cafes={recommendedCafes}
              selectedPlaces={selectedPlaces}
              isGenerating={isGenerating}
              onTogglePlace={togglePlace}
              onGenerateItinerary={handleGenerateItinerary}
            />
          ) : null}
          {step === "itinerary" ? (
            <ItineraryScreen
              itinerary={itinerary}
              saveMessage={saveMessage}
              onRestart={handleRestart}
              onSave={handleSaveItinerary}
            />
          ) : null}
          {step === "saved" ? (
            <SavedItinerariesScreen
              itineraries={savedItineraries}
              onLoadItinerary={handleLoadItinerary}
            />
          ) : null}
          {step === "map" ? (
            <MapScreen itinerary={itinerary} />
          ) : null}

          {step !== "onboarding" ? (
            <BottomNav activeItem={getActiveBottomItem()} onNavigate={handleBottomNav} />
          ) : null}
        </div>
      </MobileFrame>
    </AppShell>
  );
}

function AppHeader({
  step,
  onBack,
  onHome,
}: {
  step: Step;
  onBack: () => void;
  onHome: () => void;
}) {
  const canGoBack = step !== "home";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-pine/10 bg-ivory/92 px-5 py-4 backdrop-blur">
      <button
        className={cn(
          "flex size-10 items-center justify-center rounded-full border border-pine/10 text-pine",
          !canGoBack && "pointer-events-none opacity-0",
        )}
        onClick={onBack}
        type="button"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
      </button>
      <button className="text-center" onClick={onHome} type="button">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pine">
          ODRÉ GANGWON
        </p>
        <p className="text-xs text-stone">오드래강원</p>
      </button>
      <div className="size-10" />
    </header>
  );
}

function OnboardingScreen({ onStart }: { onStart: () => void }) {
  return (
    <main className="min-h-screen bg-pine-deep text-ivory">
      <div className="relative flex min-h-screen flex-col justify-between overflow-hidden px-6 pb-8 pt-12">
        <div className="absolute inset-x-[-20%] top-16 h-72 rounded-[50%] bg-pine blur-3xl opacity-30" />
        <div className="absolute bottom-20 left-8 right-8 h-px bg-mist/20" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-mist">
            ODRÉ GANGWON
          </p>
          <h1 className="mt-8 text-5xl font-semibold leading-[1.08]">
            숲의 결을 따라,
            <br />
            강원의 하루를 고릅니다.
          </h1>
          <p className="mt-6 max-w-[320px] text-sm leading-6 text-mist">
            여행지를 나열하지 않고, 취향과 이동의 흐름에 맞춰 강원의 장면을
            차분히 엮습니다.
          </p>
        </div>

        <div className="relative space-y-5">
          <div className="rounded-3xl border border-ivory/12 bg-ivory/8 p-4 backdrop-blur">
            <p className="text-sm font-semibold">동해의 아침, 숲의 여백, 호수의 속도</p>
            <p className="mt-2 text-xs leading-5 text-mist">
              강릉, 속초, 양양, 춘천, 평창, 정선을 취향 기반 일정으로 제안합니다.
            </p>
          </div>
          <PremiumButton className="w-full" onClick={onStart} variant="ivory">
            여행 큐레이션 시작하기
          </PremiumButton>
        </div>
      </div>
    </main>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  const featured = regions[4];

  return (
    <main className="space-y-8 px-5 py-6">
      <section className="space-y-5">
        <div>
          <p className="text-sm text-stone">오늘의 강원 큐레이션</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-ink">
            어떤 속도의 강원을
            <br />
            원하시나요?
          </h1>
        </div>
        <div className="overflow-hidden rounded-[1.75rem] bg-pine-deep text-ivory shadow-[var(--shadow-card)]">
          <div className={cn("h-48 bg-gradient-to-br", featured.gradient)} />
          <div className="p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-mist">
              Featured Region
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{featured.name}</h2>
            <p className="mt-2 text-sm leading-6 text-mist">{featured.headline}</p>
            <PremiumButton className="mt-5 w-full" onClick={onStart} variant="ivory">
              취향 입력하기
            </PremiumButton>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <SectionHeader
          title="추천 테마"
          description="기능 목록보다 여행의 분위기에서 출발합니다."
        />
        <div className="grid grid-cols-2 gap-3">
          {travelStyles.slice(0, 4).map((style) => (
            <div
              className="rounded-3xl border border-pine/10 bg-paper p-4 shadow-[var(--shadow-card)]"
              key={style.id}
            >
              <p className="text-sm font-semibold text-pine">{style.label}</p>
              <p className="mt-2 text-xs leading-5 text-stone">{style.description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function PreferenceScreen({
  preferences,
  isGenerating,
  onGenerate,
  onDateChange,
  onTravelerChange,
  onDurationChange,
  onBudgetChange,
  onMobilityChange,
  onToggleStyle,
  onToggleFood,
}: {
  preferences: TripPreferences;
  isGenerating: boolean;
  onGenerate: () => void;
  onDateChange: (value: string) => void;
  onTravelerChange: (value: number) => void;
  onDurationChange: (value: TravelDuration) => void;
  onBudgetChange: (value: BudgetLevel) => void;
  onMobilityChange: (value: MobilityPreference) => void;
  onToggleStyle: (value: string) => void;
  onToggleFood: (value: string) => void;
}) {
  return (
    <main className="space-y-7 px-5 py-6">
      <SectionHeader
        eyebrow="Concierge Note"
        title="여행의 속도와 취향을 알려주세요"
        description="선택지는 추천 흐름을 보여주기 위한 demo input입니다."
      />

      <section className="rounded-3xl border border-pine/10 bg-paper p-5 shadow-[var(--shadow-card)]">
        <label className="text-sm font-semibold text-ink" htmlFor="travel-date">
          여행 날짜
        </label>
        <div className="mt-3 flex items-center gap-3 rounded-2xl border border-pine/10 bg-ivory px-4 py-3">
          <CalendarDays aria-hidden="true" className="size-4 text-pine" />
          <input
            className="w-full bg-transparent text-sm font-medium text-ink outline-none"
            id="travel-date"
            onChange={(event) => onDateChange(event.target.value)}
            type="date"
            value={preferences.travelDate}
          />
        </div>
      </section>

      <section className="rounded-3xl border border-pine/10 bg-paper p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">여행 인원</p>
            <p className="text-xs text-stone">동선과 식사 선택의 기준이 됩니다.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              className="flex size-9 items-center justify-center rounded-full bg-pine/8 text-pine"
              onClick={() => onTravelerChange(preferences.travelers - 1)}
              type="button"
            >
              <Minus aria-hidden="true" className="size-4" />
            </button>
            <span className="w-7 text-center text-lg font-semibold text-ink">
              {preferences.travelers}
            </span>
            <button
              className="flex size-9 items-center justify-center rounded-full bg-pine text-ivory"
              onClick={() => onTravelerChange(preferences.travelers + 1)}
              type="button"
            >
              <Plus aria-hidden="true" className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <PreferenceGroup title="여행 기간">
        {durationOptions.map((option) => (
          <PreferenceChip
            key={option.id}
            onClick={() => onDurationChange(option.id)}
            selected={preferences.duration === option.id}
          >
            {option.label}
          </PreferenceChip>
        ))}
      </PreferenceGroup>

      <PreferenceGroup title="여행 스타일">
        {travelStyles.map((style) => (
          <PreferenceChip
            key={style.id}
            onClick={() => onToggleStyle(style.id)}
            selected={preferences.travelStyleIds.includes(style.id)}
          >
            {style.label}
          </PreferenceChip>
        ))}
      </PreferenceGroup>

      <PreferenceGroup title="음식 취향">
        {foodPreferences.map((food) => (
          <PreferenceChip
            key={food.id}
            onClick={() => onToggleFood(food.id)}
            selected={preferences.foodPreferenceIds.includes(food.id)}
          >
            {food.label}
          </PreferenceChip>
        ))}
      </PreferenceGroup>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-ink">예산 감도</p>
        {budgetOptions.map((option) => (
          <ToggleCard
            description={option.description}
            key={option.id}
            onClick={() => onBudgetChange(option.id)}
            selected={preferences.budgetLevel === option.id}
            title={option.label}
          />
        ))}
      </section>

      <section className="space-y-3">
        <p className="text-sm font-semibold text-ink">이동 선호</p>
        {mobilityOptions.map((option) => (
          <ToggleCard
            description={option.description}
            key={option.id}
            onClick={() => onMobilityChange(option.id)}
            selected={preferences.mobilityPreference === option.id}
            title={option.label}
          />
        ))}
      </section>

      <PremiumButton className="w-full" disabled={isGenerating} onClick={onGenerate}>
        {isGenerating ? "추천을 구성하는 중" : "지역 추천 받기"}
      </PremiumButton>
    </main>
  );
}

function PreferenceGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <p className="text-sm font-semibold text-ink">{title}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </section>
  );
}

function RegionRecommendationScreen({
  regions: recommendedRegions,
  onSelect,
}: {
  regions: Region[];
  onSelect: (region: Region) => void;
}) {
  return (
    <main className="space-y-6 px-5 py-6">
      <SectionHeader
        eyebrow="Region Curation"
        title="오늘의 강원 지역을 골랐습니다"
        description="점수는 크게 보이기보다, 왜 이 지역이 맞는지를 설명하는 보조 정보로만 사용합니다."
      />
      <div className="space-y-5">
        {recommendedRegions.map((region, index) => (
          <RegionCard
            key={region.id}
            onSelect={onSelect}
            region={region}
            selected={index === 0}
          />
        ))}
      </div>
    </main>
  );
}

function PlaceRecommendationScreen({
  region,
  attractions,
  restaurants,
  cafes,
  selectedPlaces,
  isGenerating,
  onTogglePlace,
  onGenerateItinerary,
}: {
  region?: Region;
  attractions: Place[];
  restaurants: Place[];
  cafes: Place[];
  selectedPlaces: Place[];
  isGenerating: boolean;
  onTogglePlace: (place: Place) => void;
  onGenerateItinerary: () => void;
}) {
  const selectedIds = new Set(selectedPlaces.map((place) => place.id));

  if (!region) {
    return (
      <EmptyState
        title="선택된 지역이 없습니다"
        description="지역 추천 화면에서 먼저 강원 지역을 선택해주세요."
      />
    );
  }

  return (
    <main className="space-y-7 px-5 py-6">
      <SectionHeader
        eyebrow="Places"
        title={`${region.name}에서 이어갈 장소`}
        description="관광지, 식사, 카페를 선택하면 다음 화면에서 일정표로 엮습니다."
      />

      <PlaceSection
        places={attractions}
        selectedIds={selectedIds}
        title="추천 관광지"
        onTogglePlace={onTogglePlace}
      />
      <PlaceSection
        places={restaurants}
        selectedIds={selectedIds}
        title="식사 추천"
        onTogglePlace={onTogglePlace}
      />
      <PlaceSection
        places={cafes}
        selectedIds={selectedIds}
        title="카페 추천"
        onTogglePlace={onTogglePlace}
      />

      <div className="sticky bottom-24 rounded-3xl border border-pine/10 bg-ivory/95 p-4 shadow-[var(--shadow-soft)] backdrop-blur">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-ink">
            선택한 장소 {selectedPlaces.length}개
          </p>
          <p className="text-xs text-stone">미선택 시 추천 조합으로 생성</p>
        </div>
        <PremiumButton
          className="w-full"
          disabled={isGenerating}
          onClick={onGenerateItinerary}
        >
          {isGenerating ? "일정을 엮는 중" : "최종 일정 만들기"}
        </PremiumButton>
      </div>
    </main>
  );
}

function PlaceSection({
  title,
  places,
  selectedIds,
  onTogglePlace,
}: {
  title: string;
  places: Place[];
  selectedIds: Set<string>;
  onTogglePlace: (place: Place) => void;
}) {
  if (places.length === 0) {
    return (
      <section className="rounded-3xl border border-pine/10 bg-paper p-5 text-sm text-stone">
        {title} 데이터는 다음 mock data 보강 단계에서 추가됩니다.
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-ink">{title}</h2>
      <div className="space-y-3">
        {places.map((place) => (
          <button
            className="block w-full text-left"
            key={place.id}
            onClick={() => onTogglePlace(place)}
            type="button"
          >
            <PlaceCard place={place} selected={selectedIds.has(place.id)} />
          </button>
        ))}
      </div>
    </section>
  );
}

function ItineraryScreen({
  itinerary,
  saveMessage,
  onSave,
  onRestart,
}: {
  itinerary?: Itinerary;
  saveMessage: string;
  onSave: () => void;
  onRestart: () => void;
}) {
  if (!itinerary) {
    return (
      <EmptyState
        title="생성된 일정이 없습니다"
        description="장소 추천 화면에서 최종 일정을 먼저 만들어주세요."
      />
    );
  }

  return (
    <main className="space-y-6 px-5 py-6">
      <section className="rounded-[1.75rem] bg-pine-deep p-5 text-ivory shadow-[var(--shadow-card)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-mist">
          Final Itinerary
        </p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight">{itinerary.title}</h1>
        <p className="mt-3 text-sm leading-6 text-mist">{itinerary.summary}</p>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <Metric label="총 소요" value={itinerary.totalDuration} />
          <Metric label="이동 시간" value={itinerary.movingTime} />
        </div>
      </section>

      <RoutePreviewCard enableMap stops={itinerary.stops} />

      <section className="rounded-3xl border border-pine/10 bg-paper p-5 shadow-[var(--shadow-card)]">
        <div className="flex gap-3">
          <Sparkles aria-hidden="true" className="mt-1 size-5 shrink-0 text-pine" />
          <div>
            <h2 className="text-lg font-semibold text-ink">큐레이션 노트</h2>
            <p className="mt-2 text-sm leading-6 text-stone">
              {itinerary.aiExplanation}
            </p>
          </div>
        </div>
      </section>

      <ItineraryTimeline items={itinerary.timeline} />

      <section className="rounded-3xl border border-pine/10 bg-paper p-5 shadow-[var(--shadow-card)]">
        <h2 className="text-lg font-semibold text-ink">대안 제안</h2>
        <ul className="mt-3 space-y-2">
          {itinerary.alternatives.map((alternative) => (
            <li className="flex gap-2 text-sm text-stone" key={alternative}>
              <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-pine" />
              {alternative}
            </li>
          ))}
        </ul>
      </section>

      <div className="space-y-3">
        <PremiumButton className="w-full" onClick={onSave}>
          일정 저장하기
        </PremiumButton>
        {saveMessage ? (
          <p className="text-center text-sm font-medium text-pine">{saveMessage}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <PremiumButton variant="ghost">공유하기</PremiumButton>
        <PremiumButton onClick={onRestart}>새 일정</PremiumButton>
      </div>
    </main>
  );
}

function SavedItinerariesScreen({
  itineraries,
  onLoadItinerary,
}: {
  itineraries: Itinerary[];
  onLoadItinerary: (itinerary: Itinerary) => void;
}) {
  return (
    <main className="space-y-6 px-5 py-6">
      <SectionHeader
        eyebrow="Saved Trips"
        title="저장한 일정"
        description="저장한 일정은 이 브라우저에 보관됩니다. 발표 데모에서는 같은 기기에서 다시 불러올 수 있습니다."
      />

      {itineraries.length === 0 ? (
        <EmptyPanel
          title="아직 저장된 일정이 없습니다"
          description="최종 일정 화면에서 일정 저장하기를 눌러 보관하세요."
        />
      ) : (
        <div className="space-y-3">
          {itineraries.map((saved) => (
            <button
              className="w-full rounded-3xl border border-pine/10 bg-paper p-5 text-left shadow-[var(--shadow-card)]"
              key={saved.id}
              onClick={() => onLoadItinerary(saved)}
              type="button"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
                {saved.totalDuration} · 이동 {saved.movingTime}
              </p>
              <h2 className="mt-2 text-xl font-semibold leading-7 text-ink">
                {saved.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-stone">{saved.summary}</p>
              <p className="mt-4 text-sm font-semibold text-pine">일정 열기</p>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

function MapScreen({ itinerary }: { itinerary?: Itinerary }) {
  return (
    <main className="space-y-6 px-5 py-6">
      <SectionHeader
        eyebrow="Route Map"
        title="지도"
        description="현재 생성된 일정의 좌표를 지도 또는 fallback 경로로 확인합니다."
      />

      {itinerary ? (
        <>
          <RoutePreviewCard enableMap stops={itinerary.stops} />
          <section className="rounded-3xl border border-pine/10 bg-paper p-5 shadow-[var(--shadow-card)]">
            <h2 className="text-lg font-semibold text-ink">경로 순서</h2>
            <ol className="mt-4 space-y-3">
              {itinerary.stops.map((stop) => (
                <li className="flex gap-3 text-sm text-stone" key={stop.id}>
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-pine text-xs font-semibold text-ivory">
                    {stop.order}
                  </span>
                  <span>
                    <strong className="font-semibold text-ink">{stop.placeName}</strong>
                    <br />
                    {stop.timeLabel} · {stop.duration}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </>
      ) : (
        <EmptyPanel
          title="표시할 일정이 없습니다"
          description="먼저 추천 플로우에서 최종 일정을 생성하거나 저장된 일정을 열어주세요."
        />
      )}
    </main>
  );
}

function EmptyPanel({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="rounded-3xl border border-pine/10 bg-paper p-6 text-center shadow-[var(--shadow-card)]">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-stone">{description}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-ivory/10 p-4">
      <div className="flex items-center gap-2 text-mist">
        <Clock aria-hidden="true" className="size-4" />
        <p className="text-xs">{label}</p>
      </div>
      <p className="mt-2 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="flex min-h-[70vh] items-center px-5">
      <div className="w-full rounded-3xl border border-pine/10 bg-paper p-6 text-center shadow-[var(--shadow-card)]">
        <h1 className="text-xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-stone">{description}</p>
        <ChevronRight aria-hidden="true" className="mx-auto mt-5 size-5 text-pine" />
      </div>
    </main>
  );
}
