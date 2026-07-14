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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && originalRequest.url !== '/auth/login' && originalRequest.url !== '/auth/refresh') {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(`${baseURL}/auth/refresh`, {}, { withCredentials: true });
        
        if (data.success && data.token) {
          localStorage.setItem('token', data.token);
          api.defaults.headers.common['Authorization'] = 'Bearer ' + data.token;
          originalRequest.headers['Authorization'] = 'Bearer ' + data.token;
          processQueue(null, data.token);
          return api(originalRequest);
        } else {
          throw new Error('Refresh failed');
        }
      } catch (err) {
        processQueue(err, null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth-error'));
        return Promise.reject(err?.response?.data || err);
      } finally {
        isRefreshing = false;
      }
    } else if (error.response?.status === 401) {
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
