import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  // V-09: send httpOnly cookies on every request
  withCredentials: true,
});

// V-06: CSRF token cache — invalidated after login/logout (session identifier changes)
let csrfToken = null;

export function clearCsrfToken() {
  csrfToken = null;
}

async function getCsrfToken() {
  if (csrfToken) return csrfToken;
  try {
    // Use a plain axios call (not the `api` instance) to avoid interceptor recursion
    const res = await axios.get(`${API_URL}/csrf-token`, { withCredentials: true });
    csrfToken = res.data.token;
  } catch {
    csrfToken = null;
  }
  return csrfToken;
}

const STATE_CHANGING_METHODS = ['post', 'put', 'patch', 'delete'];

// V-01: no longer reads token from localStorage — rely solely on httpOnly cookie
// V-06: attach x-csrf-token header for state-changing requests
api.interceptors.request.use(async (config) => {
  if (STATE_CHANGING_METHODS.includes(config.method?.toLowerCase())) {
    const token = await getCsrfToken();
    if (token) config.headers['x-csrf-token'] = token;
  }
  return config;
});

// F-08: flag to prevent infinite refresh loops
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) {
  refreshSubscribers.push(cb);
}
function onRefreshed() {
  refreshSubscribers.forEach((cb) => cb());
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // On 403, refresh CSRF token and retry once (session identifier may have changed)
    if (error.response?.status === 403 && !originalRequest._csrfRetried) {
      csrfToken = null;
      originalRequest._csrfRetried = true;
      const newToken = await getCsrfToken();
      if (newToken) {
        originalRequest.headers['x-csrf-token'] = newToken;
        return api(originalRequest);
      }
    }

    // F-08: On 401, attempt to refresh the access token via the refresh cookie
    if (error.response?.status === 401 && !originalRequest._refreshRetried) {
      originalRequest._refreshRetried = true;

      if (isRefreshing) {
        // Queue requests that arrive while a refresh is already in-flight
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        // H-01: fetch a fresh CSRF token then include it in the refresh call
        // (plain axios needed here to avoid interceptor recursion, but we attach CSRF manually)
        csrfToken = null; // force re-fetch
        const freshCsrf = await getCsrfToken();
        await axios.post(`${API_URL}/auth/refresh`, {}, {
          withCredentials: true,
          headers: freshCsrf ? { 'x-csrf-token': freshCsrf } : {},
        });
        csrfToken = null; // H-02: new session identifier after token rotation
        isRefreshing = false;
        onRefreshed();
        return api(originalRequest);
      } catch {
        isRefreshing = false;
        refreshSubscribers = [];
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
