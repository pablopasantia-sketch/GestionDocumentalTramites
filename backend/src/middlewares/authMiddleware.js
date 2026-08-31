const { verifyToken } = require('../utils/jwt');
const { error } = require('../utils/response');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return error(res, 'Acceso no autorizado: Token no proporcionado', 401);
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return error(res, 'Sesión inválida o expirada. Por favor inicie sesión nuevamente.', 401);
  }

  // Comprobar si el usuario-rol está expirado
  if (decoded.fechaExpiracion && new Date(decoded.fechaExpiracion) < new Date()) {
    return error(res, 'El acceso asignado a su rol ha expirado', 403);
  }

  req.user = decoded;
  next();
}

module.exports = authenticateToken;
