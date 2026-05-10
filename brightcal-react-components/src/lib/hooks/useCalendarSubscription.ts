import type { ICalendarCollectionDTO } from '@brightchain/brightcal-lib';
import { useCallback, useState } from 'react';

export interface UseCalendarSubscriptionOptions {
  apiBaseUrl: string;
  authToken?: string;
  onSuccess?: () => void;
}

export interface UseCalendarSubscriptionResult {
  subscribe: (
    url: string,
    displayName: string,
    refreshInterval?: number,
  ) => Promise<ICalendarCollectionDTO | null>;
  refreshSubscription: (calendarId: string) => Promise<boolean>;
  unsubscribe: (calendarId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

const DEFAULT_REFRESH_INTERVAL = 60; // minutes

/**
 * Hook for managing ICS feed subscriptions.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.4
 */
export function useCalendarSubscription({
  apiBaseUrl,
  authToken,
  onSuccess,
}: UseCalendarSubscriptionOptions): UseCalendarSubscriptionResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken],
  );

  const subscribe = useCallback(
    async (
      url: string,
      displayName: string,
      refreshInterval: number = DEFAULT_REFRESH_INTERVAL,
    ): Promise<ICalendarCollectionDTO | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/subscribe-to-feed`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ url, displayName, refreshInterval }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        onSuccess?.();
        return json;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to subscribe to feed',
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  const refreshSubscription = useCallback(
    async (calendarId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/${calendarId}/refresh`,
          {
            method: 'POST',
            headers: headers(),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onSuccess?.();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to refresh subscription',
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  const unsubscribe = useCallback(
    async (calendarId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/calendars/${calendarId}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onSuccess?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to unsubscribe');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  return { subscribe, refreshSubscription, unsubscribe, loading, error };
}
