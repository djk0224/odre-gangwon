"use client";

import Image from "next/image";
import { ArrowLeft, ExternalLink, Sparkles } from "lucide-react";
import { PremiumButton } from "@/components/ui/PremiumButton";
import {
  formatOdreNotePubDate,
  getOdreNoteHeroImage,
  getOdreNoteSourceUrl,
  getOdreNoteZoneLabel,
  formatOdreNoteEventPeriodLabel,
  getOdreNoteEventPeriodBadge,
  type OdreNote,
} from "@/data/odreNotes";
import { getTravelZoneWithHero } from "@/data/zoneHeroImages";
import { getOdreNotePlanHint } from "@/data/odreNotePlanHints";
import { OdreNotePlanHintBlock } from "@/components/newsletter/OdreNotePlanHintBlock";
import { cn } from "@/lib/utils";

interface OdreNoteDetailScreenProps {
  note: OdreNote;
  onBack: () => void;
  onPlanFromNote?: () => void;
}

export function OdreNoteDetailScreen({
  note,
  onBack,
  onPlanFromNote,
}: OdreNoteDetailScreenProps) {
  const zoneLabel = getOdreNoteZoneLabel(note.zones);
  const pubDateLabel = formatOdreNotePubDate(note.source?.pubDate);
  const eventPeriodLabel = formatOdreNoteEventPeriodLabel(note.eventPeriod);
  const eventStatus = getOdreNoteEventPeriodBadge(note.eventPeriod);
  const sourceUrl = getOdreNoteSourceUrl(note);
  const heroZone = note.zones[0] ? getTravelZoneWithHero(note.zones[0]) : undefined;
  const heroImage = getOdreNoteHeroImage(note) ?? heroZone?.imageUrl;
  const planHint = getOdreNotePlanHint(note.id, note.lead);

  return (
    <div className="flex h-full min-h-0 flex-col bg-ivory">
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        <section className="relative">
          {heroImage ? (
            <div className="relative aspect-[4/3] w-full bg-pine/8">
              <Image
                alt=""
                className="object-cover"
                fill
                priority
                sizes="(max-width: 430px) 100vw, 430px"
                src={heroImage}
              />
            </div>
          ) : (
            <div className="h-14 bg-gradient-to-b from-pine/10 to-transparent" />
          )}

          <div className="absolute inset-x-0 top-0 flex items-center px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))]">
            <button
              aria-label="뒤로"
              className="flex size-10 items-center justify-center rounded-full bg-paper/92 text-ink shadow-sm backdrop-blur-sm"
              onClick={onBack}
              type="button"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
          </div>
        </section>

        <article className="space-y-5 px-5 py-6">
          <header className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pine">ODRÉ Note</p>
            <p className="text-sm font-medium text-stone">
              {pubDateLabel ? `${zoneLabel} · ${pubDateLabel}` : zoneLabel}
            </p>
            <h1 className="text-[1.35rem] font-semibold leading-snug text-ink">{note.title}</h1>
          </header>

          <div className="rounded-2xl bg-pine/6 px-4 py-3">
            {eventPeriodLabel ? (
              <p className="text-xs font-semibold text-pine">
                {eventStatus ? `${eventStatus} · ` : ""}행사 기간 · {eventPeriodLabel}
              </p>
            ) : pubDateLabel ? (
              <p className="text-xs font-semibold text-pine">소식 작성일 · {pubDateLabel}</p>
            ) : null}
            <p
              className={cn(
                "text-sm leading-6 text-stone",
                (eventPeriodLabel || pubDateLabel) && "mt-2",
              )}
            >
              <span className="font-semibold text-ink">출발한 소식 · </span>
              {note.sourceLine}
            </p>
            {sourceUrl ? (
              <a
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-pine underline-offset-2 hover:underline"
                href={sourceUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-3.5" strokeWidth={1.5} aria-hidden="true" />
                뉴스 원문 보기
              </a>
            ) : null}
          </div>

          <p className="text-[15px] leading-7 text-ink">{note.lead}</p>

          <div className="space-y-4">
            {note.body.map((paragraph, index) => (
              <p key={`${note.id}-p-${index}`} className="text-[15px] leading-[1.85] text-ink/90">
                {paragraph}
              </p>
            ))}
          </div>

          {note.benefitNote ? (
            <p className="rounded-2xl border border-pine/10 px-4 py-3 text-xs leading-6 text-stone">
              {note.benefitNote}
            </p>
          ) : null}

          {planHint ? (
            <OdreNotePlanHintBlock className="mx-0" hint={planHint} />
          ) : null}
        </article>
      </div>

      <footer className="shrink-0 space-y-3 border-t border-pine/10 bg-ivory/95 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur-sm">
        <PremiumButton className="w-full gap-2" onClick={onPlanFromNote} variant="ghost">
          <Sparkles className="size-4" strokeWidth={1.5} aria-hidden="true" />
          이 글로 일정 만들기
        </PremiumButton>
      </footer>
    </div>
  );
}
