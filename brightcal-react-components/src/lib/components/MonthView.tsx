import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useMemo } from 'react';

export interface MonthViewProps {
  /** The date representing the month to display */
  date: Date;
  /** Events to display in the month grid */
  events: ICalendarEventDTO[];
  /** Calendar collections for color mapping */
  calendars: ICalendarCollectionDTO[];
  /** Callback when a day cell is clicked */
  onDayClick?: (date: Date) => void;
  /** Callback when an event is clicked */
  onEventClick?: (event: ICalendarEventDTO) => void;
}

/**
 * Returns all cells for the month grid, including leading empty cells
 * so that day 1 aligns with the correct weekday column.
 * Leading cells are null, actual days are Date objects.
 */
function getMonthGrid(year: number, month: number): (Date | null)[] {
  const cells: (Date | null)[] = [];
  const firstDay = new Date(year, month, 1);
  const leadingBlanks = firstDay.getDay(); // 0=Sun

  for (let i = 0; i < leadingBlanks; i++) {
    cells.push(null);
  }

  const daysCount = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    cells.push(new Date(year, month, d));
  }
  return cells;
}

/**
 * MonthView renders a grid of days for the current month with event
 * indicators (colored dots) on days that have events.
 *
 * Requirements: 12.1
 */
export function MonthView({
  date,
  events,
  calendars,
  onDayClick,
  onEventClick,
}: MonthViewProps) {
  const { tBranded: t, currentLanguage } = useI18n();
  const year = date.getFullYear();
  const month = date.getMonth();
  const days = useMemo(() => getMonthGrid(year, month), [year, month]);

  const locale = currentLanguage || 'default';

  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cal of calendars) {
      map.set(String(cal.id), cal.color);
    }
    return map;
  }, [calendars]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, ICalendarEventDTO[]>();
    for (const evt of events) {
      const start = new Date(evt.dtstart);
      const key = `${start.getFullYear()}-${start.getMonth()}-${start.getDate()}`;
      const existing = map.get(key) ?? [];
      existing.push(evt);
      map.set(key, existing);
    }
    return map;
  }, [events]);

  const weekDays = [
    t(BrightCalStrings.Weekday_Sun),
    t(BrightCalStrings.Weekday_Mon),
    t(BrightCalStrings.Weekday_Tue),
    t(BrightCalStrings.Weekday_Wed),
    t(BrightCalStrings.Weekday_Thu),
    t(BrightCalStrings.Weekday_Fri),
    t(BrightCalStrings.Weekday_Sat),
  ];

  return (
    <div
      className="brightcal-month-view"
      role="grid"
      aria-label={`${date.toLocaleString(locale, { month: 'long' })} ${year}`}
    >
      <div className="brightcal-month-header" role="row">
        {weekDays.map((day) => (
          <div
            key={day}
            className="brightcal-weekday-header"
            role="columnheader"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="brightcal-month-grid">
        {days.map((day, idx) => {
          if (day === null) {
            return (
              <div
                key={`blank-${idx}`}
                className="brightcal-day-cell brightcal-blank"
                role="gridcell"
              />
            );
          }

          const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
          const dayEvents = eventsByDay.get(key) ?? [];
          const isToday = day.toDateString() === new Date().toDateString();

          return (
            <div
              key={key}
              className={`brightcal-day-cell${isToday ? ' brightcal-today' : ''}`}
              role="gridcell"
              aria-label={day.toLocaleDateString(locale)}
              onClick={() => onDayClick?.(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') onDayClick?.(day);
              }}
              tabIndex={0}
            >
              <span className="brightcal-day-number">{day.getDate()}</span>
              {dayEvents.length > 0 && (
                <div className="brightcal-event-indicators">
                  {dayEvents.slice(0, 3).map((evt) => (
                    <span
                      key={String(evt.id)}
                      className="brightcal-event-dot"
                      style={{
                        backgroundColor:
                          calendarColorMap.get(String(evt.calendarId)) ??
                          '#3b82f6',
                      }}
                      title={evt.summary}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(evt);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.stopPropagation();
                          onEventClick?.(evt);
                        }
                      }}
                    />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="brightcal-more-events">
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
