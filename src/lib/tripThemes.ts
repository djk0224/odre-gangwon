import { themeOptions } from "@/data/mockTravelData";
import type { TripTheme } from "@/types/travel";

export const TRIP_THEME_ORDER: TripTheme[] = themeOptions.map((option) => option.id);

const themeLabelMap = Object.fromEntries(
  themeOptions.map((option) => [option.id, option.label]),
) as Record<TripTheme, string>;

export function getTripThemeLabel(theme: TripTheme): string {
  return themeLabelMap[theme];
}

export function formatTripThemesLabel(themes: TripTheme[]): string {
  if (themes.length === 0) return "관심 카테고리";
  return themes.map((theme) => getTripThemeLabel(theme)).join(" · ");
}

export function toggleTripTheme(
  current: TripTheme[],
  theme: TripTheme,
): TripTheme[] {
  if (current.includes(theme)) {
    const next = current.filter((item) => item !== theme);
    return next.length > 0 ? next : current;
  }
  return [...current, theme];
}

export function tripThemesEqual(a: TripTheme[], b: TripTheme[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((theme, index) => theme === sortedB[index]);
}
