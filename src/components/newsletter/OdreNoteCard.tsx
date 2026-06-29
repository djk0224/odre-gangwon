"use client";

import Image from "next/image";
import { ChevronRight } from "lucide-react";
import {
  formatOdreNotePubDate,
  getOdreNoteHeroImage,
  getOdreNoteZoneLabel,
  formatOdreNoteEventPeriodLabel,
  getOdreNoteEventPeriodBadge,
  type OdreNote,
} from "@/data/odreNotes";
import { cn } from "@/lib/utils";

interface OdreNoteCardProps {
  note: OdreNote;
  featured?: boolean;
  onOpen: () => void;
}

function toneLabel(tone: OdreNote["tone"]): string {
  switch (tone) {
    case "news-hook":
      return "소식";
    case "scene":
      return "장면";
    case "myth-flip":
      return "다시 보기";
    case "traveler":
      return "여행자";
    case "local-context":
      return "맥락";
    case "column":
      return "칼럼";
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

export function OdreNoteCard({ note, featured = false, onOpen }: OdreNoteCardProps) {
  const zoneLabel = getOdreNoteZoneLabel(note.zones);
  const pubDateLabel = formatOdreNotePubDate(note.source?.pubDate);
  const eventPeriodLabel = formatOdreNoteEventPeriodLabel(note.eventPeriod);
  const eventStatus = getOdreNoteEventPeriodBadge(note.eventPeriod);
  const heroImage = getOdreNoteHeroImage(note);

  return (
    <article
      className={cn(
        "overflow-hidden rounded-3xl border border-pine/10 bg-paper/60",
        featured && "border-pine/20 bg-paper/80 shadow-sm",
      )}
    >
      {heroImage ? (
        <button className="relative block aspect-[16/10] w-full overflow-hidden bg-pine/8" onClick={onOpen} type="button">
          <Image
            alt=""
            className="object-cover transition-transform duration-500 hover:scale-[1.02]"
            fill
            sizes="(max-width: 430px) 100vw, 430px"
            src={heroImage}
          />
        </button>
      ) : null}

      <button
        className={cn("w-full p-4 text-left", featured && "p-5", heroImage && "pt-4")}
        onClick={onOpen}
        type="button"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {note.layout === "news-label" && (
              <span className="rounded-full bg-ink/8 px-2.5 py-1 text-[11px] font-semibold text-ink">
                소식
              </span>
            )}
            <span className="rounded-full bg-pine/10 px-2.5 py-1 text-[11px] font-semibold text-pine">
              {zoneLabel}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-stone">
              {toneLabel(note.tone)}
            </span>
          </div>
        </div>

        {eventPeriodLabel ? (
          <p className="mt-3 text-[11px] font-semibold text-pine">
            {eventStatus ? `${eventStatus} · ` : ""}행사 기간 · {eventPeriodLabel}
          </p>
        ) : pubDateLabel ? (
          <p className="mt-3 text-[11px] font-semibold text-pine">소식 작성일 · {pubDateLabel}</p>
        ) : null}
        <p
          className={cn(
            "text-[11px] leading-5 text-stone",
            eventPeriodLabel || pubDateLabel ? "mt-1" : "mt-3",
          )}
        >
          {note.sourceLine}
        </p>
        <p className={cn("mt-2 font-semibold text-ink", featured ? "text-lg" : "text-[15px]")}>
          {note.title}
        </p>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-stone">{note.lead}</p>

        <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-pine">
          전문 읽기
          <ChevronRight className="size-3.5" strokeWidth={2} aria-hidden="true" />
        </span>
      </button>
    </article>
  );
}
