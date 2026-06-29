"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown } from "lucide-react";
import {
  groupFeasibilityIssuesForDisplay,
  summarizeFeasibilityForCollapsed,
} from "@/lib/feasibilityDisplay";
import type { Itinerary } from "@/types/travel";

interface ItineraryFeasibilityPanelProps {
  itinerary: Itinerary;
  /** 백그라운드 실경로·LLM 보강 진행 중 */
  backgroundEnriching?: boolean;
}

export function ItineraryFeasibilityPanel({
  itinerary,
  backgroundEnriching = false,
}: ItineraryFeasibilityPanelProps) {
  const displayItems = useMemo(
    () => groupFeasibilityIssuesForDisplay(itinerary.feasibilityIssues ?? []),
    [itinerary.feasibilityIssues],
  );
  const hasErrors = displayItems.some(
    (item) =>
      item.kind === "single"
        ? item.issue.severity === "error"
        : item.severity === "error",
  );
  const [expanded, setExpanded] = useState(hasErrors);
  const showPanel = displayItems.length > 0 || backgroundEnriching;
  if (!showPanel) return null;

  const collapsedSummary = summarizeFeasibilityForCollapsed(displayItems);
  const canCollapse = displayItems.length > 1 && !backgroundEnriching;

  return (
    <section className="mx-5 rounded-[var(--radius-card)] border border-pine/12 bg-paper shadow-[var(--shadow-card)]">
      <button
        className="flex w-full items-start gap-2 p-3 text-left"
        disabled={!canCollapse}
        onClick={() => {
          if (canCollapse) setExpanded((value) => !value);
        }}
        type="button"
      >
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 size-4 shrink-0 text-pine"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-ink">실행 검증</p>
            {canCollapse ? (
              <ChevronDown
                aria-hidden="true"
                className={`size-4 shrink-0 text-stone transition-transform ${expanded ? "rotate-180" : ""}`}
              />
            ) : null}
          </div>
          {backgroundEnriching ? (
            <p className="mt-1 text-xs leading-5 text-stone">
              실경로·AI 설명을 백그라운드에서 보강 중입니다.
            </p>
          ) : expanded ? null : (
            <p className="mt-1 text-xs leading-5 text-stone">{collapsedSummary}</p>
          )}
        </div>
      </button>

      {expanded && displayItems.length > 0 ? (
        <ul className="space-y-2 border-t border-pine/8 px-3 pb-3 pt-2 text-xs leading-5 text-stone">
          {displayItems.map((item) => {
            if (item.kind === "single") {
              return (
                <li
                  className={item.issue.severity === "error" ? "text-ink" : undefined}
                  key={item.issue.id}
                >
                  {item.issue.message}
                </li>
              );
            }

            return (
              <li key={item.id}>
                <p className={item.severity === "error" ? "text-ink" : undefined}>
                  {item.summary}
                </p>
                {item.details.length > 1 ? (
                  <p className="mt-0.5 text-[11px] text-stone/90">
                    {item.details.join(" · ")}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
