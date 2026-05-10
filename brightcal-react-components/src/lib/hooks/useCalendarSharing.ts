import type { ICalendarShareDTO } from '@brightchain/brightcal-lib';
import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import { useCallback, useState } from 'react';

export interface UseCalendarSharingOptions {
  apiBaseUrl: string;
  authToken?: string;
}

export interface UseCalendarSharingResult {
  shareCalendar: (
    calendarId: string,
    grantedToUserId: string,
    permission: CalendarPermissionLevel,
  ) => Promise<ICalendarShareDTO | null>;
  revokeShare: (calendarId: string, shareId: string) => Promise<boolean>;
  getShares: (calendarId: string) => Promise<ICalendarShareDTO[]>;
  generatePublicLink: (calendarId: string) => Promise<string | null>;
  revokePublicLink: (calendarId: string) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

/**
 * Hook for managing calendar sharing operations.
 *
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6
 */
export function useCalendarSharing({
  apiBaseUrl,
  authToken,
}: UseCalendarSharingOptions): UseCalendarSharingResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const headers = useCallback(
    (): Record<string, string> => ({
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    }),
    [authToken],
  );

  const shareCalendar = useCallback(
    async (
      calendarId: string,
      grantedToUserId: string,
      permission: CalendarPermissionLevel,
    ): Promise<ICalendarShareDTO | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/${calendarId}/shares`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ grantedToUserId, permission }),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to share calendar',
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers],
  );

  const revokeShare = useCallback(
    async (calendarId: string, shareId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/${calendarId}/shares/${shareId}`,
          {
            method: 'DELETE',
            headers: headers(),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to revoke share');
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers],
  );

  const getShares = useCallback(
    async (calendarId: string): Promise<ICalendarShareDTO[]> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/${calendarId}/shares`,
          {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch shares');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, authToken],
  );

  const generatePublicLink = useCallback(
    async (calendarId: string): Promise<string | null> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/${calendarId}/public-link`,
          {
            method: 'POST',
            headers: headers(),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        return json.publicLink ?? json.url ?? null;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to generate public link',
        );
        return null;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers],
  );

  const revokePublicLink = useCallback(
    async (calendarId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `${apiBaseUrl}/cal/calendars/${calendarId}/public-link`,
          {
            method: 'DELETE',
            headers: headers(),
          },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return true;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to revoke public link',
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [apiBaseUrl, headers],
  );

  return {
    shareCalendar,
    revokeShare,
    getShares,
    generatePublicLink,
    revokePublicLink,
    loading,
    error,
  };
}
