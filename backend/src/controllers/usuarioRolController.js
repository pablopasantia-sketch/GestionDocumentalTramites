const UsuarioRol = require('../models/UsuarioRol');
const Usuario = require('../models/Usuario');
const Rol = require('../models/Rol');
const UbicacionOrg = require('../models/UbicacionOrg');
const { success, error } = require('../utils/response');

/**
 * Listar asignaciones de rol (globales o filtradas por usuario)
 */
async function listarAsignaciones(req, res) {
  try {
    const { usuario_id, rol_id, ubicacion_org_id, activo = 'true' } = req.query;
    const soloActivos = activo === 'all' ? null : activo === 'true';

    const asignaciones = await UsuarioRol.findAll({
      usuario_id: usuario_id ? parseInt(usuario_id, 10) : null,
      rol_id: rol_id ? parseInt(rol_id, 10) : null,
      ubicacion_org_id: ubicacion_org_id ? parseInt(ubicacion_org_id, 10) : null,
      activo: soloActivos
    });

    return success(res, asignaciones, 'Asignaciones obtenidas correctamente');
  } catch (err) {
    console.error('Error al listar asignaciones usuario-rol:', err);
    return error(res, 'Error al obtener asignaciones', 500, err.message);
  }
}

/**
 * Obtener roles asignados a un usuario específico
 */
async function obtenerRolesPorUsuario(req, res) {
  try {
    const { usuarioId } = req.params;
    const roles = await UsuarioRol.findByUsuario(usuarioId, { soloActivos: false });
    return success(res, roles, `Roles del usuario ${usuarioId}`);
  } catch (err) {
    console.error('Error al obtener roles de usuario:', err);
    return error(res, 'Error al obtener roles del usuario', 500, err.message);
  }
}

/**
 * Asignar un rol con ubicación a un usuario
 */
async function asignarRol(req, res) {
  try {
    const {
      usuario_id,
      rol_id,
      ubicacion_org_id,
      nivel_acceso = 'CONTROL_TOTAL',
      fecha_expiracion = null,
      filtro = null,
      es_principal = false
    } = req.body;

    if (!usuario_id || !rol_id || !ubicacion_org_id) {
      return error(res, 'Campos obligatorios: usuario_id, rol_id y ubicacion_org_id son requeridos', 400);
    }

    // Validar usuario
    const usuario = await Usuario.findById(usuario_id);
    if (!usuario || !usuario.activo) {
      return error(res, 'El usuario seleccionado no existe o está inactivo', 400);
    }

    // Validar rol
    const rol = await Rol.findById(rol_id);
    if (!rol || !rol.activo) {
      return error(res, 'El rol seleccionado no existe o está inactivo', 400);
    }

    // Validar ubicación orgánica
    const ubicacion = await UbicacionOrg.findById(ubicacion_org_id);
    if (!ubicacion || !ubicacion.activo) {
      return error(res, 'La ubicación orgánica (oficina) seleccionada no existe o está inactiva', 400);
    }

    // Si el usuario no tiene roles activos previos, marcarlo como principal por defecto
    const rolesPrevios = await UsuarioRol.findByUsuario(usuario_id, { soloActivos: true });
    const debeSerPrincipal = es_principal || rolesPrevios.length === 0;

    const nuevaAsignacion = await UsuarioRol.create({
      usuario_id,
      rol_id,
      ubicacion_org_id,
      nivel_acceso,
      fecha_expiracion: fecha_expiracion || null,
      filtro,
      es_principal: debeSerPrincipal
    });

    return success(res, nuevaAsignacion, 'Rol asignado al usuario exitosamente', 201);
  } catch (err) {
    console.error('Error al asignar rol:', err);
    return error(res, 'Error al asignar el rol al usuario', 500, err.message);
  }
}

/**
 * Actualizar una asignación de rol (nivel, vigencia, filtro, etc.)
 */
async function actualizarAsignacion(req, res) {
  try {
    const { id } = req.params;
    const asignacion = await UsuarioRol.findById(id);

    if (!asignacion) {
      return error(res, 'Asignación no encontrada', 404);
    }

    const actualizada = await UsuarioRol.update(id, req.body);
    return success(res, actualizada, 'Asignación de rol actualizada');
  } catch (err) {
    console.error('Error al actualizar asignación:', err);
    return error(res, 'Error al actualizar asignación', 500, err.message);
  }
}

/**
 * Marcar rol como principal para el usuario
 */
async function marcarPrincipal(req, res) {
  try {
    const { id } = req.params;
    const asignacion = await UsuarioRol.findById(id);

    if (!asignacion) {
      return error(res, 'Asignación no encontrada', 404);
    }

    const actualizada = await UsuarioRol.setPrincipal(asignacion.usuario_id, id);
    return success(res, actualizada, 'Rol marcado como principal para el usuario');
  } catch (err) {
    console.error('Error al marcar rol principal:', err);
    return error(res, 'Error al marcar rol principal', 500, err.message);
  }
}

/**
 * Desasignar/dar de baja un rol a un usuario (borrado lógico)
 */
async function eliminarAsignacion(req, res) {
  try {
    const { id } = req.params;
    const asignacion = await UsuarioRol.findById(id);

    if (!asignacion) {
      return error(res, 'Asignación no encontrada', 404);
    }

    await UsuarioRol.softDelete(id);
    return success(res, { id }, 'Rol desasignado exitosamente');
  } catch (err) {
    console.error('Error al desasignar rol:', err);
    return error(res, 'Error al desasignar rol', 500, err.message);
  }
}

module.exports = {
  listarAsignaciones,
  obtenerRolesPorUsuario,
  asignarRol,
  actualizarAsignacion,
  marcarPrincipal,
  eliminarAsignacion
};
