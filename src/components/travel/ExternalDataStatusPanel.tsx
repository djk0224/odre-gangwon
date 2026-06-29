"use client";

import { useEffect, useState } from "react";
import {
  fetchDataSourceStatus,
  type ExternalDataStatusPayload,
} from "@/services/externalDataClient";

export function ExternalDataStatusPanel() {
  const [status, setStatus] = useState<ExternalDataStatusPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDataSourceStatus()
      .then((payload) => {
        if (!cancelled) setStatus(payload);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "상태 조회 실패");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return <p className="text-xs text-stone">{error}</p>;
  }

  if (!status) {
    return <p className="text-xs text-stone">외부 데이터 연결 상태 확인 중…</p>;
  }

  const configuredCount = status.sources.filter((source) => source.configured).length;
  const execution = status.execution;
  const datalab = execution?.datalabSnapshot;

  return (
    <div className="space-y-2 text-xs text-stone">
      <p>
        API 키 설정 {configuredCount}/{status.sources.length} · Kakao REST{" "}
        {execution?.kakaoRestConfigured ? "연결" : "미설정"} · LLM{" "}
        {execution?.llmConfigured ? "연결" : "미설정"}
      </p>
      {datalab ? (
        <p>
          관광빅데이터 스냅샷 · 시군 {datalab.sigunguCount}개 · {datalab.fetchedAt.slice(0, 10)}
        </p>
      ) : (
        <p>관광빅데이터 스냅샷 없음 — npm run refresh:datalab-gangwon</p>
      )}
    </div>
  );
}
