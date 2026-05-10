import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import React, { useCallback, useMemo, useState } from 'react';

export interface MiniCalendarProps {
  /** Currently selected date */
  selectedDate: Date;
  /** Callback when a date is selected */
  onDateSelect: (date: Date) => void;
}

/**
 * Returns all days needed to fill the mini calendar grid for a given month,
 * including leading/trailing days from adjacent months.
 */
function getCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const grid: Date[] = [];

  // Fill leading days from previous month
  for (let i = 0; i < firstDay.getDay(); i++) {
    grid.push(new Date(year, month, -firstDay.getDay() + i + 1));
  }

  // Fill current month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    grid.push(new Date(year, month, d));
  }

  // Fill trailing days to complete the grid (always 42 cells = 6 rows)
  while (grid.length < 42) {
    grid.push(
      new Date(
        year,
        month + 1,
        grid.length - lastDay.getDate() - firstDay.getDay() + 1,
      ),
    );
  }

  return grid;
}

/**
 * MiniCalendar is a compact date picker for quick navigation.
 * Supports keyboard navigation with arrow keys, Enter, and Escape.
 *
 * Requirements: 12.8, 12.9
 */
export function MiniCalendar({
  selectedDate,
  onDateSelect,
}: MiniCalendarProps) {
  const { tBranded: t, currentLanguage } = useI18n();
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth());

  const grid = useMemo(
    () => getCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth],
  );

  const navigateMonth = useCallback(
    (delta: number) => {
      const newDate = new Date(viewYear, viewMonth + delta, 1);
      setViewYear(newDate.getFullYear());
      setViewMonth(newDate.getMonth());
    },
    [viewYear, viewMonth],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          onDateSelect(new Date(selectedDate.getTime() - 86400000));
          break;
        case 'ArrowRight':
          e.preventDefault();
          onDateSelect(new Date(selectedDate.getTime() + 86400000));
          break;
        case 'ArrowUp':
          e.preventDefault();
          onDateSelect(new Date(selectedDate.getTime() - 7 * 86400000));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onDateSelect(new Date(selectedDate.getTime() + 7 * 86400000));
          break;
      }
    },
    [selectedDate, onDateSelect],
  );

  const locale = currentLanguage || 'default';

  const weekDays = useMemo(() => {
    const days: string[] = [];
    // Generate short weekday names starting from Sunday
    for (let i = 0; i < 7; i++) {
      // Jan 4, 1970 is a Sunday
      const d = new Date(1970, 0, 4 + i);
      days.push(d.toLocaleDateString(locale, { weekday: 'narrow' }));
    }
    return days;
  }, [locale]);

  const monthLabel = new Date(viewYear, viewMonth).toLocaleString(locale, {
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="brightcal-mini-calendar"
      role="grid"
      aria-label={t(BrightCalStrings.Label_MiniCalendar)}
      onKeyDown={handleKeyDown}
    >
      <div className="brightcal-mini-nav">
        <button
          type="button"
          onClick={() => navigateMonth(-1)}
          aria-label={t(BrightCalStrings.Action_PreviousMonth)}
        >
          ‹
        </button>
        <span className="brightcal-mini-month-label">{monthLabel}</span>
        <button
          type="button"
          onClick={() => navigateMonth(1)}
          aria-label={t(BrightCalStrings.Action_NextMonth)}
        >
          ›
        </button>
      </div>

      <div className="brightcal-mini-header" role="row">
        {weekDays.map((day, i) => (
          <div key={i} className="brightcal-mini-weekday" role="columnheader">
            {day}
          </div>
        ))}
      </div>

      <div className="brightcal-mini-grid">
        {grid.map((day, i) => {
          const isCurrentMonth = day.getMonth() === viewMonth;
          const isSelected = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <button
              key={i}
              type="button"
              className={[
                'brightcal-mini-day',
                !isCurrentMonth && 'brightcal-other-month',
                isSelected && 'brightcal-selected',
                isToday && 'brightcal-today',
              ]
                .filter(Boolean)
                .join(' ')}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={day.toLocaleDateString(locale)}
              onClick={() => onDateSelect(day)}
              tabIndex={isSelected ? 0 : -1}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
