const Rol = require('../models/Rol');
const { success, error } = require('../utils/response');

/**
 * Listar roles del sistema
 */
async function listarRoles(req, res) {
  try {
    const { activo = 'true' } = req.query;
    const soloActivos = activo === 'all' ? null : activo === 'true';

    const roles = await Rol.findAll({ activo: soloActivos });
    return success(res, roles, 'Roles obtenidos correctamente');
  } catch (err) {
    console.error('Error al listar roles:', err);
    return error(res, 'Error al obtener roles', 500, err.message);
  }
}

/**
 * Obtener rol por ID
 */
async function obtenerRolPorId(req, res) {
  try {
    const { id } = req.params;
    const rol = await Rol.findById(id);

    if (!rol) {
      return error(res, 'Rol no encontrado', 404);
    }

    return success(res, rol, 'Rol encontrado');
  } catch (err) {
    console.error('Error al obtener rol:', err);
    return error(res, 'Error al obtener rol', 500, err.message);
  }
}

/**
 * Crear nuevo rol
 */
async function crearRol(req, res) {
  try {
    const { codigo, nombre, descripcion = null } = req.body;

    if (!codigo || !nombre) {
      return error(res, 'El código y nombre del rol son obligatorios', 400);
    }

    const codigoUpper = codigo.toUpperCase().trim();
    const existente = await Rol.findByCodigo(codigoUpper);
    if (existente) {
      return error(res, `Ya existe un rol con el código '${codigoUpper}'`, 409);
    }

    const nuevoRol = await Rol.create({
      codigo: codigoUpper,
      nombre: nombre.trim(),
      descripcion
    });

    return success(res, nuevoRol, 'Rol creado exitosamente', 201);
  } catch (err) {
    console.error('Error al crear rol:', err);
    return error(res, 'Error al crear rol', 500, err.message);
  }
}

/**
 * Actualizar rol
 */
async function actualizarRol(req, res) {
  try {
    const { id } = req.params;
    const rol = await Rol.findById(id);

    if (!rol) {
      return error(res, 'Rol no encontrado', 404);
    }

    // Proteger roles base del sistema para que no se cambie su código crítico
    const rolesProtegidos = ['ADMIN_SISTEMA', 'ADMIN_WAYKA', 'VENTANILLA_UNICA', 'FUNCIONARIO'];
    if (rolesProtegidos.includes(rol.codigo) && req.body.codigo && req.body.codigo !== rol.codigo) {
      return error(res, 'No se permite modificar el código de los roles fundamentales del sistema', 400);
    }

    const actualizado = await Rol.update(id, req.body);
    return success(res, actualizado, 'Rol actualizado correctamente');
  } catch (err) {
    console.error('Error al actualizar rol:', err);
    return error(res, 'Error al actualizar datos del rol', 500, err.message);
  }
}

/**
 * Borrado lógico de rol con verificación de dependencias
 */
async function eliminarRol(req, res) {
  try {
    const { id } = req.params;
    const rol = await Rol.findById(id);

    if (!rol) {
      return error(res, 'Rol no encontrado', 404);
    }

    const rolesProtegidos = ['ADMIN_SISTEMA', 'ADMIN_WAYKA', 'VENTANILLA_UNICA', 'FUNCIONARIO'];
    if (rolesProtegidos.includes(rol.codigo)) {
      return error(res, 'No se puede eliminar un rol protegido del sistema Wayka', 400);
    }

    await Rol.softDelete(id);
    return success(res, { id }, 'Rol dado de baja exitosamente');
  } catch (err) {
    console.error('Error al eliminar rol:', err);
    return error(res, err.message || 'No se puede eliminar el rol', 400);
  }
}

module.exports = {
  listarRoles,
  obtenerRolPorId,
  crearRol,
  actualizarRol,
  eliminarRol
};
