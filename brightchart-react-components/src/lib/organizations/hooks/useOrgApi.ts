/**
 * useOrgApi — React hook providing a memoized OrgApiClient instance
 * backed by the shared authenticated Axios instance from
 * AuthenticatedApiProvider.
 *
 * Requirements: 9.4
 */

import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import type { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { createOrgApiClient } from '../services/orgApi';

export const useOrgApi = () => {
  const api = useAuthenticatedApi();
  return useMemo(() => createOrgApiClient(api as AxiosInstance), [api]);
};
