// src/services/api.ts
/* eslint-disable @nx/enforce-module-boundaries */
import { LanguageCodes } from '@digitaldefiance/i18n-lib';
import axios from 'axios';
import { environment } from '../environments/environment';

const api = axios.create({
  baseURL: environment.apiUrl,
});

api.interceptors.request.use((config) => {
  const languageCode =
    localStorage.getItem('languageCode') ?? LanguageCodes.EN_US;
  config.headers['Accept-Language'] = languageCode;
  return config;
});

export default api;
