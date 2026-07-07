import axios from 'axios';

const savedServerIP = localStorage.getItem('serverIP');
const defaultAPI = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const baseURL = savedServerIP ? `http://${savedServerIP}:5000/api` : defaultAPI;

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth-error'));
    }

    // Try to silently log this error to our new error endpoint if it's a 5xx error or network failure
    const isServerError = !error.response || error.response?.status >= 500;
    if (isServerError && !error.config?.url?.includes('/errors')) {
      try {
        axios.post(`${baseURL}/errors`, {
          error_type: `API Error ${error.response?.status || 'Network'}`,
          error_message: error.response?.data?.message || error.message || 'Unknown API Error',
          endpoint: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          additional_data: { 
            data: error.config?.data, 
            statusText: error.response?.statusText 
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': localStorage.getItem('token') ? `Bearer ${localStorage.getItem('token')}` : undefined
          }
        }).catch(() => {}); // catch and ignore if logging fails
      } catch (e) {
        // ignore
      }
    }

    return Promise.reject(error.response?.data || { message: 'An unexpected error occurred' });
  }
);

export default api;
