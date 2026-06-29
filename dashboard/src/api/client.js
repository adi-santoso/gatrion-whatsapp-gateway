import axios from 'axios';

// Use relative URL for production compatibility
const API_BASE = window.location.origin + '/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add API key to all requests
api.interceptors.request.use((config) => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['x-api-key'] = apiKey;
  }
  return config;
});

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('apiKey');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const sessionApi = {
  list: () => api.get('/sessions'),
  create: (data) => api.post('/sessions', data),
  get: (id) => api.get(`/sessions/${id}`),
  delete: (id) => api.delete(`/sessions/${id}`),
  getQR: (id) => api.get(`/sessions/${id}/qr`),
};

export const messageApi = {
  sendText: (data) => api.post('/send-text', data),
  sendImage: (data) => api.post('/send-image', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const analyticsApi = {
  getAll: () => api.get('/analytics/all'),
  getSession: (sessionId) => api.get(`/analytics?sessionId=${sessionId}`),
  getAggregate: () => api.get('/analytics/aggregate'),
};
