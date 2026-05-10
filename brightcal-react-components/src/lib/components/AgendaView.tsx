import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import { BrightCalStrings } from '@brightchain/brightcal-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useMemo } from 'react';

export interface AgendaViewProps {
  /** Events to display in chronological order */
  events: ICalendarEventDTO[];
  /** Calendar collections for color mapping */
  calendars: ICalendarCollectionDTO[];
  /** Callback when an event is clicked */
  onEventClick?: (event: ICalendarEventDTO) => void;
}

/**
 * AgendaView renders a chronological list of events with title, time,
 * location, and calendar color indicator.
 *
 * Requirements: 12.4
 */
export function AgendaView({
  events,
  calendars,
  onEventClick,
}: AgendaViewProps) {
  const { tBranded: t } = useI18n();
  const { formatDate } = useFormattedDate();
  const calendarColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cal of calendars) {
      map.set(String(cal.id), cal.color);
    }
    return map;
  }, [calendars]);

  /** Sort events chronologically by start time. */
  const sortedEvents = useMemo(
    () =>
      [...events].sort(
        (a, b) => new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime(),
      ),
    [events],
  );

  /** Group events by date for display. */
  const groupedByDate = useMemo(() => {
    const groups = new Map<string, ICalendarEventDTO[]>();
    for (const evt of sortedEvents) {
      const dateKey = new Date(evt.dtstart).toDateString();
      const existing = groups.get(dateKey) ?? [];
      existing.push(evt);
      groups.set(dateKey, existing);
    }
    return groups;
  }, [sortedEvents]);

  if (sortedEvents.length === 0) {
    return (
      <div className="brightcal-agenda-view brightcal-empty" role="list">
        <p>{t(BrightCalStrings.Status_NoUpcomingEvents)}</p>
      </div>
    );
  }

  return (
    <div
      className="brightcal-agenda-view"
      role="list"
      aria-label={t(BrightCalStrings.Label_AgendaView)}
    >
      {Array.from(groupedByDate.entries()).map(([dateKey, dayEvents]) => (
        <div key={dateKey} className="brightcal-agenda-day-group">
          <h3 className="brightcal-agenda-date-header">
            {formatDate(dateKey)}
          </h3>
          {dayEvents.map((evt) => {
            const color =
              calendarColorMap.get(String(evt.calendarId)) ?? '#3b82f6';
            return (
              <div
                key={String(evt.id)}
                className="brightcal-agenda-item"
                role="listitem"
                onClick={() => onEventClick?.(evt)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onEventClick?.(evt);
                }}
                tabIndex={0}
              >
                <span
                  className="brightcal-calendar-color"
                  style={{ backgroundColor: color }}
                  aria-hidden="true"
                />
                <div className="brightcal-agenda-item-content">
                  <span className="brightcal-agenda-title">{evt.summary}</span>
                  <span className="brightcal-agenda-time">
                    {evt.allDay
                      ? t(BrightCalStrings.Label_AllDay)
                      : `${new Date(evt.dtstart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}${evt.dtend ? ` – ${new Date(evt.dtend).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}`}
                  </span>
                  {evt.location && (
                    <span className="brightcal-agenda-location">
                      {evt.location}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
