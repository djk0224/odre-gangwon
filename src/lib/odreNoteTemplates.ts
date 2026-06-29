/** tone·layout·filter — 순환 import 방지용 공유 타입 */
export type OdreNoteTone =
  | "news-hook"
  | "scene"
  | "myth-flip"
  | "traveler"
  | "local-context"
  | "column";

export type OdreNoteFilter =
  | "festival"
  | "sea"
  | "mountain"
  | "light-route"
  | "quiet-zone"
  | "next-season";

export type OdreNoteLayout = "image-lead" | "news-label" | "text-only";

/** A=뉴스 훅 · B=장면/맥락 · C=칼럼 */
export type OdreNoteTemplateId = "hook" | "context" | "column";

export type OdreNoteCouplingMode = "tight" | "context" | "loose";

export interface OdreNoteTemplate {
  id: OdreNoteTemplateId;
  label: string;
  coupling: OdreNoteCouplingMode;
  /** overlay 필수 여부 (refresh:notes) */
  requireOverlay: boolean;
  /** festival 필터 시 eventPeriod 필수 */
  requireEventPeriodWhenFestival: boolean;
  tones: readonly OdreNoteTone[];
  description: string;
}

export const ODRE_NOTE_TEMPLATES: Record<OdreNoteTemplateId, OdreNoteTemplate> = {
  hook: {
    id: "hook",
    label: "뉴스 훅",
    coupling: "tight",
    requireOverlay: true,
    requireEventPeriodWhenFestival: true,
    tones: ["news-hook"],
    description: "축제·행사·이슈 — overlay·본문·sourceLine이 같은 사건을 가리킨다.",
  },
  context: {
    id: "context",
    label: "장면·맥락",
    coupling: "context",
    requireOverlay: true,
    requireEventPeriodWhenFestival: true,
    tones: ["scene", "traveler", "local-context", "myth-flip"],
    description: "손글 여행 글이 주, overlay는 근거·최신 소식.",
  },
  column: {
    id: "column",
    label: "칼럼",
    coupling: "loose",
    requireOverlay: false,
    requireEventPeriodWhenFestival: false,
    tones: ["column"],
    description: "관점·원칙 중심 — overlay 없어도 시드만으로 완결.",
  },
};

export function getOdreNoteTemplateForTone(tone: OdreNoteTone): OdreNoteTemplate {
  for (const template of Object.values(ODRE_NOTE_TEMPLATES)) {
    if (template.tones.includes(tone)) return template;
  }
  return ODRE_NOTE_TEMPLATES.context;
}

export function getOdreNoteCouplingForNote(note: { tone: OdreNoteTone }): OdreNoteCouplingMode {
  return getOdreNoteTemplateForTone(note.tone).coupling;
}
