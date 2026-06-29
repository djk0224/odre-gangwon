import {
  purposeThemeMap,
  seasonThemeBias,
  seasonThemes,
  travelPurposeOptions,
} from "@/data/mockRegionalFraming";
import { defaultPreferences } from "@/data/mockTravelData";
import type {
  SeasonId,
  TravelPurposeId,
  TripPreferences,
  TripTheme,
} from "@/types/travel";

/** persisted store may still have legacy single `theme` */
type PersistedTripPreferences = Partial<TripPreferences> & {
  theme?: TripTheme;
  themes?: TripTheme[];
};

export function migratePersistedPreferences(
  raw: PersistedTripPreferences | undefined,
): TripPreferences {
  const merged = { ...defaultPreferences, ...raw };
  let themes: TripTheme[] = [];
  if (Array.isArray(merged.themes) && merged.themes.length > 0) {
    themes = merged.themes;
  } else if (raw?.theme) {
    themes = [raw.theme];
  }
  return enrichPreferencesFromRegionalContext({ ...merged, themes });
}

export function getSeasonFromDate(dateIso: string): SeasonId {
  if (!dateIso || dateIso.length < 7) {
    return "summer";
  }
  const month = Number.parseInt(dateIso.slice(5, 7), 10);
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "autumn";
  return "winter";
}

export function getSeasonLabel(season: SeasonId): string {
  return seasonThemes.find((s) => s.id === season)?.label ?? season;
}

export function getPurposeLabel(purpose: TravelPurposeId): string {
  return travelPurposeOptions.find((p) => p.id === purpose)?.label ?? purpose;
}

export function resolveEffectiveThemes(preferences: TripPreferences): TripTheme[] {
  if (Array.isArray(preferences.themes) && preferences.themes.length > 0) {
    return preferences.themes;
  }
  const season = preferences.season ?? getSeasonFromDate(preferences.travelDate);
  const travelPurpose = preferences.travelPurpose ?? "coast";
  return [getSuggestedTheme(season, travelPurpose)];
}

/** 일정·랭킹 기본 테마 (다중 선택 시 첫 번째) */
export function resolveEffectiveTheme(preferences: TripPreferences): TripTheme {
  return resolveEffectiveThemes(preferences)[0];
}

export function getSuggestedTheme(
  season: SeasonId,
  purpose: TravelPurposeId,
): TripTheme {
  return purposeThemeMap[purpose] ?? seasonThemeBias[season];
}

export function enrichPreferencesFromRegionalContext(
  preferences: TripPreferences,
): TripPreferences {
  const season =
    preferences.season ?? getSeasonFromDate(preferences.travelDate);
  const travelPurpose = preferences.travelPurpose ?? "coast";
  const zoneId = preferences.zoneId ?? "samcheok-donghae";
  const themes =
    Array.isArray(preferences.themes) && preferences.themes.length > 0
      ? preferences.themes
      : [getSuggestedTheme(season, travelPurpose)];

  return {
    ...preferences,
    season,
    travelPurpose,
    zoneId,
    themes,
  };
}

export function formatRegionalSummary(preferences: TripPreferences): string {
  const season = getSeasonLabel(preferences.season);
  const purpose = getPurposeLabel(preferences.travelPurpose);
  return `${season} · ${purpose}`;
}
