"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultPreferences } from "@/data/mockTravelData";
import type { Itinerary, Place, Region, TripPreferences } from "@/types/travel";

interface TripState {
  preferences: TripPreferences;
  selectedRegion?: Region;
  selectedPlaces: Place[];
  itinerary?: Itinerary;
  savedItineraries: Itinerary[];
  setPreferences: (preferences: TripPreferences) => void;
  setSelectedRegion: (region: Region) => void;
  togglePlace: (place: Place) => void;
  setItinerary: (itinerary: Itinerary) => void;
  saveCurrentItinerary: () => boolean;
  loadItinerary: (itinerary: Itinerary) => void;
  resetTrip: () => void;
}

export const useTripStore = create<TripState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      selectedPlaces: [],
      savedItineraries: [],
      setPreferences: (preferences) => set({ preferences }),
      setSelectedRegion: (selectedRegion) =>
        set({ selectedRegion, selectedPlaces: [], itinerary: undefined }),
      togglePlace: (place) =>
        set((state) => {
          const exists = state.selectedPlaces.some((selected) => selected.id === place.id);
          return {
            selectedPlaces: exists
              ? state.selectedPlaces.filter((selected) => selected.id !== place.id)
              : [...state.selectedPlaces, place],
          };
        }),
      setItinerary: (itinerary) => set({ itinerary }),
      saveCurrentItinerary: () => {
        const current = get().itinerary;
        if (!current) return false;

        set((state) => {
          const withoutDuplicate = state.savedItineraries.filter(
            (item) => item.id !== current.id,
          );
          return {
            savedItineraries: [
              { ...current, id: `${current.id}-${Date.now()}` },
              ...withoutDuplicate,
            ].slice(0, 8),
          };
        });

        return true;
      },
      loadItinerary: (itinerary) => set({ itinerary }),
      resetTrip: () =>
        set({
          preferences: defaultPreferences,
          selectedRegion: undefined,
          selectedPlaces: [],
          itinerary: undefined,
        }),
    }),
    {
      name: "odre-trip-store",
      partialize: (state) => ({
        preferences: state.preferences,
        savedItineraries: state.savedItineraries,
      }),
    },
  ),
);
