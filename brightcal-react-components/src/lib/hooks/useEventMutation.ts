import type { ICalendarEventDTO } from '@brightchain/brightcal-lib';
import { useCallback, useState } from 'react';

export interface UseEventMutationOptions {
  /** API base URL */
  apiBaseUrl: string;
  /** Auth token for API requests */
  authToken?: string;
  /** Callback after a successful mutation */
  onSuccess?: () => void;
}

export interface UseEventMutationResult {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;
  createEvent: (
    data: Partial<ICalendarEventDTO>,
  ) => Promise<ICalendarEventDTO | null>;
  updateEvent: (
    id: string,
    data: Partial<ICalendarEventDTO>,
  ) => Promise<ICalendarEventDTO | null>;
  deleteEvent: (id: string) => Promise<boolean>;
}

/**
 * Hook for creating, updating, and deleting events with optimistic update support.
 *
 * Requirements: 12.5, 12.6
 */
export function useEventMutation({
  apiBaseUrl,
  authToken,
  onSuccess,
}: UseEventMutationOptions): UseEventMutationResult {
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken],
  );

  const createEvent = useCallback(
    async (
      data: Partial<ICalendarEventDTO>,
    ): Promise<ICalendarEventDTO | null> => {
      setCreating(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/events`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        onSuccess?.();
        return json;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create event');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  const updateEvent = useCallback(
    async (
      id: string,
      data: Partial<ICalendarEventDTO>,
    ): Promise<ICalendarEventDTO | null> => {
      setUpdating(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/events/${id}`, {
          method: 'PATCH',
          headers: headers(),
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        onSuccess?.();
        return json;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update event');
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      setDeleting(true);
      setError(null);
      try {
        const res = await fetch(`${apiBaseUrl}/cal/events/${id}`, {
          method: 'DELETE',
          headers: headers(),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        onSuccess?.();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete event');
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [apiBaseUrl, headers, onSuccess],
  );

  return {
    creating,
    updating,
    deleting,
    error,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
