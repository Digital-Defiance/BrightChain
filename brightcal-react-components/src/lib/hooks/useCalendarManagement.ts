import type { ICalendarCollectionDTO } from '@brightchain/brightcal-lib';
import { useCallback, useState } from 'react';

export interface UseCalendarManagementOptions {
  apiBaseUrl: string;
  authToken?: string;
  onSuccess?: () => void;
}

export interface UseCalendarManagementResult {
  createCalendar: (
    displayName: string,
    color: string,
    description?: string,
  ) => Promise<ICalendarCollectionDTO | null>;
  updateCalendar: (
    id: string,
    updates: { displayName?: string; color?: string; description?: string },
  ) => Promise<ICalendarCollectionDTO | null>;
  deleteCalendar: (id: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for creating, updating, and deleting calendar collections.
 *
 * Requirements: 2.2, 2.4, 2.5, 2.6
 */
export function useCalendarManagement({
  apiBaseUrl,
  authToken,
  onSuccess,
}: UseCalendarManagementOptions): UseCalendarManagementResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken],
  );

  const createCalendar = useCallback(
    async (
      displayName: string,
      color: string,
      description?: string,
    ): Promise<ICalendarCollectionDTO | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/calendars`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({ displayName, color, description }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        onSuccess?.();
        return json;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to create calendar',
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  const updateCalendar = useCallback(
    async (
      id: string,
      updates: { displayName?: string; color?: string; description?: string },
    ): Promise<ICalendarCollectionDTO | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/calendars/${id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(updates),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        onSuccess?.();
        return json;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to update calendar',
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  const deleteCalendar = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/calendars/${id}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onSuccess?.();
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to delete calendar',
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  return { createCalendar, updateCalendar, deleteCalendar, loading, error };
}
