import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.error('❌ Authentication error:', {
        status: error.response?.status,
        message: error.response?.data?.error || error.message,
        path: error.config?.url
      });
      
      // Only redirect if not already on login page
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        alert('انتهت صلاحية الجلسة أو لا تملك الصلاحية. يرجى تسجيل الدخول مرة أخرى.');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
