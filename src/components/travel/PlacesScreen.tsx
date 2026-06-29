"use client";

import { useEffect, useMemo, useState } from "react";
import { PlaceListCard } from "@/components/travel/PlaceListCard";
import { PreferenceChip } from "@/components/ui/PreferenceChip";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { travelZoneShortLabels } from "@/config/tourZoneSigungu";
import { themeOptions } from "@/data/mockTravelData";
import {
  getPlaceInterestCategories,
  placeMatchesInterestFilter,
} from "@/lib/placeInterests";
import { getTripThemeLabel, toggleTripTheme } from "@/lib/tripThemes";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import { useTripStore } from "@/stores/tripStore";
import type { TripPreferences, TripTheme } from "@/types/travel";

export type PlacesScreenMode = "category" | "saved";

interface PlacesScreenProps {
  preferences: TripPreferences;
  mode?: PlacesScreenMode;
  onGoHome: () => void;
  onOpenPlace: (placeId: string) => void;
}

export function PlacesScreen({
  preferences,
  mode = "category",
  onGoHome,
  onOpenPlace,
}: PlacesScreenProps) {
  const [activeThemes, setActiveThemes] = useState<TripTheme[]>(preferences.themes);
  const [saveHint, setSaveHint] = useState("");
  const savedPlaceIds = useTripStore((state) => state.savedPlaceIds);
  const isSavedView = mode === "saved";

  const regionPlaces = useMemo(
    () => getCatalogPlaces().filter((place) => place.region === preferences.zoneId),
    [preferences.zoneId],
  );
  const zoneLabel = travelZoneShortLabels[preferences.zoneId];

  const categoryTabs = useMemo(() => {
    const counts = new Map<TripTheme, number>();
    for (const place of regionPlaces) {
      for (const theme of getPlaceInterestCategories(place)) {
        counts.set(theme, (counts.get(theme) ?? 0) + 1);
      }
    }
    return themeOptions
      .filter((option) => (counts.get(option.id) ?? 0) > 0)
      .map((option) => ({
        id: option.id,
        label: option.label,
        count: counts.get(option.id) ?? 0,
      }));
  }, [regionPlaces]);

  const categoryTabKey = categoryTabs.map((tab) => tab.id).join(",");

  useEffect(() => {
    if (preferences.themes.length > 0) {
      setActiveThemes(preferences.themes);
    }
  }, [preferences.themes]);

  useEffect(() => {
    if (categoryTabs.length === 0) {
      setActiveThemes([]);
      return;
    }
    setActiveThemes((current) => {
      const valid = current.filter((theme) =>
        categoryTabs.some((tab) => tab.id === theme),
      );
      if (valid.length > 0) return valid;
      return [categoryTabs[0].id];
    });
  }, [preferences.zoneId, categoryTabKey, categoryTabs]);

  const savedPlaces = useMemo(
    () =>
      savedPlaceIds
        .map((id) => getCatalogPlaces().find((place) => place.id === id))
        .filter((place): place is (typeof regionPlaces)[number] => Boolean(place)),
    [savedPlaceIds],
  );

  const displayPlaces = useMemo(() => {
    if (isSavedView) return savedPlaces;
    return regionPlaces.filter((place) => placeMatchesInterestFilter(place, activeThemes));
  }, [isSavedView, savedPlaces, regionPlaces, activeThemes]);

  const activeCategoryLabel =
    activeThemes.length > 0
      ? activeThemes.map((theme) => getTripThemeLabel(theme)).join(" · ")
      : "";

  function handleToggleTheme(theme: TripTheme) {
    setActiveThemes((current) => toggleTripTheme(current, theme));
  }

  function handleToggleSaveHint() {
    setSaveHint(isSavedView ? "찜 목록에서 제거했어요." : "찜에 담았어요.");
    window.setTimeout(() => setSaveHint(""), 2000);
  }

  return (
    <main className="space-y-5 pb-8 pt-2">
      <section className="px-5">
        <SectionHeader
          description={
            isSavedView
              ? `전체 권역 · 찜 ${savedPlaces.length}곳`
              : `${zoneLabel} 권역 · 홈에서 고른 권역 기준 · 카테고리별 탐색 (복수 선택)`
          }
          eyebrow="Places"
          title={isSavedView ? "찜한 곳" : "장소 탐색"}
        />
      </section>

      {!isSavedView && categoryTabs.length > 0 ? (
        <div className="-mx-1 overflow-x-auto px-5 pb-1">
          <div className="flex w-max flex-wrap gap-2">
            {categoryTabs.map((tab) => (
              <PreferenceChip
                key={tab.id}
                onClick={() => handleToggleTheme(tab.id)}
                selected={activeThemes.includes(tab.id)}
              >
                {tab.label}
                <span className="ml-1.5 text-xs opacity-80">{tab.count}</span>
              </PreferenceChip>
            ))}
          </div>
        </div>
      ) : null}

      <section className="space-y-3 px-5">
        {!isSavedView ? (
          <p className="text-xs text-stone">
            {activeCategoryLabel
              ? `${activeCategoryLabel} · ${displayPlaces.length}곳`
              : "카테고리를 선택해 주세요"}
          </p>
        ) : null}

        {saveHint ? (
          <p className="rounded-2xl bg-pine/8 px-4 py-2 text-center text-sm text-pine">
            {saveHint}
          </p>
        ) : null}

        {displayPlaces.length === 0 ? (
          <div className="rounded-3xl bg-ivory px-5 py-10 text-center">
            <p className="text-sm text-stone">
              {isSavedView
                ? "찜한 장소가 없습니다. 탐색에서 하트를 눌러 담아 보세요."
                : "선택한 카테고리에 맞는 장소가 없습니다. 다른 카테고리를 골라 보세요."}
            </p>
          </div>
        ) : (
          displayPlaces.map((place) => (
            <PlaceListCard
              key={place.id}
              onOpen={() => onOpenPlace(place.id)}
              onToggleSave={handleToggleSaveHint}
              place={place}
            />
          ))
        )}
      </section>

      <div className="px-5">
        <PremiumButton className="w-full" onClick={onGoHome} variant="ghost">
          홈으로
        </PremiumButton>
      </div>
    </main>
  );
}
