import axios from 'axios';

/**
 * API origin for cross-origin deployments only.
 * Leave VITE_API_URL empty in Vercel/local so requests use same-origin `/api/*`.
 */
function resolveApiOrigin() {
  const raw = (import.meta.env.VITE_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!raw) return '';

  // Ignore localhost targets in production (common misconfigured Vercel env var).
  if (
    import.meta.env.PROD &&
    /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(raw)
  ) {
    console.warn('[api] Ignoring localhost VITE_API_URL in production; using same-origin /api');
    return '';
  }

  return raw;
}

const API_ORIGIN = resolveApiOrigin();

export const api = axios.create({
  baseURL: API_ORIGIN,
  headers: { 'Content-Type': 'application/json' },
});

/** Ensure relative requests always target `/api/...` on the current host. */
export function normalizeApiPath(url) {
  if (!url || /^https?:\/\//i.test(url)) return url;
  const path = url.startsWith('/') ? url : `/${url}`;
  return path.startsWith('/api') ? path : `/api${path}`;
}

api.interceptors.request.use((config) => {
  if (config.url) {
    config.url = normalizeApiPath(config.url);
  }

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
    const response = await api({ method, url: normalizeApiPath(url), data });
    return { data: response.data, error: null };
  } catch (error) {
    return { data: null, error: extractError(error) };
  }
}

export default api;
