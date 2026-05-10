import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import { useCallback, useEffect, useState } from 'react';

export interface UseEventsOptions {
  /** API base URL */
  apiBaseUrl: string;
  /** Calendar IDs to fetch events for */
  calendarIds: string[];
  /** Start of the time range */
  rangeStart: string;
  /** End of the time range */
  rangeEnd: string;
  /** Auth token for API requests */
  authToken?: string;
}

export interface UseEventsResult {
  data: ICalendarEventDTO[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch events for a time range with recurrence expansion.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
export function useEvents({
  apiBaseUrl,
  calendarIds,
  rangeStart,
  rangeEnd,
  authToken,
}: UseEventsOptions): UseEventsResult {
  const [data, setData] = useState<ICalendarEventDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (calendarIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        rangeStart,
        rangeEnd,
      });
      calendarIds.forEach((id) => params.append('calendarId', id));

      const res = await fetch(`${apiBaseUrl}/cal/events?${params}`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.events ?? json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch events');
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, calendarIds, rangeStart, rangeEnd, authToken]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { data, loading, error, refetch: fetchEvents };
}
