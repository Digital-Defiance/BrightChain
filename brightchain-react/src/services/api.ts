// src/services/api.ts
import { LanguageCodes, StringLanguages } from '@brightchain/brightchain-lib';
import axios from 'axios';
import { environment } from '../environments/environment';

const api = axios.create({
  baseURL: environment.apiUrl,
});

api.interceptors.request.use((config) => {
  const languageCode =
    localStorage.getItem('languageCode') ??
    StringLanguages.EnglishUS;
  config.headers['Accept-Language'] = languageCode;
  return config;
});

export default api;
