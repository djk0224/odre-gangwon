"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, Check } from "lucide-react";
import { OdreNoteCard } from "@/components/newsletter/OdreNoteCard";
import { OdreNoteDetailScreen } from "@/components/newsletter/OdreNoteDetailScreen";
import { SectionHeader } from "@/components/ui/SectionHeader";
import {
  filterOdreNotes,
  getFeaturedOdreNote,
  getOdreNotes,
  ODRE_NOTE_FILTER_CHIPS,
  type OdreNoteFilterChip,
} from "@/data/odreNotes";
import { cn } from "@/lib/utils";

interface NewsletterScreenProps {
  zoneLabel: string;
  onPlanFromNote?: (noteId: string) => void;
  onReadingChange?: (reading: boolean) => void;
}

export function NewsletterScreen({
  zoneLabel,
  onPlanFromNote,
  onReadingChange,
}: NewsletterScreenProps) {
  const [activeFilter, setActiveFilter] = useState<OdreNoteFilterChip["id"]>("all");
  const [revisitAlert, setRevisitAlert] = useState(true);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  const allNotes = useMemo(() => getOdreNotes(), []);
  const featuredNote = useMemo(() => getFeaturedOdreNote(allNotes), [allNotes]);
  const filteredNotes = useMemo(
    () => filterOdreNotes(allNotes, activeFilter),
    [allNotes, activeFilter],
  );
  const selectedNote = useMemo(
    () => allNotes.find((note) => note.id === selectedNoteId) ?? null,
    [allNotes, selectedNoteId],
  );

  const listNotes = useMemo(() => {
    if (!featuredNote) return filteredNotes;
    if (activeFilter !== "all") return filteredNotes;
    return filteredNotes.filter((note) => note.id !== featuredNote.id);
  }, [filteredNotes, featuredNote, activeFilter]);

  useEffect(() => {
    onReadingChange?.(selectedNoteId !== null);
  }, [onReadingChange, selectedNoteId]);

  useEffect(() => {
    return () => onReadingChange?.(false);
  }, [onReadingChange]);

  if (selectedNote) {
    return (
      <OdreNoteDetailScreen
        note={selectedNote}
        onBack={() => setSelectedNoteId(null)}
        onPlanFromNote={() => {
          onPlanFromNote?.(selectedNote.id);
          setSelectedNoteId(null);
        }}
      />
    );
  }

  return (
    <main className="relative space-y-5 px-5 py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom))]">
      <SectionHeader
        description={`강원에서 일어난 소식을 여행자의 언어로 다시 읽습니다. ${zoneLabel} 권역과 연결된 글도 함께 보실 수 있어요.`}
        eyebrow="ODRÉ Note"
        title="오드레 노트"
      />

      {featuredNote && activeFilter === "all" && (
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone">이번 주</p>
          <OdreNoteCard
            featured
            note={featuredNote}
            onOpen={() => setSelectedNoteId(featuredNote.id)}
          />
        </section>
      )}

      <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {ODRE_NOTE_FILTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            className={cn(
              "shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition-colors",
              activeFilter === chip.id
                ? "border-pine bg-pine text-ivory"
                : "border-pine/15 bg-paper/70 text-stone hover:border-pine/30",
            )}
            onClick={() => setActiveFilter(chip.id)}
            type="button"
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {listNotes.length === 0 ? (
          <p className="rounded-2xl border border-pine/10 bg-paper/60 px-4 py-8 text-center text-sm text-stone">
            이 필터에 맞는 노트가 없습니다.
          </p>
        ) : (
          listNotes.map((note) => (
            <OdreNoteCard key={note.id} note={note} onOpen={() => setSelectedNoteId(note.id)} />
          ))
        )}
      </div>

      <button
        className="flex w-full items-center justify-between rounded-2xl border border-pine/12 bg-paper/70 px-4 py-3 text-left"
        onClick={() => setRevisitAlert((prev) => !prev)}
        type="button"
      >
        <span className="flex items-center gap-3">
          <Bell className="size-5 text-pine" strokeWidth={1.5} aria-hidden="true" />
          <span>
            <span className="block text-sm font-semibold text-ink">다음 계절 알림</span>
            <span className="block text-xs text-stone">다음 계절에 다시 볼 노트를 알려드릴게요.</span>
          </span>
        </span>
        <span
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors",
            revisitAlert ? "bg-pine" : "bg-stone/30",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-5 rounded-full bg-ivory transition-transform",
              revisitAlert ? "translate-x-[1.375rem]" : "translate-x-0.5",
            )}
          />
        </span>
      </button>

      {revisitAlert && (
        <p className="flex items-center gap-2 rounded-2xl bg-pine/8 px-4 py-3 text-sm text-pine">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          계절이 바뀌면 새 노트를 먼저 보내드릴게요.
        </p>
      )}
    </main>
  );
}
