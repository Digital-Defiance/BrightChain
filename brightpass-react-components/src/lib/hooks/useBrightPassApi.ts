/**
 * useBrightPassApi — React hook providing a memoized BrightPassApiService
 * instance backed by the shared authenticated Axios instance from
 * AuthenticatedApiProvider.
 */

import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import type { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import BrightPassApiService from '../services/BrightPassApiService';

export const useBrightPassApi = () => {
  const api = useAuthenticatedApi();
  return useMemo(() => new BrightPassApiService(api as AxiosInstance), [api]);
};
