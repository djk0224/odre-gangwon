"use client";

import { useEffect, useState } from "react";
import { CloudRain, Sun } from "lucide-react";
import {
  fetchMidWeatherForecast,
  fetchShortWeatherForecast,
} from "@/services/externalDataClient";
import type { MidWeatherSnapshot, WeatherSnapshot } from "@/types/externalData";
import { TravelCardShell, travelCardClass } from "@/components/ui/TravelCard";

interface CareWeatherPanelProps {
  regionLabel?: string;
  /** false면 API 호출·UI 모두 숨김 (일정 없을 때) */
  enabled?: boolean;
}

export function CareWeatherPanel({
  regionLabel = "강원",
  enabled = true,
}: CareWeatherPanelProps) {
  const [shortForecast, setShortForecast] = useState<WeatherSnapshot | null>(null);
  const [midForecast, setMidForecast] = useState<MidWeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setShortForecast(null);
      setMidForecast(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([fetchShortWeatherForecast(), fetchMidWeatherForecast()])
      .then(([shortWeather, midWeather]) => {
        if (cancelled) return;
        setShortForecast(shortWeather);
        setMidForecast(midWeather);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled) {
    return null;
  }

  if (loading) {
    return (
      <TravelCardShell>
        <div className="p-4 text-sm text-stone">날씨 정보를 불러오는 중…</div>
      </TravelCardShell>
    );
  }

  if (!shortForecast && !midForecast) {
    return null;
  }

  const rainy =
    shortForecast?.skyLabel.includes("비") ||
    shortForecast?.skyLabel.includes("눈") ||
    midForecast?.landForecast.includes("비");

  return (
    <TravelCardShell>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-pine/8 text-pine">
            {rainy ? (
              <CloudRain aria-hidden="true" className="size-5" />
            ) : (
              <Sun aria-hidden="true" className="size-5" />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className={travelCardClass.eyebrow}>날씨 · {regionLabel}</p>
            {shortForecast ? (
              <p className="mt-1 text-base font-semibold text-ink">
                단기 {shortForecast.skyLabel}
                {shortForecast.temperatureC !== undefined
                  ? ` · ${shortForecast.temperatureC}°C`
                  : ""}
                {shortForecast.windSpeedMs !== undefined
                  ? ` · 풍속 ${shortForecast.windSpeedMs}m/s`
                  : ""}
              </p>
            ) : null}
            {midForecast ? (
              <p className="mt-2 text-sm leading-6 text-stone">
                중기(4~10일) {midForecast.landForecast}
              </p>
            ) : (
              <p className="mt-2 text-sm text-stone">중기예보는 잠시 후 다시 확인해 주세요.</p>
            )}
            {rainy ? (
              <p className="mt-2 text-xs font-medium text-pine">
                강수 예보 — 동굴은 피하고 항구·전망·시장 위주로 조정하는 것을 권장합니다.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </TravelCardShell>
  );
}
