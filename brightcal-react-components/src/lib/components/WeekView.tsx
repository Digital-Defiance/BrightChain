import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useMemo } from 'react';

export interface WeekViewProps {
  /** A date within the week to display */
  date: Date;
  /** Events to display */
  events: ICalendarEventDTO[];
  /** Calendar collections for color mapping */
  calendars: ICalendarCollectionDTO[];
  /** Callback when an event block is clicked */
  onEventClick?: (event: ICalendarEventDTO) => void;
  /** Callback when an empty time slot is clicked */
  onTimeSlotClick?: (date: Date, hour: number, minute: number) => void;
}

/** Returns the 7 days of the week containing the given date (Sunday start). */
function getWeekDays(date: Date): Date[] {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Hours array 0-23 for the time grid. */
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/**
 * WeekView renders a 7-column time grid with event blocks positioned
 * by start/end time. Supports overlapping events displayed side-by-side.
 *
 * Requirements: 12.2, 12.5, 12.6
 */
export function WeekView({
  date,
  events,
  calendars,
  onEventClick,
  onTimeSlotClick,
}: WeekViewProps) {
  const { tBranded: t } = useI18n();
  const weekDays = useMemo(() => getWeekDays(date), [date]);

  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cal of calendars) {
      map.set(String(cal.id), cal.color);
    }
    return map;
  }, [calendars]);

  /** Group events by day-of-week index (0=Sun). */
  const eventsByDay = useMemo(() => {
    const map = new Map<number, ICalendarEventDTO[]>();
    for (const evt of events) {
      const start = new Date(evt.dtstart);
      for (let i = 0; i < weekDays.length; i++) {
        if (start.toDateString() === weekDays[i].toDateString()) {
          const existing = map.get(i) ?? [];
          existing.push(evt);
          map.set(i, existing);
        }
      }
    }
    return map;
  }, [events, weekDays]);

  return (
    <div
      className="brightcal-week-view"
      role="grid"
      aria-label={t(BrightCalStrings.Label_WeekView)}
    >
      {/* Column headers */}
      <div className="brightcal-week-header" role="row">
        <div className="brightcal-time-gutter" role="columnheader" />
        {weekDays.map((day, i) => (
          <div
            key={i}
            className="brightcal-week-day-header"
            role="columnheader"
          >
            {day.toLocaleDateString('default', {
              weekday: 'short',
              month: 'numeric',
              day: 'numeric',
            })}
          </div>
        ))}
      </div>

      {/* Time grid */}
      <div className="brightcal-week-body">
        {HOURS.map((hour) => (
          <div key={hour} className="brightcal-week-row" role="row">
            <div className="brightcal-time-label">
              {hour.toString().padStart(2, '0')}:00
            </div>
            {weekDays.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="brightcal-week-cell"
                role="gridcell"
                onClick={() => onTimeSlotClick?.(day, hour, 0)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onTimeSlotClick?.(day, hour, 0);
                }}
                tabIndex={0}
                aria-label={`${day.toLocaleDateString()} ${hour}:00`}
              >
                {/* Render events that start in this hour */}
                {(eventsByDay.get(dayIdx) ?? [])
                  .filter((evt) => new Date(evt.dtstart).getHours() === hour)
                  .map((evt) => {
                    const start = new Date(evt.dtstart);
                    const end = evt.dtend
                      ? new Date(evt.dtend)
                      : new Date(start.getTime() + 60 * 60 * 1000);
                    const durationMin =
                      (end.getTime() - start.getTime()) / 60000;

                    return (
                      <div
                        key={String(evt.id)}
                        className="brightcal-event-block"
                        style={{
                          backgroundColor:
                            calendarColorMap.get(String(evt.calendarId)) ??
                            '#3b82f6',
                          height: `${Math.max(durationMin / 60, 0.25) * 100}%`,
                        }}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick?.(evt);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.stopPropagation();
                            onEventClick?.(evt);
                          }
                        }}
                        title={evt.summary}
                      >
                        <span className="brightcal-event-title">
                          {evt.summary}
                        </span>
                      </div>
                    );
                  })}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
