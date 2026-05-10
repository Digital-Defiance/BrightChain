import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useMemo } from 'react';

export interface DayViewProps {
  /** The date to display */
  date: Date;
  /** Events for this day */
  events: ICalendarEventDTO[];
  /** Calendar collections for color mapping */
  calendars: ICalendarCollectionDTO[];
  /** Callback when an event is clicked */
  onEventClick?: (event: ICalendarEventDTO) => void;
  /** Callback when an empty time slot is clicked */
  onTimeSlotClick?: (date: Date, hour: number, minute: number) => void;
}

/** 15-minute time slots for the entire day (96 slots). */
const TIME_SLOTS = Array.from({ length: 96 }, (_, i) => ({
  hour: Math.floor(i / 4),
  minute: (i % 4) * 15,
}));

/**
 * DayView renders a single-column time grid with 15-minute granularity.
 * Events are displayed as blocks positioned by their start/end times.
 *
 * Requirements: 12.3, 12.5, 12.6
 */
export function DayView({
  date,
  events,
  calendars,
  onEventClick,
  onTimeSlotClick,
}: DayViewProps) {
  const { tBranded: t } = useI18n();
  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cal of calendars) {
      map.set(String(cal.id), cal.color);
    }
    return map;
  }, [calendars]);

  /** Filter events to only those on this day. */
  const dayEvents = useMemo(() => {
    const dayStr = date.toDateString();
    return events.filter(
      (evt) => new Date(evt.dtstart).toDateString() === dayStr,
    );
  }, [events, date]);

  return (
    <div
      className="brightcal-day-view"
      role="grid"
      aria-label={t(BrightCalStrings.Label_DayViewTemplate).replace(
        '{DATE}',
        date.toLocaleDateString(),
      )}
    >
      <div className="brightcal-day-header">
        <h2>
          {date.toLocaleDateString('default', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </h2>
      </div>

      <div className="brightcal-day-body">
        {TIME_SLOTS.map(({ hour, minute }) => {
          const slotLabel = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const slotEvents = dayEvents.filter((evt) => {
            const start = new Date(evt.dtstart);
            return start.getHours() === hour && start.getMinutes() === minute;
          });

          return (
            <div key={slotLabel} className="brightcal-time-slot" role="row">
              {minute === 0 && (
                <div className="brightcal-time-label">{slotLabel}</div>
              )}
              <div
                className="brightcal-slot-content"
                role="gridcell"
                aria-label={`${date.toLocaleDateString()} ${slotLabel}`}
                onClick={() => onTimeSlotClick?.(date, hour, minute)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onTimeSlotClick?.(date, hour, minute);
                }}
                tabIndex={0}
              >
                {slotEvents.map((evt) => (
                  <div
                    key={String(evt.id)}
                    className="brightcal-event-block"
                    style={{
                      backgroundColor:
                        calendarColorMap.get(String(evt.calendarId)) ??
                        '#3b82f6',
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
                    <span className="brightcal-event-title">{evt.summary}</span>
                    {evt.location && (
                      <span className="brightcal-event-location">
                        {evt.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
