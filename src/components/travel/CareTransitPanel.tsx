"use client";

import { useEffect, useState } from "react";
import { Bus, Train } from "lucide-react";
import { demoTransitHub } from "@/config/demoTransit";
import { fetchTagoArrivals } from "@/services/externalDataClient";
import type { TransitArrivalItem } from "@/types/externalData";
import { PremiumButton } from "@/components/ui/PremiumButton";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";

interface CareTransitPanelProps {
  /** KTX·고속버스 예약 허브(교통 탭) */
  onBookIntercityTransport?: () => void;
}

export function CareTransitPanel({ onBookIntercityTransport }: CareTransitPanelProps) {
  const [arrivals, setArrivals] = useState<TransitArrivalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetchTagoArrivals(demoTransitHub.primaryStop.nodeId)
      .then((arrivalItems) => {
        if (cancelled) return;
        setArrivals(arrivalItems.slice(0, 4));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <TravelCardShell>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pine/8 text-pine">
            <Bus aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className={travelCardClass.eyebrow}>오늘 경로 · 시내버스</p>
            <p className="mt-1 text-base font-semibold text-ink">
              {demoTransitHub.primaryStop.name}
            </p>
            <p className="mt-2 text-xs leading-5 text-stone">
              시내·권역 버스 노선과 도착 정보는 아래 「오늘 경로」에서 확인하세요. KTX·고속버스는
              예약 허브에서 승차권을 예약합니다.
            </p>
            {loading ? (
              <p className="mt-2 text-sm text-stone">버스 도착 정보를 불러오는 중…</p>
            ) : arrivals.length > 0 ? (
              <ul className="mt-2 space-y-1.5 text-sm text-stone">
                {arrivals.map((item, index) => (
                  <li key={`${item.routeName}-${index}`}>
                    {item.routeName}번 · 약 {item.arrivalMinutes}분 후 도착
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-stone">현재 도착 예정 버스가 없습니다.</p>
            )}
            {onBookIntercityTransport ? (
              <PremiumButton
                className="mt-4 w-full"
                onClick={onBookIntercityTransport}
                variant="ghost"
              >
                <Train aria-hidden="true" className="mr-2 size-4" />
                KTX·고속버스 예약
              </PremiumButton>
            ) : null}
          </div>
        </div>
      </div>
    </TravelCardShell>
  );
}
