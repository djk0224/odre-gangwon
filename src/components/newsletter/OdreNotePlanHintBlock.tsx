"use client";

import type { OdreNotePlanHint } from "@/data/odreNotePlanHints";
import { cn } from "@/lib/utils";

interface OdreNotePlanHintBlockProps {
  hint: OdreNotePlanHint;
  className?: string;
  /** trip 플로우 — 장소 pre-fill 안내 한 줄 */
  matchedPlaceCount?: number;
}

/** B안 — 「이 글로 걸을 거리」 (서술형, travelMemo 미노출) */
export function OdreNotePlanHintBlock({
  hint,
  className,
  matchedPlaceCount,
}: OdreNotePlanHintBlockProps) {
  return (
    <section
      className={cn(
        "space-y-2 rounded-2xl border border-pine/10 bg-paper/70 px-4 py-4",
        className,
      )}
    >
      <p className="text-xs font-semibold tracking-[0.08em] text-pine">이 글로 걸을 거리</p>
      {hint.lines.filter((line) => line.trim()).map((line, index) => (
        <p key={index} className="text-sm leading-[1.75] text-ink/90">
          {line}
        </p>
      ))}
      {matchedPlaceCount !== undefined && matchedPlaceCount > 0 ? (
        <p className="pt-1 text-[11px] leading-5 text-stone">
          글에 담긴 장소 {matchedPlaceCount}곳이 일정에 미리 담겨 있어요.
        </p>
      ) : null}
    </section>
  );
}
