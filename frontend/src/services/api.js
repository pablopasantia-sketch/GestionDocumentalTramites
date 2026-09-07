import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor para inyectar token JWT automáticamente
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('wayka_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para manejo unificado de errores
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si la sesión expiró y no estamos ya en login, limpiar storage
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('wayka_token');
        localStorage.removeItem('wayka_user');
      }
    }
    return Promise.reject(error);
  }
);

// Servicios de Diagnóstico y Salud
export const healthService = {
  getHealth: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Servicios de Autenticación
export const authService = {
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
  changePassword: async (data) => {
    const response = await api.post('/auth/change-password', data);
    return response.data;
  },
  switchRole: async (data) => {
    const response = await api.post('/auth/switch-role', data);
    return response.data;
  },
};

export default api;
