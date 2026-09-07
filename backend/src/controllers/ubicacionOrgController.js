const UbicacionOrg = require('../models/UbicacionOrg');
const { success, error } = require('../utils/response');

/**
 * Listar todas las ubicaciones orgánicas
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
 * Obtener árbol de organigrama
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

module.exports = {
  listarUbicaciones,
  obtenerArbol
};
