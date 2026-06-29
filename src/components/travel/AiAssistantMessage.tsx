"use client";

import type { AiChatDisplayBlocks, AiChatPhase } from "@/services/ai/types";

export function AiAssistantMessage({
  blocks,
  phase,
}: {
  blocks: AiChatDisplayBlocks;
  phase: AiChatPhase;
}) {
  const showDays = phase === "propose" || phase === "refine";
  const tipsAreLines = !showDays && blocks.tips.length > 0;

  return (
    <div className="space-y-3 text-sm leading-6 text-ink">
      {blocks.headline ? (
        <p className="font-semibold leading-snug text-ink">{blocks.headline}</p>
      ) : null}

      {showDays
        ? blocks.days.map((day) => (
            <section
              className="rounded-xl border border-pine/10 bg-ivory/80 px-3 py-2.5"
              key={day.label}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-pine">
                {day.label}
              </p>
              <ul className="mt-2 space-y-2">
                {day.items.map((item, index) => (
                  <li
                    className="flex gap-2 text-[13px] leading-5 text-ink/90"
                    key={`${day.label}-${index}`}
                  >
                    <span
                      aria-hidden="true"
                      className="mt-1.5 size-1 shrink-0 rounded-full bg-pine/50"
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))
        : null}

      {blocks.sources && blocks.sources.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {blocks.sources.map((source) => (
            <span
              className="rounded-full border border-pine/12 bg-ivory px-2 py-0.5 text-[10px] font-medium text-stone"
              key={source.id}
              title={source.kind}
            >
              {source.label}
            </span>
          ))}
        </div>
      ) : null}

      {blocks.tips.length > 0 ? (
        <section
          className={`rounded-xl px-3 py-2.5 ${
            phase === "confirm" ? "border border-pine/15 bg-pine/6" : "bg-pine/6"
          }`}
        >
          {phase === "confirm" ? (
            <p className="text-xs font-semibold text-pine">여행 조건</p>
          ) : (
            <p className="text-xs font-semibold text-pine">
              {tipsAreLines ? "안내" : "여행 팁"}
            </p>
          )}
          <ul className="mt-1.5 space-y-1.5">
            {blocks.tips.map((tip, index) => (
              <li className="text-[13px] leading-5 text-stone" key={`tip-${index}`}>
                {tip}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
