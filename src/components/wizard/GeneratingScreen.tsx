"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import type { AiProvider } from "@/services/ai/types";

const DEFAULT_STEPS = [
  "권역·이동 거리를 계산하는 중",
  "날씨·혼잡도를 반영하는 중",
  "예약이 필요한 명소를 확인하는 중",
  "식사·휴식 시간을 배치하는 중",
  "로컬 상권·동선을 연결하는 중",
];

const MIN_DISPLAY_MS = 5_000;
/** 생성 API가 20초대일 수 있어 UI 하드캡은 넉넉히 — task 완료 전 조기 이탈 방지 */
const MAX_DISPLAY_MS = 28_000;
const STEP_INTERVAL_MS = 520;

interface GeneratingScreenProps {
  task: () => Promise<{ provider?: AiProvider } | void>;
  onDone: () => void;
  title?: string;
  subtitle?: string;
  steps?: string[];
  /** 변경 시 진행 상태 초기화 */
  runKey?: string | number;
}

const providerLabels: Record<AiProvider, string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  rules: "규칙 기반 엔진",
  "ai+verified": "검증 엔진",
};

export function GeneratingScreen({
  task,
  onDone,
  title = "실행 스타일에 맞는\n맞춤 일정을 준비중입니다.",
  subtitle = "실행 가능한 일정을 먼저 만들고, 설명은 이어서 보강합니다.",
  steps = DEFAULT_STEPS,
  runKey = "default",
}: GeneratingScreenProps) {
  const [progress, setProgress] = useState(8);
  const [activeStep, setActiveStep] = useState(0);
  const [provider, setProvider] = useState<AiProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const taskRef = useRef(task);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    taskRef.current = task;
    onDoneRef.current = onDone;
  }, [task, onDone]);

  useEffect(() => {
    navigatedRef.current = false;
    const startedAt = Date.now();

    const stepTimer = setInterval(() => {
      setActiveStep((current) => (current + 1) % steps.length);
      setProgress((current) => Math.min(current + 6, 92));
    }, STEP_INTERVAL_MS);

    function navigateAway() {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      const elapsed = Date.now() - startedAt;
      const waitMs = Math.max(MIN_DISPLAY_MS - elapsed, 0);
      window.setTimeout(() => onDoneRef.current(), waitMs);
    }

    const hardCapTimer = window.setTimeout(() => {
      if (!navigatedRef.current) {
        setError((current) =>
          current ??
          "일정 구성이 이어지고 있습니다. 완료되면 실행 일정 화면에 표시됩니다.",
        );
        setProgress(100);
        navigateAway();
      }
    }, MAX_DISPLAY_MS);

    void (async () => {
      try {
        const result = await taskRef.current();
        if (result && "provider" in result && result.provider) {
          setProvider(result.provider);
        }
        setProgress(100);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "일정 생성에 실패했습니다.");
        setProgress(100);
      } finally {
        clearInterval(stepTimer);
        window.clearTimeout(hardCapTimer);
        navigateAway();
      }
    })();

    return () => {
      clearInterval(stepTimer);
      window.clearTimeout(hardCapTimer);
    };
  }, [runKey, steps.length]);

  return (
    <main className="flex min-h-[70vh] flex-col items-center justify-center px-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-pine/10 text-pine">
        <CalendarDays aria-hidden="true" className="size-7" />
      </span>
      <h1 className="mt-8 whitespace-pre-line text-2xl font-bold leading-8 text-ink">
        {title}
      </h1>
      <p className="mt-3 text-sm text-stone">{subtitle}</p>

      <div className="mt-8 w-full max-w-xs rounded-2xl border border-pine/10 bg-paper px-4 py-3 text-left">
        <p className="flex items-center gap-2 text-xs font-semibold text-pine">
          <Sparkles aria-hidden="true" className="size-3.5" />
          실행 일정 구성
        </p>
        <ul className="mt-2 space-y-1.5">
          {steps.map((step, index) => (
            <li
              className={`text-sm transition-colors ${
                index === activeStep ? "font-medium text-ink" : "text-stone"
              }`}
              key={step}
            >
              {index === activeStep ? "▸ " : "· "}
              {step}
            </li>
          ))}
        </ul>
        {provider ? (
          <p className="mt-3 text-[11px] text-pine">
            엔진: {providerLabels[provider]}
          </p>
        ) : null}
        {error ? <p className="mt-2 text-xs text-stone">{error}</p> : null}
      </div>

      <div className="mt-10 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-pine/10">
        <div
          className="h-full rounded-full bg-pine transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </main>
  );
}
