// src/services/api.ts

import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import axios from 'axios';
import { environment } from '../environments/environment';

const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const appConfig = (window as { APP_CONFIG?: { apiUrl?: string } }).APP_CONFIG;
    if (appConfig?.apiUrl) {
      return appConfig.apiUrl;
    }
  }
  return environment.apiUrl || '/api';
};

const api = axios.create({
  baseURL: getApiBaseUrl(),
});

api.interceptors.request.use((config) => {
  const languageCode =
    localStorage.getItem('languageCode') ?? LanguageCodes.EN_US;
  config.headers['Accept-Language'] = languageCode;
  return config;
});

export default api;
