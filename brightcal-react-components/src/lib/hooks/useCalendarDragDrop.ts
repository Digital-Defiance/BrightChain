import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import { useCallback, useRef, useState } from 'react';

export interface DragState {
  /** The event being dragged */
  event: ICalendarEventDTO | null;
  /** Whether a drag operation is in progress */
  isDragging: boolean;
  /** The target date/time being hovered over */
  dropTarget: { date: Date; hour: number; minute: number } | null;
}

export interface UseCalendarDragDropOptions {
  /** Callback when an event is dropped on a new time slot */
  onEventDrop?: (event: ICalendarEventDTO, newStart: Date) => void;
  /** Callback when a new event is created by dragging */
  onCreateByDrag?: (start: Date, end: Date) => void;
}

export interface UseCalendarDragDropResult {
  dragState: DragState;
  startDrag: (event: ICalendarEventDTO) => void;
  updateDropTarget: (date: Date, hour: number, minute: number) => void;
  endDrag: () => void;
  startCreateDrag: (date: Date, hour: number, minute: number) => void;
  endCreateDrag: (date: Date, hour: number, minute: number) => void;
}

/**
 * Hook for drag-and-drop rescheduling and drag-to-create logic.
 *
 * Requirements: 12.5, 12.6
 */
export function useCalendarDragDrop({
  onEventDrop,
  onCreateByDrag,
}: UseCalendarDragDropOptions = {}): UseCalendarDragDropResult {
  const [dragState, setDragState] = useState<DragState>({
    event: null,
    isDragging: false,
    dropTarget: null,
  });

  const createDragStart = useRef<{
    date: Date;
    hour: number;
    minute: number;
  } | null>(null);

  const startDrag = useCallback((event: ICalendarEventDTO) => {
    setDragState({ event, isDragging: true, dropTarget: null });
  }, []);

  const updateDropTarget = useCallback(
    (date: Date, hour: number, minute: number) => {
      setDragState((prev) => ({
        ...prev,
        dropTarget: { date, hour, minute },
      }));
    },
    [],
  );

  const endDrag = useCallback(() => {
    if (dragState.event && dragState.dropTarget) {
      const { date, hour, minute } = dragState.dropTarget;
      const newStart = new Date(date);
      newStart.setHours(hour, minute, 0, 0);
      onEventDrop?.(dragState.event, newStart);
    }
    setDragState({ event: null, isDragging: false, dropTarget: null });
  }, [dragState, onEventDrop]);

  const startCreateDrag = useCallback(
    (date: Date, hour: number, minute: number) => {
      createDragStart.current = { date, hour, minute };
    },
    [],
  );

  const endCreateDrag = useCallback(
    (date: Date, hour: number, minute: number) => {
      if (createDragStart.current) {
        const start = new Date(createDragStart.current.date);
        start.setHours(
          createDragStart.current.hour,
          createDragStart.current.minute,
          0,
          0,
        );
        const end = new Date(date);
        end.setHours(hour, minute, 0, 0);
        if (end > start) {
          onCreateByDrag?.(start, end);
        }
        createDragStart.current = null;
      }
    },
    [onCreateByDrag],
  );

  return {
    dragState,
    startDrag,
    updateDropTarget,
    endDrag,
    startCreateDrag,
    endCreateDrag,
  };
}
