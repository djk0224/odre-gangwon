"use client";

import { useEffect, useMemo, useState } from "react";
import { demoTransitHub } from "@/config/demoTransit";
import {
  filterTransportArrivals,
  filterTransportRoutes,
} from "@/lib/reservationHubSearch";
import { fetchTagoArrivals, fetchTagoRoutes } from "@/services/externalDataClient";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";
import type { TransitArrivalItem } from "@/types/externalData";

interface TagoRouteRow {
  routeid: string;
  routeno: number | string;
  routetp: string;
  startnodenm: string;
  endnodenm: string;
}

interface LocalTransitRoutePanelProps {
  searchQuery?: string;
  /** 경로·케어 화면에 임베드할 때 간결한 헤더 */
  embedded?: boolean;
}

/** 시내·권역 버스(TAGO) — 일정·케어 경로 맥락. KTX·고속버스 예약은 예약 허브 교통 탭. */
export function LocalTransitRoutePanel({
  searchQuery = "",
  embedded = false,
}: LocalTransitRoutePanelProps) {
  const [routes, setRoutes] = useState<TagoRouteRow[]>([]);
  const [arrivals, setArrivals] = useState<TransitArrivalItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    Promise.all([
      fetchTagoRoutes(embedded ? 8 : 12),
      fetchTagoArrivals(demoTransitHub.primaryStop.nodeId),
    ])
      .then(([routeItems, arrivalItems]) => {
        if (cancelled) return;
        setRoutes(routeItems as TagoRouteRow[]);
        setArrivals(arrivalItems);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [embedded]);

  const filteredArrivals = useMemo(
    () => filterTransportArrivals(arrivals, searchQuery),
    [arrivals, searchQuery],
  );
  const filteredRoutes = useMemo(
    () => filterTransportRoutes(routes, searchQuery),
    [routes, searchQuery],
  );
  const hasSearch = searchQuery.trim().length > 0;

  return (
    <section className="space-y-4" id="route-local-transit">
      {!embedded ? (
        <p className="text-sm text-stone">
          국토교통부 TAGO 실시간 데이터 · {demoTransitHub.cityLabel} 권역 시내·권역 버스
        </p>
      ) : null}

      <TravelCardShell>
        <div className="p-4">
          <p className={travelCardClass.eyebrow}>경로 연동 · 시내버스</p>
          <h3 className="mt-1 text-base font-semibold text-ink">
            {demoTransitHub.primaryStop.name}
          </h3>
          <p className="mt-2 text-xs leading-5 text-stone">
            오늘 일정 동선 기준으로 가까운 정류장 도착 정보입니다. KTX·고속버스는 예약 허브
            「교통」에서 예약하세요.
          </p>
          {loading ? (
            <p className="mt-2 text-sm text-stone">불러오는 중…</p>
          ) : filteredArrivals.length > 0 ? (
            <ul className="mt-3 space-y-2">
              {filteredArrivals.map((item, index) => (
                <li
                  className="rounded-lg border border-pine/10 bg-paper px-3 py-2 text-sm"
                  key={`${item.routeName}-${index}`}
                >
                  <span className="font-semibold text-ink">{item.routeName}번</span>
                  <span className="text-stone"> · 약 {item.arrivalMinutes}분 후</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-stone">
              {hasSearch ? "검색 결과가 없습니다." : "현재 표시할 도착 예정 버스가 없습니다."}
            </p>
          )}
        </div>
      </TravelCardShell>

      <SectionHeader
        description="일정 경로에서 이동할 때 참고할 시내·권역 노선입니다."
        title="시내·권역 노선"
      />
      {loading ? (
        <p className="text-center text-sm text-stone">노선 목록을 불러오는 중…</p>
      ) : filteredRoutes.length === 0 ? (
        <p className="text-center text-sm text-stone">
          {hasSearch ? "검색 결과가 없습니다." : "표시할 노선이 없습니다."}
        </p>
      ) : (
        filteredRoutes.map((route) => (
          <TravelCardShell key={route.routeid}>
            <div className="p-4">
              <p className="text-sm font-semibold text-ink">
                {route.routeno}번 · {route.routetp}
              </p>
              <p className="mt-1 text-xs text-stone">
                {route.startnodenm} → {route.endnodenm}
              </p>
            </div>
          </TravelCardShell>
        ))
      )}
    </section>
  );
}
