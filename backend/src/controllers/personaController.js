const Persona = require('../models/Persona');
const { success, error } = require('../utils/response');

/**
 * Listar personas con búsqueda y paginación
 */
async function listarPersonas(req, res) {
  try {
    const { search = '', activo = 'true', limit = 50, offset = 0 } = req.query;
    const soloActivos = activo === 'all' ? null : activo === 'true';

    const personas = await Persona.findAll({
      search,
      activo: soloActivos,
      limit: parseInt(limit, 10),
      offset: parseInt(offset, 10)
    });

    return success(res, personas, 'Listado de personas obtenido correctamente');
  } catch (err) {
    console.error('Error al listar personas:', err);
    return error(res, 'Error al obtener el listado de personas', 500, err.message);
  }
}

/**
 * Obtener detalle de una persona por ID
 */
async function obtenerPersonaPorId(req, res) {
  try {
    const { id } = req.params;
    const persona = await Persona.findById(id);

    if (!persona) {
      return error(res, 'Persona no encontrada', 404);
    }

    return success(res, persona, 'Persona encontrada');
  } catch (err) {
    console.error('Error al obtener persona:', err);
    return error(res, 'Error al obtener datos de la persona', 500, err.message);
  }
}

/**
 * Crear nueva persona
 */
async function crearPersona(req, res) {
  try {
    const {
      nombres,
      apellido_paterno,
      apellido_materno,
      ci,
      ci_expedido = 'CH',
      sexo = 'M',
      estado_civil = null,
      telefono = null,
      email = null,
      empresa_telefonica = null,
      direccion = null
    } = req.body;

    if (!nombres || !apellido_paterno || !ci) {
      return error(res, 'Campos obligatorios faltantes: nombres, apellido_paterno y ci son requeridos', 400);
    }

    // Verificar si ya existe el CI
    const existente = await Persona.findByCi(ci);
    if (existente) {
      return error(res, `Ya existe una persona registrada con la Cédula de Identidad ${ci}`, 409);
    }

    const nuevaPersona = await Persona.create({
      nombres,
      apellido_paterno,
      apellido_materno,
      ci,
      ci_expedido,
      sexo,
      estado_civil,
      telefono,
      email,
      empresa_telefonica,
      direccion
    });

    return success(res, nuevaPersona, 'Persona registrada exitosamente', 201);
  } catch (err) {
    console.error('Error al registrar persona:', err);
    return error(res, 'Error al registrar la persona en el sistema', 500, err.message);
  }
}

/**
 * Actualizar datos de persona
 */
async function actualizarPersona(req, res) {
  try {
    const { id } = req.params;
    const personaExistente = await Persona.findById(id);

    if (!personaExistente) {
      return error(res, 'Persona no encontrada', 404);
    }

    // Si intenta cambiar CI, verificar que no colisione con otro
    if (req.body.ci && req.body.ci !== personaExistente.ci) {
      const colision = await Persona.findByCi(req.body.ci);
      if (colision && colision.id !== parseInt(id, 10)) {
        return error(res, `El CI ${req.body.ci} ya pertenece a otra persona`, 409);
      }
    }

    const personaActualizada = await Persona.update(id, req.body);
    return success(res, personaActualizada, 'Datos de la persona actualizados correctamente');
  } catch (err) {
    console.error('Error al actualizar persona:', err);
    return error(res, 'Error al actualizar datos de la persona', 500, err.message);
  }
}

/**
 * Borrado lógico de persona (con validación de dependencias)
 */
async function eliminarPersona(req, res) {
  try {
    const { id } = req.params;
    const persona = await Persona.findById(id);

    if (!persona) {
      return error(res, 'Persona no encontrada', 404);
    }

    await Persona.softDelete(id);
    return success(res, { id }, 'Persona dada de baja exitosamente');
  } catch (err) {
    console.error('Error al eliminar persona:', err);
    // Error de dependencia de negocio
    return error(res, err.message || 'No se puede eliminar la persona', 400);
  }
}

module.exports = {
  listarPersonas,
  obtenerPersonaPorId,
  crearPersona,
  actualizarPersona,
  eliminarPersona
};
