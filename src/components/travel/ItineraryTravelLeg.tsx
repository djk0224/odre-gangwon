interface ItineraryTravelLegProps {
  label: string;
}

/** 카드 사이 이동 구간 (차량/대중교통 · 소요 시간) */
export function ItineraryTravelLeg({ label }: ItineraryTravelLegProps) {
  return (
    <div className="my-2 flex w-full justify-center">
      <p className="inline-flex max-w-[min(100%,18rem)] items-center justify-center rounded-full bg-pine/6 px-2.5 py-0.5 text-center text-[10px] font-medium leading-snug text-pine">
        {label}
      </p>
    </div>
  );
}
