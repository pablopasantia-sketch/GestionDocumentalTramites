using System;
using System.Collections.Generic;
using System.Data;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Tramites;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TramitesController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public TramitesController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        /// <summary>
        /// Consulta pública de trámite por Hoja de Ruta / Correlativo (RF-09.1)
        /// Sin autenticación requerida para acceso ciudadano transparente
        /// </summary>
        [AllowAnonymous]
        [HttpGet("public/consulta")]
        public async Task<IActionResult> ConsultaPublica([FromQuery] string? correlativo, [FromQuery(Name = "nro_tramite")] string? nroTramite, [FromQuery] int? gestion)
        {
            var searchCorr = !string.IsNullOrWhiteSpace(correlativo) ? correlativo : nroTramite;
            if (string.IsNullOrWhiteSpace(searchCorr))
            {
                return BadRequest(ApiResponse.ErrorResult("Debe especificar el número de correlativo u hoja de ruta (ej: CORR-EXT-1/2026)."));
            }

            int year = gestion ?? DateTime.UtcNow.Year;
            var cleanCorrelativo = searchCorr.Trim();

            var resultado = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Tramites_ConsultaPublica",
                reader => new TramiteConsultaPublicaDto
                {
                    Id = reader.GetSafeInt32("id"),
                    NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                    Gestion = reader.GetSafeInt32("gestion"),
                    TipoProceso = reader.GetSafeString("tipo_proceso"),
                    TipoCategoria = reader.GetSafeString("tipo_categoria"),
                    Referencia = reader.GetSafeString("referencia"),
                    Remitente = reader.GetSafeString("remitente"),
                    Estado = reader.GetSafeString("estado"),
                    Prioridad = reader.GetSafeString("prioridad"),
                    NroHojas = reader.GetSafeInt32("nro_hojas", 1),
                    FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                    FechaConclusion = reader.GetNullableDateTime("fecha_conclusion"),
                    UbicacionActual = reader.GetSafeString("ubicacion_actual"),
                    UnidadOrigen = reader.GetSafeString("unidad_origen"),
                    Historial = new List<MovimientoTimelineDto>()
                },
                new SqlParameter("@Correlativo", SqlDbType.NVarChar, 50) { Value = cleanCorrelativo },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = year }
            );

            if (resultado == null)
            {
                return NotFound(ApiResponse.ErrorResult($"No se encontró ningún trámite registrado con el correlativo '{cleanCorrelativo}' en la gestión {year}."));
            }

            // Cargar timeline de movimientos para la consulta pública si existe
            var historial = new List<MovimientoTimelineDto>();
            await _sp.ExecuteMultiReaderAsync(
                "dbo.usp_Tramites_ObtenerPorId",
                async reader =>
                {
                    // Saltar resultset 1
                    if (await reader.NextResultAsync())
                    {
                        // Resultset 2: Movimientos
                        while (await reader.ReadAsync())
                        {
                            historial.Add(new MovimientoTimelineDto
                            {
                                Orden = reader.GetSafeInt32("orden"),
                                Actividad = reader.GetSafeString("actividad"),
                                TipoMovimiento = reader.GetSafeString("tipo_movimiento"),
                                UnidadOrigen = reader.GetSafeString("unidad_origen"),
                                UnidadDestino = reader.GetNullableString("unidad_destino"),
                                Estado = reader.GetSafeString("estado"),
                                Proveido = reader.GetNullableString("proveido"),
                                Fecha = reader.GetSafeDateTime("fecha")
                            });
                        }
                    }
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = resultado.Id }
            );

            resultado.Historial = historial;

            return Ok(ApiResponse<TramiteConsultaPublicaDto>.Ok(resultado, "Trámite localizado exitosamente."));
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? estado,
            [FromQuery] int? gestion,
            [FromQuery] string? search,
            [FromQuery] int limit = 50,
            [FromQuery] int offset = 0)
        {
            var list = await _sp.QueryAsync(
                "dbo.usp_Tramites_Listar",
                reader => new TramiteListItemDto
                {
                    Id = reader.GetSafeInt32("id"),
                    NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                    Gestion = reader.GetSafeInt32("gestion"),
                    TipoProcesoId = reader.GetSafeInt32("tipo_proceso_id"),
                    TipoProcesoNombre = reader.GetSafeString("tipo_proceso_nombre"),
                    TipoCorres = reader.GetSafeString("tipo_corres"),
                    Remitente = reader.GetSafeString("remitente"),
                    Referencia = reader.GetSafeString("referencia"),
                    Prioridad = reader.GetSafeString("prioridad"),
                    NroHojas = reader.GetSafeInt32("nro_hojas", 1),
                    Estado = reader.GetSafeString("estado"),
                    UbicacionActualNombre = reader.GetNullableString("ubicacion_actual_nombre"),
                    UsuarioActualLogin = reader.GetNullableString("usuario_actual_login"),
                    FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                    NroAdjuntos = reader.GetSafeInt32("nro_adjuntos")
                },
                new SqlParameter("@Estado", SqlDbType.NVarChar, 30) { Value = (object?)estado?.Trim() ?? DBNull.Value },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = (object?)gestion ?? DBNull.Value },
                new SqlParameter("@Search", SqlDbType.NVarChar, 200) { Value = (object?)search?.Trim() ?? DBNull.Value },
                new SqlParameter("@Limit", SqlDbType.Int) { Value = limit },
                new SqlParameter("@Offset", SqlDbType.Int) { Value = offset }
            );

            return Ok(ApiResponse<List<TramiteListItemDto>>.Ok(list));
        }

        [Authorize]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] int? gestion)
        {
            int year = gestion ?? DateTime.UtcNow.Year;

            var stats = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Tramites_ObtenerEstadisticas",
                reader => new TramiteStatsDto
                {
                    Gestion = reader.GetSafeInt32("gestion", year),
                    Total = reader.GetSafeInt32("total"),
                    Creados = reader.GetSafeInt32("creados"),
                    EnAtencion = reader.GetSafeInt32("en_atencion"),
                    EnTransito = reader.GetSafeInt32("en_transito"),
                    Recibidos = reader.GetSafeInt32("recibidos"),
                    Bloqueados = reader.GetSafeInt32("bloqueados"),
                    Concluidos = reader.GetSafeInt32("concluidos"),
                    Anulados = reader.GetSafeInt32("anulados")
                },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = year }
            );

            stats ??= new TramiteStatsDto { Gestion = year };

            return Ok(ApiResponse<TramiteStatsDto>.Ok(stats));
        }

        /// <summary>
        /// Obtener previsualización del siguiente número correlativo institucional (RF-03.3)
        /// </summary>
        [Authorize]
        [HttpGet("next-correlativo")]
        public async Task<IActionResult> GetNextCorrelativo([FromQuery] int tipo_proceso_id, [FromQuery] int? gestion)
        {
            int year = gestion ?? DateTime.UtcNow.Year;

            var preview = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Tramites_PreviewCorrelativo",
                reader => new NextCorrelativoPreviewDto
                {
                    NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                    Gestion = reader.GetSafeInt32("gestion", year),
                    CodigoTipo = reader.GetSafeString("codigo_tipo"),
                    NombreTipo = reader.GetSafeString("nombre_tipo"),
                    TiempoEstimadoHoras = reader.GetSafeInt32("tiempo_estimado_horas", 24)
                },
                new SqlParameter("@TipoProcesoId", SqlDbType.Int) { Value = tipo_proceso_id },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = year }
            );

            if (preview == null)
            {
                return NotFound(ApiResponse.ErrorResult("Tipo de trámite externo no encontrado o inactivo."));
            }

            return Ok(ApiResponse<NextCorrelativoPreviewDto>.Ok(preview));
        }

        /// <summary>
        /// Obtener detalle completo de un trámite por ID (para Hoja de Ruta y consulta)
        /// </summary>
        [Authorize]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            TramiteDetalleCompletoDto? detalle = null;
            var historial = new List<MovimientoTimelineDto>();
            var adjuntos = new List<GestionDocumental.Api.DTOs.Adjuntos.AdjuntoItemDto>();

            await _sp.ExecuteMultiReaderAsync(
                "dbo.usp_Tramites_ObtenerPorId",
                async reader =>
                {
                    // Resultset 1: Trámite
                    if (await reader.ReadAsync())
                    {
                        detalle = new TramiteDetalleCompletoDto
                        {
                            Id = reader.GetSafeInt32("id"),
                            NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                            Gestion = reader.GetSafeInt32("gestion"),
                            TipoProcesoId = reader.GetSafeInt32("tipo_proceso_id"),
                            TipoProcesoCodigo = reader.GetSafeString("tipo_proceso_codigo"),
                            TipoProcesoNombre = reader.GetSafeString("tipo_proceso_nombre"),
                            TipoCategoria = reader.GetSafeString("tipo_categoria"),
                            Estado = reader.GetSafeString("estado"),
                            Remitente = reader.GetSafeString("remitente"),
                            InstitucionRemitente = reader.GetNullableString("institucion_remitente"),
                            CiteExterno = reader.GetNullableString("cite_externo"),
                            Referencia = reader.GetSafeString("referencia"),
                            Prioridad = reader.GetSafeString("prioridad"),
                            NroHojas = reader.GetSafeInt32("nro_hojas", 1),
                            NroAnexos = reader.GetSafeInt32("nro_anexos"),
                            Instruccion = reader.GetNullableString("instruccion"),
                            DestinatarioNombre = reader.GetNullableString("destinatario_nombre"),
                            DestinatarioCargo = reader.GetNullableString("destinatario_cargo"),
                            DestinatarioUnidad = reader.GetNullableString("destinatario_unidad"),
                            CodUDestino = reader.GetNullableInt16("cod_u_destino"),
                            CodCargoDestino = reader.GetNullableInt16("cod_cargo_destino"),
                            CiEmpleadoDestino = reader.GetNullableInt32("ci_empleado_destino"),
                            FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                            FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                            CreadoPorUsuario = reader.GetSafeString("creado_por_usuario"),
                            UnidadOrigen = reader.GetSafeString("unidad_origen"),
                            Historial = historial,
                            Adjuntos = adjuntos
                        };
                    }

                    // Resultset 2: Movimientos
                    if (await reader.NextResultAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            historial.Add(new MovimientoTimelineDto
                            {
                                Orden = reader.GetSafeInt32("orden"),
                                Actividad = reader.GetSafeString("actividad"),
                                TipoMovimiento = reader.GetSafeString("tipo_movimiento"),
                                UnidadOrigen = reader.GetSafeString("unidad_origen"),
                                UnidadDestino = reader.GetNullableString("unidad_destino"),
                                Estado = reader.GetSafeString("estado"),
                                Proveido = reader.GetNullableString("proveido"),
                                Fecha = reader.GetSafeDateTime("fecha")
                            });
                        }
                    }

                    // Resultset 3: Adjuntos
                    if (await reader.NextResultAsync())
                    {
                        while (await reader.ReadAsync())
                        {
                            adjuntos.Add(new GestionDocumental.Api.DTOs.Adjuntos.AdjuntoItemDto
                            {
                                Id = reader.GetSafeInt32("id"),
                                TramiteId = reader.GetSafeInt32("tramite_id"),
                                MovimientoId = reader.GetNullableInt32("movimiento_id"),
                                NombreOriginal = reader.GetSafeString("nombre_original"),
                                TamanoBytes = reader.GetSafeInt64("tamano_bytes"),
                                TipoMime = reader.GetSafeString("tipo_mime"),
                                SubidoPorNombre = reader.GetSafeString("subido_por_nombre"),
                                FechaSubida = reader.GetSafeDateTime("fecha_subida")
                            });
                        }
                    }
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (detalle == null)
            {
                return NotFound(ApiResponse.ErrorResult("Trámite no encontrado."));
            }

            return Ok(ApiResponse<TramiteDetalleCompletoDto>.Ok(detalle));
        }

        /// <summary>
        /// Crear trámite / correspondencia externa unificada (Ventanilla Única y Despachos - RF-03)
        /// Genera automáticamente correlativo oficial [CÓDIGO]-[NRO]/[GESTIÓN] y registra movimiento inicial
        /// </summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTramiteExternoDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos de correspondencia inválidos. Verifique los campos obligatorios."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubicacionId <= 0) ubicacionId = 3; // 3: Ventanilla Única

            var outNuevoId = new SqlParameter("@NuevoTramiteId", SqlDbType.Int) { Direction = ParameterDirection.Output };
            var outNumeroCorrelativo = new SqlParameter("@NumeroCorrelativo", SqlDbType.VarChar, 50) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Crear",
                    new SqlParameter("@TipoProcesoId", SqlDbType.Int) { Value = dto.TipoProcesoId },
                    new SqlParameter("@Remitente", SqlDbType.VarChar, 200) { Value = dto.Remitente.Trim() },
                    new SqlParameter("@InstitucionRemitente", SqlDbType.NVarChar, 200) { Value = (object?)dto.InstitucionRemitente?.Trim() ?? DBNull.Value },
                    new SqlParameter("@CiteExterno", SqlDbType.VarChar, 100) { Value = (object?)dto.CiteExterno?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Referencia", SqlDbType.NVarChar, -1) { Value = dto.Referencia.Trim() },
                    new SqlParameter("@Prioridad", SqlDbType.VarChar, 20) { Value = !string.IsNullOrWhiteSpace(dto.Prioridad) ? dto.Prioridad.Trim().ToUpper() : "NORMAL" },
                    new SqlParameter("@NroHojas", SqlDbType.Int) { Value = dto.NroHojas },
                    new SqlParameter("@NroAnexos", SqlDbType.Int) { Value = dto.NroAnexos },
                    new SqlParameter("@Instruccion", SqlDbType.VarChar, 255) { Value = (object?)dto.Instruccion?.Trim() ?? DBNull.Value },
                    new SqlParameter("@ProveidoInicial", SqlDbType.NVarChar, -1) { Value = (object?)dto.ProveidoInicial?.Trim() ?? DBNull.Value },
                    new SqlParameter("@CodUDestino", SqlDbType.SmallInt) { Value = (object?)dto.CodUDestino ?? DBNull.Value },
                    new SqlParameter("@CodCargoDestino", SqlDbType.SmallInt) { Value = (object?)dto.CodCargoDestino ?? DBNull.Value },
                    new SqlParameter("@CiEmpleadoDestino", SqlDbType.Int) { Value = (object?)dto.CiEmpleadoDestino ?? DBNull.Value },
                    new SqlParameter("@DestinatarioNombre", SqlDbType.NVarChar, 150) { Value = (object?)dto.DestinatarioNombre?.Trim() ?? DBNull.Value },
                    new SqlParameter("@DestinatarioCargo", SqlDbType.NVarChar, 150) { Value = (object?)dto.DestinatarioCargo?.Trim() ?? DBNull.Value },
                    new SqlParameter("@DestinatarioUnidad", SqlDbType.NVarChar, 150) { Value = (object?)dto.DestinatarioUnidad?.Trim() ?? DBNull.Value },
                    new SqlParameter("@PrimerDestinatarioId", SqlDbType.Int) { Value = (object?)dto.PrimerDestinatarioId ?? DBNull.Value },
                    new SqlParameter("@UserId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionId", SqlDbType.Int) { Value = ubicacionId },
                    outNuevoId,
                    outNumeroCorrelativo
                );

                int nuevoId = (int)outNuevoId.Value;
                string numeroCorrelativo = (string)outNumeroCorrelativo.Value;

                var resultDto = new TramiteDetalleCompletoDto
                {
                    Id = nuevoId,
                    NumeroCorrelativo = numeroCorrelativo,
                    Gestion = DateTime.UtcNow.Year,
                    TipoProcesoId = dto.TipoProcesoId,
                    TipoProcesoCodigo = string.Empty,
                    TipoProcesoNombre = string.Empty,
                    TipoCategoria = "CORRESPONDENCIA",
                    Estado = "CREADO",
                    Remitente = dto.Remitente.Trim(),
                    InstitucionRemitente = dto.InstitucionRemitente,
                    CiteExterno = dto.CiteExterno,
                    Referencia = dto.Referencia.Trim(),
                    Prioridad = dto.Prioridad ?? "NORMAL",
                    NroHojas = dto.NroHojas,
                    NroAnexos = dto.NroAnexos,
                    Instruccion = dto.Instruccion,
                    DestinatarioNombre = dto.DestinatarioNombre,
                    DestinatarioCargo = dto.DestinatarioCargo,
                    DestinatarioUnidad = dto.DestinatarioUnidad,
                    CodUDestino = dto.CodUDestino,
                    CodCargoDestino = dto.CodCargoDestino,
                    CiEmpleadoDestino = dto.CiEmpleadoDestino,
                    FechaCreacion = DateTime.UtcNow,
                    CreadoPorUsuario = "Operador Ventanilla",
                    UnidadOrigen = "Ventanilla Única"
                };

                return CreatedAtAction(nameof(GetById), new { id = nuevoId },
                    ApiResponse<TramiteDetalleCompletoDto>.Ok(resultDto, $"Hoja de Ruta {numeroCorrelativo} creada exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult($"Error al emitir la Hoja de Ruta: {ex.Message}"));
            }
        }

        /// <summary>
        /// Anulación de trámite (Operación especial - RF-10.1)
        /// </summary>
        [Authorize]
        [HttpPost("{id}/anular")]
        public async Task<IActionResult> Anular(int id, [FromBody] AnularTramiteDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Motivo de anulación requerido."));

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubiClaim == null || ubicacionId <= 0) ubicacionId = 3;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Anular",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Motivo", SqlDbType.NVarChar, -1) { Value = dto.Motivo.Trim() },
                    new SqlParameter("@UserId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionId", SqlDbType.Int) { Value = ubicacionId }
                );

                return Ok(ApiResponse.SuccessResult("Trámite anulado exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }
    }
}
