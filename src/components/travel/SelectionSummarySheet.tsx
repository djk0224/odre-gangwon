"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PremiumButton } from "@/components/ui/PremiumButton";

interface SelectionSummarySheetProps {
  open: boolean;
  onClose: () => void;
  selectedCount: number;
  mustGoCount: number;
  deferredCount: number;
  estimatedTravelMinutes: number;
  onConfirm: () => void;
}

export function SelectionSummarySheet({
  open,
  onClose,
  selectedCount,
  mustGoCount,
  deferredCount,
  estimatedTravelMinutes,
  onConfirm,
}: SelectionSummarySheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="선택 요약"
      subtitle="사용자 선택은 유지하고, AI가 순서·시간대·혼잡 회피를 최적화합니다."
      eyebrow="Selection"
    >
      <SelectionSummaryView
        selectedCount={selectedCount}
        mustGoCount={mustGoCount}
        deferredCount={deferredCount}
        estimatedTravelMinutes={estimatedTravelMinutes}
        onConfirm={onConfirm}
      />
    </BottomSheet>
  );
}

interface SelectionSummaryViewProps {
  selectedCount: number;
  mustGoCount: number;
  deferredCount: number;
  estimatedTravelMinutes: number;
  onConfirm: () => void;
}

export function SelectionSummaryView({
  selectedCount,
  mustGoCount,
  deferredCount,
  estimatedTravelMinutes,
  onConfirm,
}: SelectionSummaryViewProps) {
  return (
    <div className="space-y-3 px-5 pb-6">
      <SummaryLine label="선택 장소" value={`${selectedCount}곳`} />
      <SummaryLine label="꼭 갈래요" value={`${mustGoCount}곳`} />
      <SummaryLine label="시간 부족 시 이월(Deferred)" value={`${deferredCount}곳`} />
      <SummaryLine label="예상 총 이동시간" value={`약 ${estimatedTravelMinutes}분`} />
      <PremiumButton className="w-full" onClick={onConfirm}>
        이 선택으로 일정 최적화
      </PremiumButton>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-pine/10 bg-paper px-4 py-3">
      <span className="text-sm text-stone">{label}</span>
      <span className="text-sm font-semibold text-ink">{value}</span>
    </div>
  );
}
