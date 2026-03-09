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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // On 403, refresh CSRF token and retry once (session identifier may have changed)
    if (error.response?.status === 403 && !error.config._csrfRetried) {
      csrfToken = null;
      error.config._csrfRetried = true;
      const newToken = await getCsrfToken();
      if (newToken) {
        error.config.headers['x-csrf-token'] = newToken;
        return api(error.config);
      }
    }
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
