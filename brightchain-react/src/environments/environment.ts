import { IEnvironment } from '../interfaces/environment';

// Runtime config from server (injected into index.html)
const runtimeConfig = (window as any).APP_CONFIG || {};

export const environment: IEnvironment = {
  production: false,
  debugI18n: true,
  serverUrl: runtimeConfig.serverUrl || '',
  apiUrl: runtimeConfig.apiUrl || '/api',
};
