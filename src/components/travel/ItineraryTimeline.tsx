import type { ItineraryTimelineItem } from "@/types/travel";

interface ItineraryTimelineProps {
  items: ItineraryTimelineItem[];
}

export function ItineraryTimeline({ items }: ItineraryTimelineProps) {
  return (
    <section className="rounded-3xl border border-pine/10 bg-paper p-5 shadow-[var(--shadow-card)]">
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-pine">
          Itinerary
        </p>
        <h3 className="mt-1 text-xl font-semibold text-ink">하루 일정표</h3>
      </div>
      <ol className="space-y-5">
        {items.map((item, index) => (
          <li className="grid grid-cols-[56px_1fr] gap-4" key={item.id}>
            <time className="text-sm font-semibold text-pine">{item.time}</time>
            <div className="relative border-l border-pine/20 pl-5">
              <span className="absolute -left-[5px] top-1 size-2.5 rounded-full bg-pine" />
              <p className="text-sm font-semibold text-ink">{item.title}</p>
              <p className="mt-1 text-sm leading-5 text-stone">{item.description}</p>
              <p className="mt-2 text-xs font-medium text-pine">{item.duration}</p>
              {index === items.length - 1 ? (
                <span className="absolute -left-px top-4 h-full w-px bg-paper" />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
