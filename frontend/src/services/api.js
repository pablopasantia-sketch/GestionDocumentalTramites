import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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
    const token = localStorage.getItem('gestion_doc_token');
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
        localStorage.removeItem('gestion_doc_token');
        localStorage.removeItem('gestion_doc_user');
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

// Servicios de Personas (RF-02.1)
export const personasService = {
  getAll: async (params = {}) => {
    const response = await api.get('/personas', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/personas/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/personas', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/personas/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/personas/${id}`);
    return response.data;
  },
  reactivar: async (id) => {
    const response = await api.patch(`/personas/${id}/reactivar`);
    return response.data;
  },
};

// Servicios de Usuarios (RF-02.2)
export const usuariosService = {
  getAll: async (params = {}) => {
    const response = await api.get('/usuarios', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/usuarios/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/usuarios', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/usuarios/${id}`, data);
    return response.data;
  },
  resetPassword: async (id, newPassword) => {
    const response = await api.post(`/usuarios/${id}/reset-password`, { newPassword });
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/usuarios/${id}`);
    return response.data;
  },
  reactivar: async (id) => {
    const response = await api.patch(`/usuarios/${id}/reactivar`);
    return response.data;
  },
};

// Servicios de Roles (RF-02.3)
export const rolesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/roles', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/roles/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/roles', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/roles/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/roles/${id}`);
    return response.data;
  },
};

// Servicios de Usuario-Rol (RF-02.4 y RF-02.5)
export const usuarioRolesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/usuario-roles', { params });
    return response.data;
  },
  getByUsuario: async (usuarioId) => {
    const response = await api.get(`/usuario-roles/usuario/${usuarioId}`);
    return response.data;
  },
  assign: async (data) => {
    const response = await api.post('/usuario-roles', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/usuario-roles/${id}`, data);
    return response.data;
  },
  setPrincipal: async (id) => {
    const response = await api.patch(`/usuario-roles/${id}/principal`);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/usuario-roles/${id}`);
    return response.data;
  },
};

// Servicios de Ubicaciones Orgánicas (Oficinas / Organigrama) — RF-02.6
export const ubicacionesService = {
  getAll: async (params = {}) => {
    const response = await api.get('/ubicaciones', { params });
    return response.data;
  },
  getArbol: async () => {
    const response = await api.get('/ubicaciones/arbol');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/ubicaciones/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/ubicaciones', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/ubicaciones/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/ubicaciones/${id}`);
    return response.data;
  },
  reactivar: async (id) => {
    const response = await api.patch(`/ubicaciones/${id}/reactivar`);
    return response.data;
  },
};

// Servicios de Trámites y Workflow (RF-09.1, RF-10)
export const tramitesService = {
  consultaPublica: async (correlativo, gestion) => {
    const response = await api.get('/tramites/public/consulta', {
      params: { correlativo, gestion }
    });
    return response.data;
  },
  getAll: async (params = {}) => {
    const response = await api.get('/tramites', { params });
    return response.data;
  },
  getStats: async (gestion) => {
    const response = await api.get('/tramites/stats', { params: { gestion } });
    return response.data;
  },
  anular: async (id, motivo) => {
    const response = await api.post(`/tramites/${id}/anular`, { motivo });
    return response.data;
  }
};

// Servicios de Tipos de Proceso (Admin Trámites)
export const tiposProcesoService = {
  getAll: async (params = {}) => {
    const response = await api.get('/tipos-proceso', { params });
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/tipos-proceso/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/tipos-proceso', data);
    return response.data;
  },
  update: async (id, data) => {
    const response = await api.put(`/tipos-proceso/${id}`, data);
    return response.data;
  },
  delete: async (id) => {
    const response = await api.delete(`/tipos-proceso/${id}`);
    return response.data;
  },
  toggleActivo: async (id) => {
    const response = await api.patch(`/tipos-proceso/${id}/toggle-activo`);
    return response.data;
  }
};

// Servicios Institucionales (Sprint 2 - DBNotasCMS: TUnidad, TCargo, TEmpleados)
export const institucionalService = {
  getUnidades: async (params = {}) => {
    const response = await api.get('/institucional/unidades', { params });
    return response.data;
  },
  createUnidad: async (data) => {
    const response = await api.post('/institucional/unidades', data);
    return response.data;
  },
  updateUnidad: async (codU, data) => {
    const response = await api.put(`/institucional/unidades/${codU}`, data);
    return response.data;
  },
  deleteUnidad: async (codU) => {
    const response = await api.delete(`/institucional/unidades/${codU}`);
    return response.data;
  },

  getCargos: async (params = {}) => {
    const response = await api.get('/institucional/cargos', { params });
    return response.data;
  },
  createCargo: async (data) => {
    const response = await api.post('/institucional/cargos', data);
    return response.data;
  },
  updateCargo: async (codCargo, data) => {
    const response = await api.put(`/institucional/cargos/${codCargo}`, data);
    return response.data;
  },
  deleteCargo: async (codCargo) => {
    const response = await api.delete(`/institucional/cargos/${codCargo}`);
    return response.data;
  },

  getEmpleados: async (params = {}) => {
    const response = await api.get('/institucional/empleados', { params });
    return response.data;
  },
  getEmpleadoPorCi: async (ci) => {
    const response = await api.get(`/institucional/empleados/${ci}`);
    return response.data;
  },
  seed: async () => {
    const response = await api.post('/institucional/seed');
    return response.data;
  },
};

export default api;
