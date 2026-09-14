const Tramite = require('../models/Tramite');
const Movimiento = require('../models/Movimiento');
const { success, error } = require('../utils/response');

/**
 * Consulta pública de trámite por Hoja de Ruta / Correlativo (RF-09.1)
 * Sin autenticación para acceso ciudadano
 */
async function consultaPublica(req, res) {
  try {
    const { correlativo, gestion } = req.query;

    if (!correlativo) {
      return error(res, 'Debe especificar el número de correlativo u hoja de ruta (ej: SV-1/2026)', 400);
    }

    const year = gestion ? parseInt(gestion, 10) : new Date().getFullYear();
    const tramite = await Tramite.findByCorrelativo(correlativo.trim(), year);

    if (!tramite) {
      return error(res, `No se encontró ningún trámite registrado con el correlativo "${correlativo}" en la gestión ${year}.`, 404);
    }

    // Obtener historial de movimientos para trazabilidad pública
    const movimientos = await Movimiento.findByTramiteId(tramite.id);

    // Sanitizar datos para vista ciudadana transparente
    const resultadoPublico = {
      id: tramite.id,
      numero_correlativo: tramite.numero_correlativo,
      gestion: tramite.gestion,
      tipo_proceso: tramite.tipo_proceso_nombre,
      tipo_categoria: tramite.tipo_categoria,
      referencia: tramite.referencia,
      remitente: tramite.remitente,
      estado: tramite.estado,
      prioridad: tramite.prioridad,
      nro_hojas: tramite.nro_hojas,
      fecha_creacion: tramite.fecha_creacion,
      fecha_conclusion: tramite.fecha_conclusion,
      ubicacion_actual: tramite.ubicacion_actual_nombre || 'Despacho Central',
      unidad_origen: tramite.origen_nombre,
      historial: movimientos.map(m => ({
        orden: m.orden,
        actividad: m.actividad_nombre,
        tipo_movimiento: m.tipo_movimiento,
        unidad_origen: m.origen_nombre,
        unidad_destino: m.destino_nombre,
        estado: m.estado_movimiento,
        proveido: m.proveido,
        fecha: m.fecha_recepcion || m.fecha_envio || m.created_at
      }))
    };

    return success(res, resultadoPublico, 'Trámite localizado exitosamente');
  } catch (err) {
    console.error('Error en consultaPublica:', err);
    return error(res, 'Ocurrió un error al consultar el trámite', 500);
  }
}

/**
 * Listado de trámites con filtros (para bandejas y supervisión)
 */
async function listar(req, res) {
  try {
    const { estado, gestion, search, limit, offset } = req.query;
    const tramites = await Tramite.findAll({
      estado,
      gestion,
      search,
      limit: limit || 50,
      offset: offset || 0
    });

    return success(res, tramites);
  } catch (err) {
    console.error('Error en listar tramites:', err);
    return error(res, 'Error al listar trámites', 500);
  }
}

/**
 * Resumen estadístico para el Administrador de Wayka
 */
async function obtenerEstadisticas(req, res) {
  try {
    const gestion = req.query.gestion || new Date().getFullYear();
    const todos = await Tramite.findAll({ gestion, limit: 1000 });

    const stats = {
      gestion: parseInt(gestion, 10),
      total: todos.length,
      creados: todos.filter(t => t.estado === 'CREADO').length,
      en_atencion: todos.filter(t => t.estado === 'EN_ATENCION').length,
      en_transito: todos.filter(t => t.estado === 'EN_TRANSITO' || t.estado === 'POR_RECIBIR').length,
      recibidos: todos.filter(t => t.estado === 'RECIBIDO').length,
      bloqueados: todos.filter(t => t.estado === 'BLOQUEADO').length,
      concluidos: todos.filter(t => t.estado === 'CONCLUIDO').length,
      anulados: todos.filter(t => t.estado === 'ANULADO').length
    };

    return success(res, stats);
  } catch (err) {
    console.error('Error en obtenerEstadisticas:', err);
    return error(res, 'Error al obtener estadísticas', 500);
  }
}

/**
 * Anulación de trámite (Operación especial del Admin Wayka - RF-10.2)
 */
async function anular(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const { motivo } = req.body;

    if (!motivo || motivo.trim().length === 0) {
      return error(res, 'Debe especificar el motivo de anulación del trámite.', 400);
    }

    const tramite = await Tramite.findById(id);
    if (!tramite) {
      return error(res, 'Trámite no encontrado', 404);
    }

    const actualizado = await Tramite.anular(id, {
      usuario_id: req.user.userId,
      ubicacion_id: req.user.ubicacionOrgId,
      motivo
    });

    return success(res, actualizado, 'Trámite anulado exitosamente');
  } catch (err) {
    console.error('Error en anular tramite:', err);
    return error(res, 'Error al anular trámite', 500);
  }
}

module.exports = {
  consultaPublica,
  listar,
  obtenerEstadisticas,
  anular
};
