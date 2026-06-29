import type { Coordinates, ItineraryDay, ItineraryStop } from "@/types/travel";

export function buildRouteStopsKey(stops: ItineraryStop[]): string {
  return stops
    .map(
      (stop) =>
        `${stop.id}:${stop.day}:${stop.order}:${stop.coordinates.lat.toFixed(5)},${stop.coordinates.lng.toFixed(5)}:${stop.category}:${stop.placeId}`,
    )
    .join("|");
}

export function buildLodgingAnchorsKey(
  lodgingAnchorsByDay?: Partial<
    Record<ItineraryDay, { start?: Coordinates; end?: Coordinates }>
  >,
): string {
  if (!lodgingAnchorsByDay) return "";

  return Object.entries(lodgingAnchorsByDay)
    .sort(([left], [right]) => Number(left) - Number(right))
    .map(([day, anchors]) => {
      const start = anchors?.start;
      const end = anchors?.end;
      return `${day}:${start?.lat.toFixed(5)},${start?.lng.toFixed(5)}|${end?.lat.toFixed(5)},${end?.lng.toFixed(5)}`;
    })
    .join(";");
}

export function buildPlaceMapKey(
  coordinates: Coordinates,
  placeName: string,
): string {
  return `${placeName}:${coordinates.lat.toFixed(5)},${coordinates.lng.toFixed(5)}`;
}
