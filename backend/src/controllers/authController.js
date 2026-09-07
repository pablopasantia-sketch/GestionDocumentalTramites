const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { generateToken, generateRefreshToken } = require('../utils/jwt');
const { success, error } = require('../utils/response');

/**
 * Iniciar Sesión (RF-01: Autenticación)
 */
async function login(req, res) {
  try {
    const { login: username, password, rolId, ubicacionOrgId } = req.body;

    if (!username || !password) {
      return error(res, 'Debe proporcionar el usuario y la contraseña (PIN)', 400);
    }

    // 1. Buscar usuario activo
    const [usuarios] = await pool.query(`
      SELECT 
        u.id, u.persona_id, u.login, u.password_hash, u.cargo, u.activo,
        p.nombres, p.apellido_paterno, p.apellido_materno, p.ci, p.email
      FROM usuarios u
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE u.login = ? AND u.activo = 1 AND p.activo = 1
    `, [username]);

    if (usuarios.length === 0) {
      return error(res, 'Credenciales de acceso incorrectas o usuario inactivo', 401);
    }

    const usuario = usuarios[0];

    // 2. Verificar contraseña con bcrypt
    const isPasswordValid = await bcrypt.compare(password, usuario.password_hash);
    if (!isPasswordValid) {
      return error(res, 'Credenciales de acceso incorrectas', 401);
    }

    // 3. Obtener roles asignados al usuario
    const [rolesAsignados] = await pool.query(`
      SELECT 
        ur.id AS usuario_rol_id,
        ur.rol_id,
        r.codigo AS rol_codigo,
        r.nombre AS rol_nombre,
        ur.ubicacion_org_id,
        uo.codigo AS ubicacion_codigo,
        uo.nombre AS ubicacion_nombre,
        ur.nivel_acceso,
        ur.fecha_expiracion,
        ur.filtro,
        ur.es_principal
      FROM usuario_roles ur
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE ur.usuario_id = ? AND ur.activo = 1 AND r.activo = 1 AND uo.activo = 1
        AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion >= CURDATE())
    `, [usuario.id]);

    if (rolesAsignados.length === 0) {
      return error(res, 'El usuario no tiene roles activos o vigentes asignados', 403);
    }

    // 4. Determinar el rol activo a utilizar
    let rolActivo = null;
    if (rolId && ubicacionOrgId) {
      rolActivo = rolesAsignados.find(r => r.rol_id === parseInt(rolId, 10) && r.ubicacion_org_id === parseInt(ubicacionOrgId, 10));
    }
    
    if (!rolActivo) {
      // Tomar el principal o el primero disponible
      rolActivo = rolesAsignados.find(r => r.es_principal) || rolesAsignados[0];
    }

    // 5. Actualizar último acceso
    await pool.query('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [usuario.id]);

    // 6. Generar JWT Token con payload completo
    const tokenPayload = {
      userId: usuario.id,
      personaId: usuario.persona_id,
      username: usuario.login,
      nombreCompleto: `${usuario.nombres} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim(),
      roleId: rolActivo.rol_id,
      roleCode: rolActivo.rol_codigo,
      roleName: rolActivo.rol_nombre,
      ubicacionOrgId: rolActivo.ubicacion_org_id,
      ubicacionOrgNombre: rolActivo.ubicacion_nombre,
      ubicacionOrgCodigo: rolActivo.ubicacion_codigo,
      nivelAcceso: rolActivo.nivel_acceso,
      filtro: rolActivo.filtro,
      fechaExpiracion: rolActivo.fecha_expiracion
    };

    const token = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ userId: usuario.id });

    return success(res, {
      token,
      refreshToken,
      user: {
        id: usuario.id,
        username: usuario.login,
        nombres: usuario.nombres,
        apellidos: `${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim(),
        ci: usuario.ci,
        email: usuario.email,
        cargo: usuario.cargo,
        activeRole: rolActivo,
        roles: rolesAsignados
      }
    }, 'Inicio de sesión exitoso');
  } catch (err) {
    console.error('Error en login:', err);
    return error(res, 'Ocurrió un error al procesar el inicio de sesión', 500);
  }
}

/**
 * Obtener perfil del usuario autenticado
 */
async function getProfile(req, res) {
  try {
    const userId = req.user.userId;

    const [usuarios] = await pool.query(`
      SELECT 
        u.id, u.login, u.cargo, u.ultimo_acceso,
        p.nombres, p.apellido_paterno, p.apellido_materno, p.ci, p.ci_expedido, p.sexo, p.email, p.telefono
      FROM usuarios u
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE u.id = ? AND u.activo = 1
    `, [userId]);

    if (usuarios.length === 0) {
      return error(res, 'Usuario no encontrado', 404);
    }

    const usuario = usuarios[0];

    const [roles] = await pool.query(`
      SELECT 
        ur.id, ur.rol_id, r.codigo AS rol_codigo, r.nombre AS rol_nombre,
        ur.ubicacion_org_id, uo.nombre AS ubicacion_nombre, uo.codigo AS ubicacion_codigo,
        ur.nivel_acceso, ur.fecha_expiracion, ur.es_principal
      FROM usuario_roles ur
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE ur.usuario_id = ? AND ur.activo = 1
    `, [userId]);

    return success(res, {
      user: {
        ...usuario,
        nombreCompleto: `${usuario.nombres} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim(),
        roles,
        activeRole: req.user
      }
    });
  } catch (err) {
    console.error('Error en getProfile:', err);
    return error(res, 'Error al obtener datos del perfil', 500);
  }
}

/**
 * Cambio de contraseña (RF-01.3)
 */
async function changePassword(req, res) {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return error(res, 'Debe especificar la contraseña actual y la nueva contraseña', 400);
    }

    if (confirmPassword && newPassword !== confirmPassword) {
      return error(res, 'La confirmación de la nueva clave no coincide', 400);
    }

    // Regla RF-01.1 y RF-01.3: Mínimo 6 caracteres, máximo 15 caracteres
    if (newPassword.length < 6 || newPassword.length > 20) {
      return error(res, 'La nueva clave debe tener entre 6 y 20 caracteres (PIN)', 400);
    }

    // Regla: Combinar letras con números
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    if (!hasLetter || !hasNumber) {
      return error(res, 'La nueva clave debe combinar al menos una letra y un número', 400);
    }

    const [usuarios] = await pool.query('SELECT password_hash FROM usuarios WHERE id = ?', [userId]);
    if (usuarios.length === 0) {
      return error(res, 'Usuario no encontrado', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, usuarios[0].password_hash);
    if (!isMatch) {
      return error(res, 'La contraseña actual no es correcta', 400);
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [newHash, userId]);

    return success(res, null, 'Contraseña actualizada correctamente');
  } catch (err) {
    console.error('Error en changePassword:', err);
    return error(res, 'Error al actualizar contraseña', 500);
  }
}

/**
 * Cambiar rol activo para usuarios Multi-Rol (RF-01.2 y Regla 5.3)
 */
async function switchRole(req, res) {
  try {
    const userId = req.user.userId;
    const { rolId, ubicacionOrgId } = req.body;

    if (!rolId || !ubicacionOrgId) {
      return error(res, 'Debe especificar el rol y la ubicación orgánica a activar', 400);
    }

    // Verificar que el usuario tenga asignado este rol y ubicación
    const [roles] = await pool.query(`
      SELECT 
        ur.id AS usuario_rol_id,
        ur.rol_id,
        r.codigo AS rol_codigo,
        r.nombre AS rol_nombre,
        ur.ubicacion_org_id,
        uo.codigo AS ubicacion_codigo,
        uo.nombre AS ubicacion_nombre,
        ur.nivel_acceso,
        ur.fecha_expiracion,
        ur.filtro,
        ur.es_principal
      FROM usuario_roles ur
      INNER JOIN roles r ON ur.rol_id = r.id
      INNER JOIN ubicaciones_org uo ON ur.ubicacion_org_id = uo.id
      WHERE ur.usuario_id = ? AND ur.rol_id = ? AND ur.ubicacion_org_id = ?
        AND ur.activo = 1 AND r.activo = 1 AND uo.activo = 1
        AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion >= CURDATE())
    `, [userId, rolId, ubicacionOrgId]);

    if (roles.length === 0) {
      return error(res, 'El rol seleccionado no está asignado o se encuentra inactivo/expirado', 403);
    }

    const rolActivo = roles[0];

    // Obtener datos del usuario
    const [usuarios] = await pool.query(`
      SELECT u.id, u.persona_id, u.login, p.nombres, p.apellido_paterno, p.apellido_materno
      FROM usuarios u
      INNER JOIN personas p ON u.persona_id = p.id
      WHERE u.id = ?
    `, [userId]);

    const usuario = usuarios[0];

    const tokenPayload = {
      userId: usuario.id,
      personaId: usuario.persona_id,
      username: usuario.login,
      nombreCompleto: `${usuario.nombres} ${usuario.apellido_paterno} ${usuario.apellido_materno || ''}`.trim(),
      roleId: rolActivo.rol_id,
      roleCode: rolActivo.rol_codigo,
      roleName: rolActivo.rol_nombre,
      ubicacionOrgId: rolActivo.ubicacion_org_id,
      ubicacionOrgNombre: rolActivo.ubicacion_nombre,
      ubicacionOrgCodigo: rolActivo.ubicacion_codigo,
      nivelAcceso: rolActivo.nivel_acceso,
      filtro: rolActivo.filtro,
      fechaExpiracion: rolActivo.fecha_expiracion
    };

    const token = generateToken(tokenPayload);

    return success(res, {
      token,
      activeRole: rolActivo
    }, `Rol activo cambiado a ${rolActivo.rol_nombre}`);
  } catch (err) {
    console.error('Error en switchRole:', err);
    return error(res, 'Error al cambiar de rol activo', 500);
  }
}

module.exports = {
  login,
  getProfile,
  changePassword,
  switchRole
};
