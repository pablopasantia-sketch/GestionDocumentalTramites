const { error } = require('../utils/response');

/**
 * Middleware para restringir endpoints a roles específicos
 * @param  {...string} allowedRoles Códigos de roles permitidos (ej: 'ADMIN_SISTEMA', 'ADMIN_WAYKA')
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.roleCode) {
      return error(res, 'Acceso denegado: Usuario sin rol activo especificado', 403);
    }

    if (!allowedRoles.includes(req.user.roleCode)) {
      return error(res, `Acceso denegado: Se requiere uno de los siguientes roles: ${allowedRoles.join(', ')}`, 403);
    }

    next();
  };
}

module.exports = authorizeRoles;
