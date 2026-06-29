"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { getItineraryStopScrollId } from "@/lib/itineraryTimelineStop";
import { ItineraryEditStopRow } from "@/components/travel/ItineraryEditStopRow";
import {
  getStopsForDay,
  moveStopDayWithReflow,
  removeStop,
  reorderStopsInDayWithReflow,
} from "@/services/itineraryEditService";
import type { EngineContext } from "@/services/engines/engineContext";
import type { ItineraryDay, ItineraryStop } from "@/types/travel";

interface ItineraryEditTimelineProps {
  stops: ItineraryStop[];
  day: ItineraryDay;
  itineraryDays: ItineraryDay[];
  showDayToggle: boolean;
  engineContext?: EngineContext;
  selectedStopId?: string | null;
  onSelectStop?: (stopId: string) => void;
  onStopsChange: (stops: ItineraryStop[]) => void;
  onRemoveStop?: (stopId: string) => void;
}

export function ItineraryEditTimeline({
  stops,
  day,
  itineraryDays,
  showDayToggle,
  engineContext,
  selectedStopId = null,
  onSelectStop,
  onStopsChange,
  onRemoveStop,
}: ItineraryEditTimelineProps) {
  const dayStops = getStopsForDay(stops, day);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    void reorderStopsInDayWithReflow(
      stops,
      day,
      String(active.id),
      String(over.id),
      engineContext,
    ).then(onStopsChange);
  }

  if (dayStops.length === 0) {
    return (
      <p className="px-5 text-sm text-stone">
        Day {day}에 배정된 장소가 없습니다. 장소를 추가하거나 다른 Day에서 이동해 주세요.
      </p>
    );
  }

  return (
    <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
      <SortableContext items={dayStops.map((stop) => stop.id)} strategy={verticalListSortingStrategy}>
        <ol className="space-y-3 px-5">
          {dayStops.map((stop, index) => (
            <li id={getItineraryStopScrollId(stop.id)} key={stop.id}>
              <ItineraryEditStopRow
                onDayChange={(stopId, targetDay) => {
                  void moveStopDayWithReflow(stops, stopId, targetDay, engineContext).then(
                    onStopsChange,
                  );
                }}
                onRemove={(stopId) =>
                  onRemoveStop ? onRemoveStop(stopId) : onStopsChange(removeStop(stops, stopId))
                }
                onSelect={
                  onSelectStop ? () => onSelectStop(stop.id) : undefined
                }
                itineraryDays={itineraryDays}
                order={index + 1}
                selected={selectedStopId === stop.id}
                showDayToggle={showDayToggle}
                stop={stop}
              />
            </li>
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  );
}
