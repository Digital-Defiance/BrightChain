import type {
  ICalendarCollectionDTO,
  ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import {
  BrightCalStrings,
  type BrightCalStringKey,
} from '@brightchain/brightcal-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { useCallback, useState } from 'react';
import { AgendaView } from './AgendaView';
import { DayView } from './DayView';
import { MonthView } from './MonthView';
import { WeekView } from './WeekView';

/**
 * Supported calendar view modes.
 */
export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

const VIEW_MODE_KEYS: Record<CalendarViewMode, BrightCalStringKey> = {
  month: BrightCalStrings.View_Month,
  week: BrightCalStrings.View_Week,
  day: BrightCalStrings.View_Day,
  agenda: BrightCalStrings.View_Agenda,
};

/**
 * Props for the CalendarWidget container component.
 */
export interface CalendarWidgetProps {
  /** Calendar collections to display */
  calendars: ICalendarCollectionDTO[];
  /** Events to render across all views */
  events: ICalendarEventDTO[];
  /** Callback when an event is clicked */
  onEventClick?: (event: ICalendarEventDTO) => void;
  /** Callback when a day cell is clicked (month view) */
  onDayClick?: (date: Date) => void;
  /** Callback when an empty time slot is clicked (week/day view) */
  onTimeSlotClick?: (date: Date, hour: number, minute: number) => void;
  /** Callback when the displayed date changes */
  onDateChange?: (date: Date) => void;
  /** Callback when the view mode changes */
  onViewChange?: (view: CalendarViewMode) => void;
  /** Initial view mode (defaults to 'month') */
  initialView?: CalendarViewMode;
  /** Initial date to display (defaults to today) */
  initialDate?: Date;
  /** Whether data is currently loading */
  loading?: boolean;
  /** Error message to display */
  error?: string;
  /** Retry callback for error state */
  onRetry?: () => void;
}

/**
 * CalendarWidget is the main container component that manages the current
 * view mode (month/week/day/agenda), current date, and renders the
 * appropriate child view component.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.7, 12.12
 */
export function CalendarWidget({
  calendars,
  events,
  onEventClick,
  onDayClick,
  onTimeSlotClick,
  onDateChange,
  onViewChange,
  initialView = 'month',
  initialDate,
  loading = false,
  error,
  onRetry,
}: CalendarWidgetProps) {
  const { tBranded: t } = useI18n();
  const [currentView, setCurrentView] = useState<CalendarViewMode>(initialView);
  const [currentDate, setCurrentDate] = useState<Date>(
    initialDate ?? new Date(),
  );

  const handleViewChange = useCallback(
    (view: CalendarViewMode) => {
      setCurrentView(view);
      onViewChange?.(view);
    },
    [onViewChange],
  );

  const handleDateChange = useCallback(
    (date: Date) => {
      setCurrentDate(date);
      onDateChange?.(date);
    },
    [onDateChange],
  );

  if (error) {
    return (
      <div className="brightcal-widget brightcal-error" role="alert">
        <p>{error}</p>
        {onRetry && (
          <button onClick={onRetry} type="button">
            {t(BrightCalStrings.Action_Retry)}
          </button>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div
        className="brightcal-widget brightcal-loading"
        role="status"
        aria-label={t(BrightCalStrings.Label_Loading)}
      >
        <div className="brightcal-skeleton" />
      </div>
    );
  }

  const viewModes: CalendarViewMode[] = ['month', 'week', 'day', 'agenda'];

  return (
    <div
      className="brightcal-widget"
      role="application"
      aria-label={t(BrightCalStrings.Label_Calendar)}
    >
      <div
        className="brightcal-toolbar"
        role="toolbar"
        aria-label={t(BrightCalStrings.Label_CalendarControls)}
      >
        {viewModes.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => handleViewChange(mode)}
            aria-pressed={currentView === mode}
            className={currentView === mode ? 'brightcal-active' : ''}
          >
            {t(VIEW_MODE_KEYS[mode])}
          </button>
        ))}
      </div>

      <div className="brightcal-view-container" data-view={currentView}>
        {currentView === 'month' && (
          <MonthView
            date={currentDate}
            events={events}
            calendars={calendars}
            onEventClick={onEventClick}
            onDayClick={onDayClick ?? handleDateChange}
          />
        )}
        {currentView === 'week' && (
          <WeekView
            date={currentDate}
            events={events}
            calendars={calendars}
            onEventClick={onEventClick}
            onTimeSlotClick={onTimeSlotClick}
          />
        )}
        {currentView === 'day' && (
          <DayView
            date={currentDate}
            events={events}
            calendars={calendars}
            onEventClick={onEventClick}
            onTimeSlotClick={onTimeSlotClick}
          />
        )}
        {currentView === 'agenda' && (
          <AgendaView
            events={events}
            calendars={calendars}
            onEventClick={onEventClick}
          />
        )}
      </div>
    </div>
  );
}
