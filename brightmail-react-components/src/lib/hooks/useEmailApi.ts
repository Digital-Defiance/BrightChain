/**
 * useEmailApi — React hook providing a memoized EmailApiClient instance
 * backed by the shared authenticated Axios instance from
 * AuthenticatedApiProvider.
 */

import { useMemo } from 'react';
import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import { createEmailApiClient } from '../services/emailApi';

export const useEmailApi = () => {
  const api = useAuthenticatedApi();
  return useMemo(() => createEmailApiClient(api), [api]);
};
