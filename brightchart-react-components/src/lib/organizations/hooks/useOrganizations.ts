/**
 * useOrganizations — Query hook for the paginated organization list.
 *
 * Fetches on mount and when `params` change. Debounce is not handled
 * here — the consuming component is responsible for debouncing search input.
 *
 * Requirements: 9.1
 */

import { useCallback, useEffect, useState } from 'react';
import type { OrgListParams, OrgListResponse } from '../services/orgApi';
import { useOrgApi } from './useOrgApi';

export interface UseOrganizationsResult {
  data: OrgListResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOrganizations(
  params?: OrgListParams,
): UseOrganizationsResult {
  const orgApi = useOrgApi();
  const [data, setData] = useState<OrgListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    orgApi
      .listOrganizations(params)
      .then((result) => {
        setData(result);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch organizations',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgApi, params]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
