const UbicacionOrg = require('../models/UbicacionOrg');
const { success, error } = require('../utils/response');

/**
 * Listar todas las ubicaciones orgánicas (con filtro activo)
 */
async function listarUbicaciones(req, res) {
  try {
    const { activo = 'true' } = req.query;
    const soloActivos = activo === 'all' ? null : activo === 'true';

    const ubicaciones = await UbicacionOrg.findAll({ activo: soloActivos });
    return success(res, ubicaciones, 'Ubicaciones orgánicas obtenidas');
  } catch (err) {
    console.error('Error al listar ubicaciones orgánicas:', err);
    return error(res, 'Error al obtener ubicaciones', 500, err.message);
  }
}

/**
 * Obtener árbol de organigrama (estructura jerárquica)
 */
async function obtenerArbol(req, res) {
  try {
    const arbol = await UbicacionOrg.findTree();
    return success(res, arbol, 'Árbol de organigrama obtenido');
  } catch (err) {
    console.error('Error al obtener árbol de organigrama:', err);
    return error(res, 'Error al obtener organigrama', 500, err.message);
  }
}

/**
 * Obtener una ubicación orgánica por ID
 */
async function obtenerUbicacion(req, res) {
  try {
    const { id } = req.params;
    const ubicacion = await UbicacionOrg.findById(id);
    if (!ubicacion) {
      return error(res, 'Ubicación orgánica no encontrada', 404);
    }
    return success(res, ubicacion, 'Ubicación orgánica obtenida');
  } catch (err) {
    console.error('Error al obtener ubicación orgánica:', err);
    return error(res, 'Error al obtener ubicación', 500, err.message);
  }
}

/**
 * Crear una nueva ubicación orgánica (RF-02.6)
 */
async function crearUbicacion(req, res) {
  try {
    const { codigo, nombre, sigla, padre_id, descripcion } = req.body;

    // Validaciones básicas
    if (!codigo || !nombre) {
      return error(res, 'Los campos código y nombre son obligatorios.', 400);
    }

    // Verificar que el código no exista ya (activo o no)
    const existe = await UbicacionOrg.findByCodigo(codigo.trim().toUpperCase());
    if (existe) {
      return error(res, `Ya existe una unidad con el código "${codigo.toUpperCase()}". El código debe ser único.`, 400);
    }

    // Si se especifica padre, verificar que exista y esté activo
    if (padre_id) {
      const padre = await UbicacionOrg.findById(padre_id);
      if (!padre || !padre.activo) {
        return error(res, 'La unidad padre especificada no existe o está inactiva.', 400);
      }
    }

    const nueva = await UbicacionOrg.create({
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      sigla: sigla ? sigla.trim().toUpperCase() : null,
      padre_id: padre_id || null,
      descripcion: descripcion ? descripcion.trim() : null
    });

    return success(res, nueva, 'Ubicación orgánica creada exitosamente', 201);
  } catch (err) {
    console.error('Error al crear ubicación orgánica:', err);
    return error(res, 'Error al crear ubicación', 500, err.message);
  }
}

/**
 * Actualizar una ubicación orgánica (RF-02.6)
 */
async function actualizarUbicacion(req, res) {
  try {
    const { id } = req.params;
    const { codigo, nombre, sigla, padre_id, descripcion, activo } = req.body;

    const ubicacion = await UbicacionOrg.findById(id);
    if (!ubicacion) {
      return error(res, 'Ubicación orgánica no encontrada', 404);
    }

    // Si se cambia el código, verificar que no exista otro con ese código
    if (codigo && codigo.trim().toUpperCase() !== ubicacion.codigo) {
      const existe = await UbicacionOrg.findByCodigo(codigo.trim().toUpperCase());
      if (existe && existe.id !== parseInt(id)) {
        return error(res, `Ya existe una unidad con el código "${codigo.toUpperCase()}".`, 400);
      }
    }

    // Verificar que no sea su propio padre (ciclo)
    if (padre_id && parseInt(padre_id) === parseInt(id)) {
      return error(res, 'Una unidad no puede ser su propio padre.', 400);
    }

    // Si se especifica padre, verificar que exista y esté activo
    if (padre_id) {
      const padre = await UbicacionOrg.findById(padre_id);
      if (!padre || !padre.activo) {
        return error(res, 'La unidad padre especificada no existe o está inactiva.', 400);
      }
    }

    const data = {};
    if (codigo !== undefined) data.codigo = codigo.trim().toUpperCase();
    if (nombre !== undefined) data.nombre = nombre.trim();
    if (sigla !== undefined) data.sigla = sigla ? sigla.trim().toUpperCase() : null;
    if (padre_id !== undefined) data.padre_id = padre_id || null;
    if (descripcion !== undefined) data.descripcion = descripcion ? descripcion.trim() : null;
    if (activo !== undefined) data.activo = activo;

    const actualizada = await UbicacionOrg.update(id, data);
    return success(res, actualizada, 'Ubicación orgánica actualizada exitosamente');
  } catch (err) {
    console.error('Error al actualizar ubicación orgánica:', err);
    return error(res, 'Error al actualizar ubicación', 500, err.message);
  }
}

/**
 * Dar de baja lógica a una ubicación orgánica (RF-02.9, RF-02.10)
 */
async function eliminarUbicacion(req, res) {
  try {
    const { id } = req.params;

    const ubicacion = await UbicacionOrg.findById(id);
    if (!ubicacion) {
      return error(res, 'Ubicación orgánica no encontrada', 404);
    }

    await UbicacionOrg.softDelete(id);
    return success(res, null, `La unidad "${ubicacion.nombre}" fue dada de baja correctamente.`);
  } catch (err) {
    if (err.message && (err.message.includes('sub-unidades') || err.message.includes('funcionarios'))) {
      return error(res, err.message, 400);
    }
    console.error('Error al eliminar ubicación orgánica:', err);
    return error(res, 'Error al eliminar ubicación', 500, err.message);
  }
}

module.exports = {
  listarUbicaciones,
  obtenerArbol,
  obtenerUbicacion,
  crearUbicacion,
  actualizarUbicacion,
  eliminarUbicacion
};
