import { useCallback, useEffect, useState } from 'react';

export interface BookingSlot {
  start: string;
  end: string;
  available: boolean;
}

export interface UseBookingSlotsOptions {
  /** API base URL */
  apiBaseUrl: string;
  /** Booking page slug or ID */
  pageId: string;
  /** Date to fetch slots for (ISO string) */
  date: string;
}

export interface UseBookingSlotsResult {
  data: BookingSlot[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch available booking slots for a booking page.
 *
 * Requirements: 9.2
 */
export function useBookingSlots({
  apiBaseUrl,
  pageId,
  date,
}: UseBookingSlotsOptions): UseBookingSlotsResult {
  const [data, setData] = useState<BookingSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSlots = useCallback(async () => {
    if (!pageId) {
      setData([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date });
      const res = await fetch(
        `${apiBaseUrl}/cal/booking/pages/${pageId}/slots?${params}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch booking slots',
      );
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, pageId, date]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  return { data, loading, error, refetch: fetchSlots };
}
