/**
 * useBrightPassApi — React hook providing a memoized BrightPassApiService
 * instance backed by the shared authenticated Axios instance from
 * AuthenticatedApiProvider.
 */

import { useMemo } from 'react';
import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import BrightPassApiService from '../services/BrightPassApiService';

export const useBrightPassApi = () => {
  const api = useAuthenticatedApi();
  return useMemo(() => new BrightPassApiService(api), [api]);
};
