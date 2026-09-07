const Usuario = require('../models/Usuario');
const Persona = require('../models/Persona');
const { success, error } = require('../utils/response');

/**
 * Listar usuarios con búsqueda y roles asociados
 */
async function listarUsuarios(req, res) {
  try {
    const { search = '', activo = 'true' } = req.query;
    const soloActivos = activo === 'all' ? null : activo === 'true';

    const usuarios = await Usuario.findAll({ search, activo: soloActivos });

    // Enriquecer cada usuario con sus roles asignados actuales
    const usuariosConRoles = await Promise.all(
      usuarios.map(async (u) => {
        const roles = await Usuario.getRoles(u.id);
        return {
          ...u,
          roles
        };
      })
    );

    return success(res, usuariosConRoles, 'Listado de usuarios obtenido correctamente');
  } catch (err) {
    console.error('Error al listar usuarios:', err);
    return error(res, 'Error al obtener usuarios', 500, err.message);
  }
}

/**
 * Obtener detalle de usuario por ID con roles
 */
async function obtenerUsuarioPorId(req, res) {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return error(res, 'Usuario no encontrado', 404);
    }

    const roles = await Usuario.getRoles(id);
    return success(res, { ...usuario, roles }, 'Detalle de usuario');
  } catch (err) {
    console.error('Error al obtener usuario:', err);
    return error(res, 'Error al obtener usuario', 500, err.message);
  }
}

/**
 * Crear un nuevo usuario en el sistema
 */
async function crearUsuario(req, res) {
  try {
    const { persona_id, login, password, cargo = null } = req.body;

    if (!persona_id || !login || !password) {
      return error(res, 'Campos obligatorios faltantes: persona_id, login y password son requeridos', 400);
    }

    // Validar longitud de contraseña
    if (password.length < 6 || password.length > 50) {
      return error(res, 'La contraseña debe tener entre 6 y 50 caracteres', 400);
    }

    // Validar existencia de la persona
    const persona = await Persona.findById(persona_id);
    if (!persona || !persona.activo) {
      return error(res, 'La persona seleccionada no existe o no se encuentra activa', 400);
    }

    // Verificar si el login ya está en uso
    const existenteLogin = await Usuario.findByLogin(login);
    if (existenteLogin) {
      return error(res, `El nombre de usuario '${login}' ya se encuentra registrado`, 409);
    }

    const nuevoUsuario = await Usuario.create({
      persona_id,
      login,
      password,
      cargo
    });

    return success(res, nuevoUsuario, 'Usuario creado exitosamente en el sistema', 201);
  } catch (err) {
    console.error('Error al crear usuario:', err);
    return error(res, 'Error al registrar el usuario', 500, err.message);
  }
}

/**
 * Actualizar datos de usuario (cargo, activo)
 */
async function actualizarUsuario(req, res) {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return error(res, 'Usuario no encontrado', 404);
    }

    const { cargo, activo } = req.body;
    const actualizado = await Usuario.update(id, { cargo, activo });

    return success(res, actualizado, 'Usuario actualizado correctamente');
  } catch (err) {
    console.error('Error al actualizar usuario:', err);
    return error(res, 'Error al actualizar datos del usuario', 500, err.message);
  }
}

/**
 * Restablecer contraseña de usuario (Administración)
 */
async function resetPassword(req, res) {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6 || newPassword.length > 50) {
      return error(res, 'La nueva contraseña debe tener entre 6 y 50 caracteres', 400);
    }

    const usuario = await Usuario.findById(id);
    if (!usuario) {
      return error(res, 'Usuario no encontrado', 404);
    }

    await Usuario.updatePassword(id, newPassword);
    return success(res, { id }, 'Contraseña restablecida exitosamente');
  } catch (err) {
    console.error('Error al restablecer contraseña:', err);
    return error(res, 'Error al restablecer la contraseña', 500, err.message);
  }
}

/**
 * Borrado lógico de usuario
 */
async function eliminarUsuario(req, res) {
  try {
    const { id } = req.params;
    const usuario = await Usuario.findById(id);

    if (!usuario) {
      return error(res, 'Usuario no encontrado', 404);
    }

    // Evitar que el usuario admin principal se elimine a sí mismo
    if (parseInt(id, 10) === req.user?.userId) {
      return error(res, 'No puede dar de baja su propio usuario mientras tiene la sesión activa', 400);
    }

    await Usuario.softDelete(id);
    return success(res, { id }, 'Usuario y sus roles asociados dados de baja exitosamente');
  } catch (err) {
    console.error('Error al eliminar usuario:', err);
    return error(res, 'Error al dar de baja el usuario', 500, err.message);
  }
}

module.exports = {
  listarUsuarios,
  obtenerUsuarioPorId,
  crearUsuario,
  actualizarUsuario,
  resetPassword,
  eliminarUsuario
};
