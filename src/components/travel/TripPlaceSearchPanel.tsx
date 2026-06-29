"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { RecommendationCard } from "@/components/travel/RecommendationCard";
import { SearchField } from "@/components/ui/SearchField";
import { getCatalogPlaces } from "@/services/placeGeocodeService";
import { searchPlacesWithAiRecommendation } from "@/services/aiRecommendationService";
import { inferEmotionLineFromName } from "@/lib/placeRecommendationCopy";
import type { Place, SelectionIntent, TripPreferences } from "@/types/travel";

interface TripPlaceSearchPanelProps {
  preferences: TripPreferences;
  selectedIntents: Record<string, SelectionIntent>;
  onPickIntent: (placeId: string, intent: SelectionIntent) => void;
  onOpenDetail: (placeId: string) => void;
  onSearchingChange?: (active: boolean) => void;
  onOpenFullSearch?: () => void;
}

export function TripPlaceSearchPanel({
  preferences,
  selectedIntents,
  onPickIntent,
  onOpenDetail,
  onSearchingChange,
  onOpenFullSearch,
}: TripPlaceSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiPlaceIds, setAiPlaceIds] = useState<string[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const regionPlaces = useMemo(
    () => getCatalogPlaces().filter((place) => place.region === preferences.zoneId),
    [preferences.zoneId],
  );

  const keywordResults = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return [];

    return regionPlaces.filter(
      (place) =>
        place.name.toLowerCase().includes(keyword) ||
        place.description.toLowerCase().includes(keyword) ||
        place.tags.some((tag) => tag.toLowerCase().includes(keyword)),
    );
  }, [query, regionPlaces]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    if (!aiPlaceIds?.length) return keywordResults.slice(0, 24);
    const byId = new Map(regionPlaces.map((place) => [place.id, place]));
    const aiOrdered = aiPlaceIds
      .map((id) => byId.get(id))
      .filter((place): place is Place => Boolean(place));
    const rest = keywordResults.filter((place) => !aiPlaceIds.includes(place.id));
    return [...aiOrdered, ...rest].slice(0, 24);
  }, [aiPlaceIds, keywordResults, query, regionPlaces]);

  useEffect(() => {
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
  }, [preferences, query]);

  const isSearching = query.trim().length > 0;

  useEffect(() => {
    onSearchingChange?.(isSearching);
  }, [isSearching, onSearchingChange]);

  return (
    <section className="space-y-3">
      <SearchField
        onChange={setQuery}
        placeholder="장소 이름·키워드로 검색 (예: 해변, 시장, 카페)"
        value={query}
      />
      {onOpenFullSearch ? (
        <button
          className="text-xs font-medium text-pine underline-offset-2 hover:underline"
          onClick={onOpenFullSearch}
          type="button"
        >
          전체 화면 검색 열기
        </button>
      ) : null}
      {aiLoading ? (
        <p className="flex items-center gap-1.5 text-xs text-pine">
          <Sparkles aria-hidden="true" className="size-3.5" />
          AI가 검색 결과를 정리하는 중…
        </p>
      ) : aiSummary && isSearching ? (
        <p className="text-xs leading-5 text-stone">{aiSummary}</p>
      ) : null}

      {isSearching ? (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-ink">
            검색 결과 {results.length > 0 ? `(${results.length})` : ""}
          </p>
          {results.length === 0 ? (
            <p className="rounded-xl border border-pine/10 bg-paper px-4 py-6 text-center text-sm text-stone">
              검색 결과가 없습니다. 다른 키워드로 시도해 보세요.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {results.map((place) => (
                <RecommendationCard
                  key={place.id}
                  placeId={place.id}
                  title={place.name}
                  emotionLine={inferEmotionLineFromName(place.name)}
                  badges={place.tags.slice(0, 3)}
                  gradient={place.gradient}
                  imageUrl={place.imageUrl}
                  selectionIntent={selectedIntents[place.id] ?? null}
                  onMustGo={() => onPickIntent(place.id, "must_go")}
                  onLike={() => onPickIntent(place.id, "interested")}
                  onSkip={() => onPickIntent(place.id, "exclude")}
                  onOpenDetail={() => onOpenDetail(place.id)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
