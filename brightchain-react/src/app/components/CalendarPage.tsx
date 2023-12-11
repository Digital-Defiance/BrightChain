/**
 * CalendarPage — Embeds BrightCal inside the BrightMail layout.
 *
 * Renders the CalendarWidget with data from the useCalendars and useEvents
 * hooks, providing a full calendar experience within the mail interface
 * (similar to Outlook's integrated calendar view).
 *
 * Requirements: 13.1, 13.2, 13.3, 1.4, 1.5, 7.1, 7.3, 7.5, 8.1, 8.2, 8.3
 */
import {
  CalendarSidebar,
  CalendarWidget,
  ResponsiveCalendarLayout,
  useCalendars,
  useEvents,
  loadVisibilitySet,
  saveVisibilitySet,
} from '@brightchain/brightcal-react-components';
import '@brightchain/brightcal-react-components/lib/styles/brightcal.css';
import { useAuth, useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Compute ISO date strings for a month range (padded ±7 days for
 * week-view overlap at month boundaries).
 */
function getMonthRange(date: Date): { rangeStart: string; rangeEnd: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setDate(start.getDate() - 7);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  end.setDate(end.getDate() + 7);
  return {
    rangeStart: start.toISOString(),
    rangeEnd: end.toISOString(),
  };
}

const CalendarPage: FC = () => {
  const api = useAuthenticatedApi();
  const { token } = useAuth();
  const apiBaseUrl =
    (api as { defaults?: { baseURL?: string } }).defaults?.baseURL ?? '';

  const [currentDate, setCurrentDate] = useState(new Date());
  const [visibilitySet, setVisibilitySet] = useState<Set<string>>(
    () => loadVisibilitySet() ?? new Set<string>(),
  );

  const { rangeStart, rangeEnd } = useMemo(
    () => getMonthRange(currentDate),
    [currentDate],
  );

  const {
    data: calendars,
    loading: calendarsLoading,
    error: calendarsError,
    refetch: refetchCalendars,
  } = useCalendars({ apiBaseUrl, authToken: token ?? undefined });

  // Initialize visibility set to all calendar IDs when calendars load
  // and no persisted set exists (Requirement 1.4)
  useEffect(() => {
    if (calendars.length > 0 && visibilitySet.size === 0) {
      const persisted = loadVisibilitySet();
      if (!persisted) {
        const allIds = new Set(calendars.map((c) => c.id as string));
        setVisibilitySet(allIds);
        saveVisibilitySet(allIds);
      }
    }
  }, [calendars, visibilitySet.size]);

  // Derive calendarIds from visibilitySet (Requirement 13.2, 8.1)
  const calendarIds = useMemo(
    () => Array.from(visibilitySet),
    [visibilitySet],
  );

  const {
    data: events,
    loading: eventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useEvents({ apiBaseUrl, calendarIds, rangeStart, rangeEnd, authToken: token ?? undefined });

  const loading = calendarsLoading || eventsLoading;
  const error = calendarsError || eventsError || undefined;

  const handleDateChange = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // Persist visibility set on every change (Requirement 1.5)
  const handleVisibilityChange = useCallback((newSet: Set<string>) => {
    setVisibilitySet(newSet);
    saveVisibilitySet(newSet);
  }, []);

  const handleRetry = useCallback(() => {
    refetchCalendars();
    refetchEvents();
  }, [refetchCalendars, refetchEvents]);

  if (loading && calendars.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" mt={8}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }} color="text.secondary">
          Loading calendar…
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <ResponsiveCalendarLayout
        sidebar={
          <CalendarSidebar
            calendars={calendars}
            visibilitySet={visibilitySet}
            onVisibilityChange={handleVisibilityChange}
            apiBaseUrl={apiBaseUrl}
            onCalendarsChanged={refetchCalendars}
            selectedDate={currentDate}
            onDateSelect={handleDateChange}
          />
        }
      >
        <CalendarWidget
          calendars={calendars}
          events={events}
          loading={loading}
          error={error}
          onRetry={handleRetry}
          onDateChange={handleDateChange}
          initialDate={currentDate}
        />
      </ResponsiveCalendarLayout>
    </Box>
  );
};

export default CalendarPage;
