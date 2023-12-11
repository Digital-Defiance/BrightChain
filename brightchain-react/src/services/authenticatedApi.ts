import { createAuthenticatedApiClient } from '@digitaldefiance/express-suite-react-components';
import { environment } from '../environments/environment';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const appConfig = (window as { APP_CONFIG?: { apiUrl?: string } })
      .APP_CONFIG;
    if (appConfig?.apiUrl) {
      return appConfig.apiUrl;
    }
  }
  return environment.apiUrl || '/api';
};

const authenticatedApi = createAuthenticatedApiClient(getApiBaseUrl());

export default authenticatedApi;
