import type { IFreeBusyDataDTO } from '@brightchain/brightcal-lib';
import { useCallback, useEffect, useState } from 'react';

export interface UseFreeBusyOptions {
  /** API base URL */
  apiBaseUrl: string;
  /** User IDs to query free/busy for */
  userIds: string[];
  /** Start of the time range */
  rangeStart: string;
  /** End of the time range */
  rangeEnd: string;
  /** Auth token for API requests */
  authToken?: string;
}

export interface UseFreeBusyResult {
  data: IFreeBusyDataDTO[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to query free/busy data for one or more users.
 *
 * Requirements: 8.3, 8.4
 */
export function useFreeBusy({
  apiBaseUrl,
  userIds,
  rangeStart,
  rangeEnd,
  authToken,
}: UseFreeBusyOptions): UseFreeBusyResult {
  const [data, setData] = useState<IFreeBusyDataDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFreeBusy = useCallback(async () => {
    if (userIds.length === 0) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${apiBaseUrl}/cal/scheduling/free-busy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ userIds, rangeStart, rangeEnd }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch free/busy data',
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, userIds, rangeStart, rangeEnd, authToken]);

  useEffect(() => {
    fetchFreeBusy();
  }, [fetchFreeBusy]);

  return { data, loading, error, refetch: fetchFreeBusy };
}
