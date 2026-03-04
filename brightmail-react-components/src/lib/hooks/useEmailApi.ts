/**
 * useEmailApi — React hook providing a memoized EmailApiClient instance
 * backed by the shared authenticated Axios instance from
 * AuthenticatedApiProvider.
 */

import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import type { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { createEmailApiClient } from '../services/emailApi';

export const useEmailApi = () => {
  const api = useAuthenticatedApi();
  return useMemo(() => createEmailApiClient(api as AxiosInstance), [api]);
};
