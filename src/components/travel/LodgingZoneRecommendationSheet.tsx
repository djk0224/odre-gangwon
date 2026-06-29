"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";

export interface LodgingZoneSuggestion {
  id: string;
  zoneLabel: string;
  summary: string;
}

interface LodgingZoneRecommendationSheetProps {
  open: boolean;
  onClose: () => void;
  suggestions: LodgingZoneSuggestion[];
  onChoose: (suggestion: LodgingZoneSuggestion) => void;
}

export function LodgingZoneRecommendationSheet({
  open,
  onClose,
  suggestions,
  onChoose,
}: LodgingZoneRecommendationSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="숙박 권역 추천"
      subtitle="선택한 장소를 기준으로 숙박 거점을 먼저 제안합니다."
      eyebrow="Lodging Zone"
    >
      <LodgingZoneRecommendationView suggestions={suggestions} onChoose={onChoose} onClose={onClose} />
    </BottomSheet>
  );
}

interface LodgingZoneRecommendationViewProps {
  suggestions: LodgingZoneSuggestion[];
  onChoose: (suggestion: LodgingZoneSuggestion) => void;
  onClose: () => void;
}

export function LodgingZoneRecommendationView({
  suggestions,
  onChoose,
  onClose,
}: LodgingZoneRecommendationViewProps) {
  return (
    <div className="space-y-3 px-5 pb-6">
      {suggestions.map((item) => (
        <button
          className="w-full rounded-2xl border border-pine/10 bg-paper px-4 py-3 text-left"
          key={item.id}
          onClick={() => onChoose(item)}
          type="button"
        >
          <p className="text-sm font-semibold text-ink">{item.zoneLabel}</p>
          <p className="mt-1 text-xs leading-5 text-stone">{item.summary}</p>
        </button>
      ))}
      <PremiumButton className="w-full" onClick={onClose} variant="ghost">
        나중에 선택할게요
      </PremiumButton>
    </div>
  );
}
