import { IEnvironment } from '../interfaces/environment';

// Runtime config from server (injected into index.html)
const runtimeConfig = (window as any).APP_CONFIG || {};

export const environment: IEnvironment = {
  production: import.meta.env.PROD,
  debugI18n: !import.meta.env.PROD,
  serverUrl: runtimeConfig.serverUrl || '',
  apiUrl: runtimeConfig.apiUrl || '/api',
  emailDomain: 'brightchain.org',
};
