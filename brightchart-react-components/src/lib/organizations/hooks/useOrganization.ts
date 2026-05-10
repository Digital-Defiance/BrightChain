/**
 * useOrganization — Query hook for a single organization by ID.
 *
 * Fetches on mount and when `id` changes.
 *
 * Requirements: 9.2
 */

import type { IOrganization } from '@brightchain/brightchart-lib';
import { useCallback, useEffect, useState } from 'react';
import { useOrgApi } from './useOrgApi';

export interface UseOrganizationResult {
  data: IOrganization | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOrganization(id: string): UseOrganizationResult {
  const orgApi = useOrgApi();
  const [data, setData] = useState<IOrganization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    orgApi
      .getOrganization(id)
      .then((result) => {
        setData(result);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch organization',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgApi, id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
