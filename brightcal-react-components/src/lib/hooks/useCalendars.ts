import type { ICalendarCollectionDTO } from '@brightchain/brightcal-lib';
import { useCallback, useEffect, useState } from 'react';

export interface UseCalendarsOptions {
  /** API base URL */
  apiBaseUrl: string;
  /** Auth token for API requests */
  authToken?: string;
}

export interface UseCalendarsResult {
  data: ICalendarCollectionDTO[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch and manage calendar collections.
 *
 * Requirements: 12.7
 */
export function useCalendars({
  apiBaseUrl,
  authToken,
}: UseCalendarsOptions): UseCalendarsResult {
  const [data, setData] = useState<ICalendarCollectionDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/cal/calendars`, {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json.calendars ?? json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch calendars',
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, authToken]);

  useEffect(() => {
    fetchCalendars();
  }, [fetchCalendars]);

  return { data, loading, error, refetch: fetchCalendars };
}
