import { useCallback, useState } from 'react';
import type { CalendarViewMode } from '../components/CalendarWidget';

export interface KeyboardNavigationState {
  /** Currently focused date */
  focusedDate: Date;
  /** Whether a popover/dialog is open */
  isPopoverOpen: boolean;
}

export interface UseCalendarKeyboardOptions {
  /** Initial focused date */
  initialDate?: Date;
  /** Callback when the focused date changes */
  onDateChange?: (date: Date) => void;
  /** Current view mode (affects navigation step size) */
  viewMode?: CalendarViewMode;
}

export interface UseCalendarKeyboardResult {
  state: KeyboardNavigationState;
  handleKeyDown: (e: React.KeyboardEvent) => void;
  setPopoverOpen: (open: boolean) => void;
  setFocusedDate: (date: Date) => void;
}

/**
 * Hook for keyboard navigation state in the calendar.
 * Supports arrow keys for date navigation, Enter to select, Escape to close.
 *
 * Requirements: 12.9
 */
export function useCalendarKeyboard({
  initialDate,
  onDateChange,
  viewMode = 'month',
}: UseCalendarKeyboardOptions = {}): UseCalendarKeyboardResult {
  const [state, setState] = useState<KeyboardNavigationState>({
    focusedDate: initialDate ?? new Date(),
    isPopoverOpen: false,
  });

  const navigate = useCallback(
    (deltaDays: number) => {
      setState((prev) => {
        const newDate = new Date(prev.focusedDate);
        newDate.setDate(newDate.getDate() + deltaDays);
        onDateChange?.(newDate);
        return { ...prev, focusedDate: newDate };
      });
    },
    [onDateChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (state.isPopoverOpen && e.key === 'Escape') {
        setState((prev) => ({ ...prev, isPopoverOpen: false }));
        e.preventDefault();
        return;
      }

      const step = viewMode === 'month' ? 7 : 1;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigate(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigate(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigate(-step);
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigate(step);
          break;
        case 'Enter':
          e.preventDefault();
          setState((prev) => ({ ...prev, isPopoverOpen: true }));
          break;
        case 'Escape':
          e.preventDefault();
          setState((prev) => ({ ...prev, isPopoverOpen: false }));
          break;
      }
    },
    [state.isPopoverOpen, viewMode, navigate],
  );

  const setPopoverOpen = useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isPopoverOpen: open }));
  }, []);

  const setFocusedDate = useCallback(
    (date: Date) => {
      setState((prev) => ({ ...prev, focusedDate: date }));
      onDateChange?.(date);
    },
    [onDateChange],
  );

  return { state, handleKeyDown, setPopoverOpen, setFocusedDate };
}
