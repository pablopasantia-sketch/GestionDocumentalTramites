// =============================================================================
// Matriz institucional de rutas y roles (RF-2.2 / RF-5.3)
//
// Única fuente de verdad para decidir qué módulo puede abrir el rol ACTIVO del
// JWT. Los roles secundarios del usuario NO habilitan acceso: solo cuenta
// `activeRole.rol_codigo`.
// =============================================================================

export const ROLES = Object.freeze({
  ADMIN_SISTEMA: 'ADMIN_SISTEMA',
  ADMIN_TRAMITES: 'ADMIN_TRAMITES',
  FUNCIONARIO: 'FUNCIONARIO',
  VENTANILLA_UNICA: 'VENTANILLA_UNICA',
});

// Todo rol operativo, excepto Administrador de Sistema, puede usar el
// Escritorio Virtual (bandejas de trámites).
const ROLES_OPERATIVOS = Object.freeze([
  ROLES.FUNCIONARIO,
  ROLES.VENTANILLA_UNICA,
  ROLES.ADMIN_TRAMITES,
]);

export const RUTAS_PUBLICAS = Object.freeze(['/', '/consulta', '/buscar', '/login']);

/**
 * Rutas protegidas de la aplicación.
 * `nav` describe únicamente la presentación del enlace en el menú; `roles`
 * es la lista autorizada con base en el rol activo.
 */
export const MATRIZ_RUTAS_ROLES = Object.freeze({
  '/ventanilla': Object.freeze({
    roles: Object.freeze([ROLES.VENTANILLA_UNICA]),
    nav: Object.freeze({ label: 'Ventanilla Única', icon: 'inbox' }),
  }),
  '/escritorio': Object.freeze({
    roles: ROLES_OPERATIVOS,
    nav: Object.freeze({ label: 'Escritorio Virtual', icon: 'layers' }),
  }),
  '/admin': Object.freeze({
    roles: Object.freeze([ROLES.ADMIN_SISTEMA, ROLES.ADMIN_TRAMITES]),
    nav: Object.freeze({
      label: (rolCodigo) =>
        rolCodigo === ROLES.ADMIN_SISTEMA
          ? 'Admin. Sistemas'
          : 'Supervisión de Trámites',
      icon: (rolCodigo) =>
        rolCodigo === ROLES.ADMIN_SISTEMA ? 'shield' : 'gitBranch',
    }),
  }),
  '/status': Object.freeze({
    roles: Object.freeze([ROLES.ADMIN_SISTEMA]),
    nav: Object.freeze({ label: 'Diagnóstico BD', icon: 'activity' }),
  }),
});

function normalizarPath(path = '') {
  if (!path) return '/';
  const sinParametros = path.split(/[?#]/)[0];
  if (sinParametros.length <= 1) return '/';
  return sinParametros.replace(/\/+$/, '') || '/';
}

/** Devuelve los roles autorizados para una ruta, o null si no está restringida. */
export function obtenerRolesPermitidos(path) {
  return MATRIZ_RUTAS_ROLES[normalizarPath(path)]?.roles ?? null;
}

/** Comprueba el acceso usando exclusivamente el rol activo. */
export function puedeAccederRuta(path, rolCodigo) {
  const ruta = normalizarPath(path);
  if (RUTAS_PUBLICAS.includes(ruta)) return true;

  const rolesPermitidos = obtenerRolesPermitidos(ruta);
  if (!rolesPermitidos) return true;

  return rolesPermitidos.includes(rolCodigo);
}

// Alias semántico para los call sites que trabajan con location.pathname.
export const puedeAccederPath = puedeAccederRuta;
