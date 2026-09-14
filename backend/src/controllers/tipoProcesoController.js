const TipoProceso = require('../models/TipoProceso');
const { success, error } = require('../utils/response');

async function listar(req, res) {
  try {
    const { tipo_categoria, search } = req.query;
    const tipos = await TipoProceso.findAll({ tipo_categoria, search });
    return success(res, tipos);
  } catch (err) {
    console.error('Error al listar tipos de proceso:', err);
    return error(res, 'Error al listar tipos de proceso', 500);
  }
}

async function obtenerPorId(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const tipo = await TipoProceso.findById(id);
    if (!tipo) return error(res, 'Tipo de proceso no encontrado', 404);
    return success(res, tipo);
  } catch (err) {
    console.error('Error al obtener tipo de proceso:', err);
    return error(res, 'Error al obtener tipo de proceso', 500);
  }
}

async function crear(req, res) {
  try {
    const { codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, tiempo_estimado_horas } = req.body;

    if (!codigo || !nombre) {
      return error(res, 'Código y nombre son obligatorios', 400);
    }

    const existe = await TipoProceso.findByCodigo(codigo.trim());
    if (existe) {
      return error(res, `Ya existe un tipo de proceso con el código "${codigo}"`, 409);
    }

    const nuevo = await TipoProceso.create({
      codigo: codigo.trim().toUpperCase(),
      nombre: nombre.trim(),
      descripcion,
      tipo_categoria: tipo_categoria || 'TRAMITE',
      ubicacion_org_id: ubicacion_org_id ? parseInt(ubicacion_org_id, 10) : null,
      tiempo_estimado_horas: tiempo_estimado_horas ? parseInt(tiempo_estimado_horas, 10) : 24
    });

    return success(res, nuevo, 'Tipo de proceso registrado con éxito', 201);
  } catch (err) {
    console.error('Error al crear tipo de proceso:', err);
    return error(res, 'Error al crear tipo de proceso', 500);
  }
}

async function actualizar(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const actualizado = await TipoProceso.update(id, req.body);
    return success(res, actualizado, 'Tipo de proceso actualizado');
  } catch (err) {
    console.error('Error al actualizar tipo de proceso:', err);
    return error(res, 'Error al actualizar tipo de proceso', 500);
  }
}

async function eliminar(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    await TipoProceso.softDelete(id);
    return success(res, null, 'Tipo de proceso dado de baja');
  } catch (err) {
    console.error('Error al eliminar tipo de proceso:', err);
    return error(res, err.message || 'Error al eliminar tipo de proceso', 400);
  }
}

module.exports = {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
