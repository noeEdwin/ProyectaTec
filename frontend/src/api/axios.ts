import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8001/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = String(error?.config?.url ?? '');
    if (
      error?.response?.status === 401
      && !requestUrl.includes('/login')
      && !requestUrl.includes('/register')
    ) {
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  },
);

export default api;
