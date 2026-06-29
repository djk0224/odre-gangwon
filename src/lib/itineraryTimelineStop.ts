import type { ItineraryTimelineItem } from "@/types/travel";

export function getItineraryStopScrollId(stopId: string): string {
  return `itinerary-stop-${stopId}`;
}

export function scrollItineraryStopIntoView(
  stopId: string,
  scrollRoot?: HTMLElement | null,
): void {
  const element = document.getElementById(getItineraryStopScrollId(stopId));
  if (!element) return;

  if (scrollRoot) {
    const rootRect = scrollRoot.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    const nextTop =
      elementRect.top -
      rootRect.top +
      scrollRoot.scrollTop -
      scrollRoot.clientHeight / 2 +
      elementRect.height / 2;
    scrollRoot.scrollTo({ top: Math.max(0, nextTop), behavior: "smooth" });
    return;
  }

  element.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** `buildItineraryTimeline` place 항목 → stop.id */
export function resolveStopIdFromTimelineItem(item: ItineraryTimelineItem): string | null {
  if (item.kind === "local" || item.kind === "lodging") {
    return null;
  }
  if (!item.id.startsWith("timeline-")) {
    return null;
  }
  return item.id.slice("timeline-".length);
}
