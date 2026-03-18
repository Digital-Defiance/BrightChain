import { IEnvironment } from '../interfaces/environment';

// Runtime config from server (injected into index.html)
const runtimeConfig =
  ((window as unknown as Record<string, unknown>).APP_CONFIG as Record<
    string,
    unknown
  >) || {};

export const environment: IEnvironment = {
  production: import.meta.env.PROD,
  debugI18n: !import.meta.env.PROD,
  serverUrl: runtimeConfig.serverUrl || '',
  apiUrl: runtimeConfig.apiUrl || '/api',
  emailDomain: runtimeConfig.emailDomain || 'brightchain.org',
  enabledFeatures: runtimeConfig.enabledFeatures || [
    'BrightChat',
    'BrightHub',
    'BrightMail',
    'BrightPass',
  ],
};
