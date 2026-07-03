import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

function extractError(error) {
  const message =
    error?.response?.data?.error ||
    error?.message ||
    'Request failed';
  return { message };
}

export async function apiRequest(method, url, data) {
  try {
    const response = await api({ method, url, data });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
}

export default api;
