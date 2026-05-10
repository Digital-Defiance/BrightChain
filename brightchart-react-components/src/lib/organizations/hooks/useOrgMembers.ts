/**
 * useOrgMembers — Query hook for organization members grouped by role code.
 *
 * Fetches on mount and when `orgId` changes.
 *
 * Requirements: 9.3
 */

import { useCallback, useEffect, useState } from 'react';
import type { OrgMembersResponse } from '../services/orgApi';
import { useOrgApi } from './useOrgApi';

export interface UseOrgMembersResult {
  data: OrgMembersResponse | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useOrgMembers(orgId: string): UseOrgMembersResult {
  const orgApi = useOrgApi();
  const [data, setData] = useState<OrgMembersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    setLoading(true);
    setError(null);
    orgApi
      .getOrgMembers(orgId)
      .then((result) => {
        setData(result);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch members',
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgApi, orgId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
