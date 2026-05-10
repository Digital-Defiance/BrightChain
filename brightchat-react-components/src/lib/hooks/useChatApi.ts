/**
 * useChatApi — React hook providing a memoized ChatApiClient instance
 * backed by the shared authenticated Axios instance from
 * AuthenticatedApiProvider.
 */

import { useAuthenticatedApi } from '@digitaldefiance/express-suite-react-components';
import type { AxiosInstance } from 'axios';
import { useMemo } from 'react';
import { createChatApiClient } from '../services/chatApi';

export const useChatApi = () => {
  const api = useAuthenticatedApi();
  return useMemo(() => createChatApiClient(api as AxiosInstance), [api]);
};
