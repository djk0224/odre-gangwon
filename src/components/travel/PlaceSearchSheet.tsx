"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { PlaceListCard } from "@/components/travel/PlaceListCard";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import { searchPlacesWithAiRecommendation } from "@/services/aiRecommendationService";
import { useTripStore } from "@/stores/tripStore";
import type { Place, SelectionIntent, TripPreferences } from "@/types/travel";

interface PlaceSearchSheetProps {
  open: boolean;
  preferences: TripPreferences;
  onClose: () => void;
  onOpenPlace: (placeId: string) => void;
  /** 일정 선택 플로우: 검색 결과에서 바로 선택 반영 */
  selectionMode?: boolean;
  onPickInterested?: (placeId: string) => void;
  onPickMustGo?: (placeId: string) => void;
  selectedPlaceIds?: string[];
  selectedIntents?: Record<string, SelectionIntent>;
}

export function PlaceSearchSheet({
  open,
  preferences,
  onClose,
  onOpenPlace,
  selectionMode = false,
  onPickInterested,
  onPickMustGo,
  selectedIntents = {},
}: PlaceSearchSheetProps) {
  const [query, setQuery] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiPlaceIds, setAiPlaceIds] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const trackBehavior = useTripStore((state) => state.trackBehavior);

  const regionPlaces = useMemo(
    () => getCatalogPlaces().filter((place) => place.region === preferences.zoneId),
    [preferences.zoneId],
  );

  const keywordResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return regionPlaces;

    return regionPlaces.filter(
      (place) =>
        place.name.toLowerCase().includes(keyword) ||
        place.description.toLowerCase().includes(keyword) ||
        place.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    );
  }, [query, regionPlaces]);

  const results = useMemo(() => {
    if (!aiPlaceIds?.length) return keywordResults;
    const byId = new Map(regionPlaces.map((place) => [place.id, place]));
    const aiOrdered = aiPlaceIds
      .map((id) => byId.get(id))
      .filter((place): place is Place => Boolean(place));
    const rest = keywordResults.filter((place) => !aiPlaceIds.includes(place.id));
    return [...aiOrdered, ...rest];
  }, [aiPlaceIds, keywordResults, regionPlaces]);

  useEffect(() => {
    if (!open) {
      setAiSummary("");
      setAiPlaceIds(null);
      return;
    }

    const keyword = query.trim();
    if (keyword.length < 2) {
      setAiSummary("");
      setAiPlaceIds(null);
      return;
    }

    const timer = window.setTimeout(() => {
      setAiLoading(true);
      searchPlacesWithAiRecommendation(keyword, preferences)
        .then((result) => {
          setAiPlaceIds(result.placeIds);
          setAiSummary(result.summary);
        })
        .catch(() => {
          setAiPlaceIds(null);
          setAiSummary("");
        })
        .finally(() => setAiLoading(false));
    }, 480);

    return () => window.clearTimeout(timer);
  }, [open, query, preferences, trackBehavior]);

  if (!open) return null;

  function handleOpenPlace(placeId: string) {
    onClose();
    setQuery("");
    setAiSummary("");
    setAiPlaceIds(null);
    onOpenPlace(placeId);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-4 pb-24 pt-10">
      <div className="max-h-[82vh] w-full max-w-[430px] overflow-hidden rounded-t-3xl bg-ivory shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between border-b border-pine/10 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">Search</p>
            <h2 className="text-lg font-semibold text-ink">장소 검색</h2>
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

        <div className="border-b border-pine/10 px-5 py-3">
          <div className="flex items-center gap-2 rounded-full border border-pine/10 bg-paper px-4 py-2.5">
            <Search aria-hidden="true" className="size-4 text-pine" />
            <input
              autoFocus
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-stone"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="비 오는 날 실내 코스, 맛집…"
              value={query}
            />
          </div>
          {aiLoading ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-pine">
              <Sparkles aria-hidden="true" className="size-3.5" />
              AI가 장소를 찾는 중…
            </p>
          ) : aiSummary ? (
            <p className="mt-2 text-xs leading-5 text-stone">{aiSummary}</p>
          ) : null}
        </div>

        <ul className="max-h-[58vh] space-y-2 overflow-y-auto px-5 py-4">
          {results.length === 0 ? (
            <li className="py-8 text-center text-sm text-stone">검색 결과가 없습니다.</li>
          ) : (
            results.map((place: Place) => (
              <li className="space-y-2" key={place.id}>
                <PlaceListCard onOpen={handleOpenPlace} place={place} />
                {selectionMode && (onPickInterested || onPickMustGo) ? (
                  <div className="grid grid-cols-2 gap-2">
                    {onPickMustGo ? (
                      <button
                        className="rounded-full border border-pine bg-pine py-2 text-xs font-semibold text-ivory"
                        onClick={() => {
                          onPickMustGo(place.id);
                          onClose();
                        }}
                        type="button"
                      >
                        {selectedIntents[place.id] === "must_go" ? "꼭 갈래요 ✓" : "꼭 갈래요"}
                      </button>
                    ) : null}
                    {onPickInterested ? (
                      <button
                        className="rounded-full border border-pine/15 py-2 text-xs font-semibold text-pine"
                        onClick={() => {
                          onPickInterested(place.id);
                          onClose();
                        }}
                        type="button"
                      >
                        {selectedIntents[place.id] === "interested" ? "가고 싶어요 ✓" : "가고 싶어요"}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
