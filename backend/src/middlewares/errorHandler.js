const { error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('💥 Error no controlado:', err);

  if (err.name === 'UnauthorizedError' || err.name === 'JsonWebTokenError') {
    return error(res, 'Token de autenticación inválido o expirado', 401);
  }

  if (err.code === 'ER_DUP_ENTRY') {
    return error(res, 'Ya existe un registro con los datos únicos proporcionados', 409);
  }

  if (err.code === 'ER_ROW_IS_REFERENCED_2' || err.code === 'ER_NO_REFERENCED_ROW_2') {
    return error(res, 'No se puede realizar la operación debido a restricciones de integridad referencial', 400);
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  
  return error(res, message, statusCode, process.env.NODE_ENV === 'development' ? err.stack : null);
}

module.exports = errorHandler;
