import type { BrandStoryBeat as BrandStoryBeatData } from "@/data/brandStory";
import { cn } from "@/lib/utils";

interface BrandStoryBeatProps {
  beat: BrandStoryBeatData;
  className?: string;
}

export function BrandStoryBeat({ beat, className }: BrandStoryBeatProps) {
  return (
    <article
      className={cn(
        "rounded-3xl border border-ivory/10 bg-ivory/6 px-5 py-5 backdrop-blur-sm",
        className,
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sand/95">
        {beat.eyebrow}
      </p>
      <h3 className="mt-2.5 text-[15px] font-semibold leading-snug text-ivory">{beat.title}</h3>
      <p className="mt-2.5 text-sm leading-[1.65] text-mist">{beat.body}</p>
    </article>
  );
}
