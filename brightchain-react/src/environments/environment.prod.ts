import { IEnvironment } from '../interfaces/environment';

const runtimeConfig = (window as any).APP_CONFIG || {};

export const environment: IEnvironment = {
  production: true,
  debugI18n: false,
  serverUrl: runtimeConfig.serverUrl || '',
  apiUrl: runtimeConfig.apiUrl || '/api',
  emailDomain: 'brightchain.org',
};
