import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

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
