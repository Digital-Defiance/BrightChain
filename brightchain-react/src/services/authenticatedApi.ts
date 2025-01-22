import axios from 'axios';
import { environment } from '../environments/environment';

const authenticatedApi = axios.create({
  baseURL: environment.apiUrl,
});

authenticatedApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  return config;
});

export default authenticatedApi;
