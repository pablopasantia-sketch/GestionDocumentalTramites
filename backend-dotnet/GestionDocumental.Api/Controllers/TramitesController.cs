using System;
using System.Collections.Generic;
using System.Data;
using System.Security.Claims;
using System.Text.Json;
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
                    TipoProcesoCodigo = reader.GetSafeString("tipo_proceso_codigo"),
                    TipoCategoria = reader.GetSafeString("tipo_categoria"),
                    TiempoEstimadoHoras = reader.GetSafeInt32("tiempo_estimado_horas", 48),
                    Referencia = reader.GetSafeString("referencia"),
                    Remitente = reader.GetSafeString("remitente"),
                    Estado = reader.GetSafeString("estado"),
                    Prioridad = reader.GetSafeString("prioridad"),
                    NroHojas = reader.GetSafeInt32("nro_hojas", 1),
                    FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                    FechaConclusion = reader.GetNullableDateTime("fecha_conclusion"),
                    FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                    UbicacionActual = reader.GetSafeString("ubicacion_actual"),
                    UnidadOrigen = reader.GetSafeString("unidad_origen"),
                    UsuarioActualNombre = reader.GetSafeString("usuario_actual_nombre"),
                    UsuarioActualCargo = reader.GetSafeString("usuario_actual_cargo"),
                    Historial = new List<MovimientoTimelineDto>(),
                    Adjuntos = new List<GestionDocumental.Api.DTOs.Adjuntos.AdjuntoItemDto>()
                },
                new SqlParameter("@Correlativo", SqlDbType.NVarChar, 50) { Value = cleanCorrelativo },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = year }
            );

            if (resultado == null)
            {
                return NotFound(ApiResponse.ErrorResult($"No se encontró ningún trámite registrado con el correlativo '{cleanCorrelativo}' en la gestión {year}."));
            }

            // Cargar timeline de movimientos y adjuntos para la consulta pública si existe
            var historial = new List<MovimientoTimelineDto>();
            var adjuntos = new List<GestionDocumental.Api.DTOs.Adjuntos.AdjuntoItemDto>();

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
                                Id = reader.GetSafeInt32("id"),
                                Orden = reader.GetSafeInt32("orden"),
                                Actividad = reader.GetSafeString("actividad"),
                                TipoMovimiento = reader.GetSafeString("tipo_movimiento"),
                                UsuarioOrigenId = reader.GetNullableInt32("usuario_origen_id"),
                                UsuarioOrigenNombre = reader.GetNullableString("usuario_origen_nombre"),
                                UsuarioOrigenCargo = reader.GetNullableString("usuario_origen_cargo"),
                                UnidadOrigen = reader.GetSafeString("unidad_origen"),
                                UsuarioDestinoId = reader.GetNullableInt32("usuario_destino_id"),
                                UsuarioDestinoNombre = reader.GetNullableString("usuario_destino_nombre"),
                                UsuarioDestinoCargo = reader.GetNullableString("usuario_destino_cargo"),
                                UnidadDestino = reader.GetNullableString("unidad_destino"),
                                Estado = reader.GetSafeString("estado"),
                                Proveido = reader.GetNullableString("proveido"),
                                Instruccion = reader.GetNullableString("instruccion"),
                                JustificacionRetroceso = reader.GetNullableString("justificacion_retroceso"),
                                InstrumentoGenerado = reader.GetNullableString("instrumento_generado"),
                                InstrumentosGenerados = reader.GetNullableString("instrumentos_generados") ?? reader.GetNullableString("instrumento_generado"),
                                FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                                FechaEnvio = reader.GetNullableDateTime("fecha_envio"),
                                FechaRecepcion = reader.GetNullableDateTime("fecha_recepcion"),
                                Fecha = reader.GetSafeDateTime("fecha"),
                                TiempoEstimadoMinutos = reader.GetSafeInt32("tiempo_estimado_minutos", 0),
                                TiempoTranscurridoMinutos = reader.GetSafeInt32("tiempo_transcurrido_minutos", 0),
                                EsHastaHoy = reader.GetSafeInt32("es_hasta_hoy", 0) == 1
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
                new SqlParameter("@Id", SqlDbType.Int) { Value = resultado.Id }
            );

            resultado.Historial = historial;
            resultado.Adjuntos = adjuntos;

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

        /// <summary>
        /// Obtener trámites de la bandeja de trabajo para el Escritorio Virtual (RF-04)
        /// Bandejas: RECIBIDOS (pendientes), DESPACHADOS (enviados), TODOS
        /// </summary>
        [Authorize]
        [HttpGet("bandeja")]
        public async Task<IActionResult> GetBandeja(
            [FromQuery] string? bandeja = "RECIBIDOS",
            [FromQuery] string? categoria = "TODOS",
            [FromQuery] string? estado = "TODOS",
            [FromQuery] string? search = null,
            [FromQuery] int? gestion = null,
            [FromQuery] bool? soloVencidos = false,
            [FromQuery] bool? verGlobal = false,
            [FromQuery] int limit = 50,
            [FromQuery] int offset = 0)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);

            var rolCodigo = User.FindFirst("rolCodigo")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            bool esAdmin = rolCodigo == "ADMIN_SISTEMA" || rolCodigo == "ADMIN_TRAMITES";
            bool aplicarGlobal = (verGlobal == true) && esAdmin;

            var list = await _sp.QueryAsync(
                "dbo.usp_Escritorio_ListarBandeja",
                reader => new BandejaItemDto
                {
                    Id = reader.GetSafeInt32("id"),
                    NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                    Gestion = reader.GetSafeInt32("gestion"),
                    TipoProcesoId = reader.GetSafeInt32("tipo_proceso_id"),
                    TipoProcesoCodigo = reader.GetSafeString("tipo_proceso_codigo"),
                    TipoProcesoNombre = reader.GetSafeString("tipo_proceso_nombre"),
                    TipoCategoria = reader.GetSafeString("tipo_categoria"),
                    Remitente = reader.GetSafeString("remitente"),
                    InstitucionRemitente = reader.GetNullableString("institucion_remitente"),
                    CiteExterno = reader.GetNullableString("cite_externo"),
                    Referencia = reader.GetSafeString("referencia"),
                    Prioridad = reader.GetSafeString("prioridad"),
                    NroHojas = reader.GetSafeInt32("nro_hojas", 1),
                    NroAnexos = reader.GetSafeInt32("nro_anexos", 0),
                    Estado = reader.GetSafeString("estado"),
                    ActividadActual = reader.GetSafeString("actividad_actual"),
                    DestinatarioNombre = reader.GetNullableString("destinatario_nombre"),
                    DestinatarioCargo = reader.GetNullableString("destinatario_cargo"),
                    DestinatarioUnidad = reader.GetNullableString("destinatario_unidad"),
                    UsuarioActualId = reader.GetNullableInt32("usuario_actual_id"),
                    UsuarioActualNombre = reader.GetNullableString("usuario_actual_nombre"),
                    UbicacionActualId = reader.GetNullableInt32("ubicacion_actual_id"),
                    UbicacionActualNombre = reader.GetNullableString("ubicacion_actual_nombre"),
                    FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                    FechaEnvio = reader.GetNullableDateTime("fecha_envio"),
                    FechaRecepcion = reader.GetNullableDateTime("fecha_recepcion"),
                    FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                    EsVencido = reader.GetSafeInt32("es_vencido") == 1,
                    DiasRestantes = reader.GetNullableInt32("dias_restantes"),
                    NroAdjuntos = reader.GetSafeInt32("nro_adjuntos"),
                    UltimoProveido = reader.GetNullableString("ultimo_proveido"),
                    UltimoInstrumentoGenerado = reader.GetNullableString("ultimo_instrumento_generado"),
                    SesionPlenoNro = reader.GetNullableString("sesion_pleno_nro"),
                    SesionPlenoResultado = reader.GetNullableString("sesion_pleno_resultado"),
                    FirmaPresidencia = reader.GetSafeInt32("firma_presidencia", 0) == 1,
                    FirmaSecretaria = reader.GetSafeInt32("firma_secretaria", 0) == 1,
                    DespachoFinalCite = reader.GetNullableString("despacho_final_cite"),
                    BandejaTipo = reader.GetSafeString("bandeja_tipo")
                },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)ubicacionId ?? DBNull.Value },
                new SqlParameter("@Bandeja", SqlDbType.VarChar, 30) { Value = (bandeja ?? "RECIBIDOS").ToUpperInvariant() },
                new SqlParameter("@Categoria", SqlDbType.VarChar, 30) { Value = string.IsNullOrWhiteSpace(categoria) || categoria == "TODOS" ? DBNull.Value : categoria.ToUpperInvariant() },
                new SqlParameter("@Estado", SqlDbType.VarChar, 30) { Value = string.IsNullOrWhiteSpace(estado) || estado == "TODOS" ? DBNull.Value : estado.ToUpperInvariant() },
                new SqlParameter("@Search", SqlDbType.NVarChar, 100) { Value = (object?)search?.Trim() ?? DBNull.Value },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = (object?)gestion ?? DBNull.Value },
                new SqlParameter("@SoloVencidos", SqlDbType.Bit) { Value = soloVencidos == true ? 1 : 0 },
                new SqlParameter("@VerGlobal", SqlDbType.Bit) { Value = aplicarGlobal ? 1 : 0 },
                new SqlParameter("@Limit", SqlDbType.Int) { Value = limit },
                new SqlParameter("@Offset", SqlDbType.Int) { Value = offset }
            );

            return Ok(ApiResponse<List<BandejaItemDto>>.Ok(list));
        }

        /// <summary>
        /// Obtener métricas y resumen numérico de las bandejas (KPIs para Escritorio Virtual)
        /// </summary>
        [Authorize]
        [HttpGet("bandeja/resumen")]
        public async Task<IActionResult> GetBandejaResumen([FromQuery] int? gestion, [FromQuery] bool? verGlobal = false)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);

            var rolCodigo = User.FindFirst("rolCodigo")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            bool esAdmin = rolCodigo == "ADMIN_SISTEMA" || rolCodigo == "ADMIN_TRAMITES";
            bool aplicarGlobal = (verGlobal == true) && esAdmin;

            int year = gestion ?? DateTime.UtcNow.Year;

            var resumen = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Escritorio_ObtenerResumen",
                reader => new BandejaResumenDto
                {
                    Gestion = reader.GetSafeInt32("gestion", year),
                    TotalBandeja = reader.GetSafeInt32("total_bandeja"),
                    PorRecibir = reader.GetSafeInt32("por_recibir"),
                    EnAtencion = reader.GetSafeInt32("en_atencion"),
                    Atendidos = reader.GetSafeInt32("atendidos"),
                    TotalDespachados = reader.GetSafeInt32("total_despachados"),
                    DespachadosSinConfirmar = reader.GetSafeInt32("despachados_sin_confirmar"),
                    DespachadosConfirmados = reader.GetSafeInt32("despachados_confirmados"),
                    Vencidos = reader.GetSafeInt32("vencidos"),
                    Urgentes = reader.GetSafeInt32("urgentes")
                },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)ubicacionId ?? DBNull.Value },
                new SqlParameter("@Gestion", SqlDbType.Int) { Value = year },
                new SqlParameter("@VerGlobal", SqlDbType.Bit) { Value = aplicarGlobal ? 1 : 0 }
            );

            resumen ??= new BandejaResumenDto { Gestion = year };

            return Ok(ApiResponse<BandejaResumenDto>.Ok(resumen));
        }

        /// <summary>
        /// Confirmar recepción de un trámite despachado (RF-04.3, Sprint 3)
        /// Transición de estado: POR_RECIBIR / EN_TRANSITO -> EN_ATENCION
        /// </summary>
        [Authorize]
        [HttpPost("{id}/recepcionar")]
        public async Task<IActionResult> Recepcionar(int id, [FromBody] RecepcionarTramiteDto? dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubicacionId <= 0) ubicacionId = 1;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Recepcionar",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = ubicacionId },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = (object?)dto?.Proveido?.Trim() ?? DBNull.Value }
                );

                return Ok(ApiResponse.SuccessResult("Recepción confirmada exitosamente. El trámite se encuentra en su bandeja En Atención."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Derivación libre (Avanzar) con selección de destinatarios institucionales (Sprint 3, RF-05.1, RF-03.9)
        /// Permite derivar a otra unidad, cargo y funcionario, o concluir/archivar el trámite.
        /// </summary>
        [Authorize]
        [HttpPost("{id}/derivar")]
        [HttpPost("{id}/avanzar")]
        public async Task<IActionResult> Derivar(int id, [FromBody] DerivarTramiteDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos de derivación inválidos. El proveído o instrucción es obligatorio."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubicacionId <= 0) ubicacionId = 1;

            string? otrosDestJson = null;
            if (dto.OtrosDestinatarios != null && dto.OtrosDestinatarios.Count > 0)
            {
                otrosDestJson = JsonSerializer.Serialize(dto.OtrosDestinatarios);
            }

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Derivar",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioOrigenId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionOrigenId", SqlDbType.Int) { Value = ubicacionId },
                    new SqlParameter("@CodUDestino", SqlDbType.SmallInt) { Value = (object?)dto.CodUDestino ?? DBNull.Value },
                    new SqlParameter("@CodCargoDestino", SqlDbType.SmallInt) { Value = (object?)dto.CodCargoDestino ?? DBNull.Value },
                    new SqlParameter("@CiEmpleadoDestino", SqlDbType.Int) { Value = (object?)dto.CiEmpleadoDestino ?? DBNull.Value },
                    new SqlParameter("@DestinatarioNombre", SqlDbType.NVarChar, 150) { Value = (object?)dto.DestinatarioNombre?.Trim() ?? DBNull.Value },
                    new SqlParameter("@DestinatarioCargo", SqlDbType.NVarChar, 150) { Value = (object?)dto.DestinatarioCargo?.Trim() ?? DBNull.Value },
                    new SqlParameter("@DestinatarioUnidad", SqlDbType.NVarChar, 150) { Value = (object?)dto.DestinatarioUnidad?.Trim() ?? DBNull.Value },
                    new SqlParameter("@ActividadNombre", SqlDbType.VarChar, 150) { Value = (object?)dto.ActividadNombre?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = dto.Proveido.Trim() },
                    new SqlParameter("@Instruccion", SqlDbType.VarChar, 255) { Value = (object?)dto.Instruccion?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Prioridad", SqlDbType.VarChar, 20) { Value = (object?)dto.Prioridad?.Trim() ?? DBNull.Value },
                    new SqlParameter("@DiasPlazo", SqlDbType.Int) { Value = (object?)dto.DiasPlazo ?? DBNull.Value },
                    new SqlParameter("@EsConclusion", SqlDbType.Bit) { Value = dto.EsConclusion ? 1 : 0 },
                    new SqlParameter("@OtrosDestinatariosJson", SqlDbType.NVarChar, -1) { Value = (object?)otrosDestJson ?? DBNull.Value },
                    new SqlParameter("@InstrumentoGenerado", SqlDbType.VarChar, 50) { Value = (object?)dto.InstrumentoGenerado?.Trim() ?? DBNull.Value },
                    new SqlParameter("@InstrumentosGenerados", SqlDbType.VarChar, 250) { Value = (object?)(dto.InstrumentosGenerados?.Trim() ?? dto.InstrumentoGenerado?.Trim()) ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                string mensajeExito = dto.EsConclusion
                    ? "Trámite concluido y archivado exitosamente."
                    : $"Trámite derivado exitosamente a {dto.DestinatarioUnidad ?? "la unidad de destino"}. Se encuentra ahora en su bandeja de Despachados.";

                return Ok(ApiResponse<object>.Ok(new { tramiteId = id, movimientoId = movId }, mensajeExito));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Retroceder proceso / devolver a la instancia o actividad anterior con justificación obligatoria (Sprint 3, RF-05.4, RF-05.5)
        /// </summary>
        [Authorize]
        [HttpPost("{id}/retroceder")]
        [HttpPost("{id}/devolver")]
        public async Task<IActionResult> Retroceder(int id, [FromBody] RetrocederTramiteDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("La justificación del retroceso es estrictamente obligatoria (mínimo 5 caracteres)."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubicacionId <= 0) ubicacionId = 1;

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Retroceder",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = ubicacionId },
                    new SqlParameter("@Justificacion", SqlDbType.NVarChar, -1) { Value = dto.Justificacion.Trim() },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = (object?)dto.Proveido?.Trim() ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId },
                    "Trámite devuelto exitosamente a la instancia anterior con constancia de justificación."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Concluir informe/atención técnica y marcar el trámite como ATENDIDO listo para despachar (Sprint 3)
        /// </summary>
        [Authorize]
        [HttpPost("{id}/atender")]
        [HttpPost("{id}/marcar-atendido")]
        public async Task<IActionResult> MarcarAtendido(int id, [FromBody] MarcarAtendidoDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Debe ingresar una nota de informe, dictamen técnico o proveído de conclusión (mínimo 3 caracteres)."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubicacionId <= 0) ubicacionId = 1;

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_MarcarAtendido",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = ubicacionId },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = dto.Proveido.Trim() },
                    new SqlParameter("@ActividadNombre", SqlDbType.VarChar, 150) { Value = (object?)dto.ActividadNombre?.Trim() ?? DBNull.Value },
                    new SqlParameter("@InstrumentoGenerado", SqlDbType.VarChar, 50) { Value = (object?)dto.InstrumentoGenerado?.Trim() ?? DBNull.Value },
                    new SqlParameter("@InstrumentosGenerados", SqlDbType.VarChar, 250) { Value = (object?)(dto.InstrumentosGenerados?.Trim() ?? dto.InstrumentoGenerado?.Trim()) ?? DBNull.Value },
                    new SqlParameter("@DiasPlazo", SqlDbType.Int) { Value = (object?)dto.DiasPlazo ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId },
                    "Trámite marcado como ATENDIDO exitosamente. Se encuentra listo en su bandeja para ser derivado o despachado."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Iniciar formalmente la elaboración de informe de comisión con plazo de 5 a 15 días reglamentarios
        /// </summary>
        [Authorize]
        [HttpPost("{id}/iniciar-informe")]
        public async Task<IActionResult> IniciarInformeComision(int id, [FromBody] IniciarInformeComisionDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            if (dto.DiasPlazo < 5 || dto.DiasPlazo > 15)
            {
                return BadRequest(ApiResponse.ErrorResult("El plazo reglamentario para la elaboración del informe debe ser entre 5 y 15 días hábiles."));
            }

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_IniciarInformeComision",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@DiasPlazo", SqlDbType.Int) { Value = dto.DiasPlazo },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = (object?)dto.Proveido?.Trim() ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId, diasPlazo = dto.DiasPlazo },
                    $"Elaboración de informe iniciada exitosamente con plazo reglamentario de {dto.DiasPlazo} días hábiles."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Concluir formalmente la elaboración de informe de comisión (habilitando el tratamiento en Sesión del Pleno)
        /// </summary>
        [Authorize]
        [HttpPost("{id}/concluir-informe")]
        public async Task<IActionResult> ConcluirInformeComision(int id, [FromBody] ConcluirInformeComisionDto? dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_ConcluirInformeComision",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = (object?)dto?.Proveido?.Trim() ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId },
                    "Informe de comisión concluido satisfactoriamente. Trámite habilitado para su tratamiento en el Pleno del Concejo Municipal."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Constancia de Aprobación en Sesión del Pleno del CMS
        /// </summary>
        [Authorize]
        [HttpPost("{id}/pleno/aprobacion")]
        public async Task<IActionResult> RegistrarAprobacionPleno(int id, [FromBody] RegistrarAprobacionPlenoDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_RegistrarAprobacionPleno",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@SesionPlenoNro", SqlDbType.VarChar, 100) { Value = dto.SesionPlenoNro.Trim() },
                    new SqlParameter("@SesionPlenoFecha", SqlDbType.DateTime2) { Value = (object?)dto.SesionPlenoFecha ?? DBNull.Value },
                    new SqlParameter("@SesionPlenoResultado", SqlDbType.VarChar, 100) { Value = dto.SesionPlenoResultado.Trim() },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = (object?)dto.Proveido?.Trim() ?? DBNull.Value },
                    new SqlParameter("@InstrumentoGenerado", SqlDbType.VarChar, 50) { Value = (object?)dto.InstrumentoGenerado?.Trim() ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId },
                    $"Constancia de Sesión del Pleno '{dto.SesionPlenoNro}' registrada exitosamente con resultado '{dto.SesionPlenoResultado}'."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Registro de Firmas Duales Concurrentes (Presidencia CMS y Secretaría General CMS)
        /// </summary>
        [Authorize]
        [HttpPost("{id}/firmas-duales")]
        public async Task<IActionResult> RegistrarFirmaDual(int id, [FromBody] RegistrarFirmaDualDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_RegistrarFirmaDual",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@TipoFirma", SqlDbType.VarChar, 30) { Value = dto.TipoFirma.Trim().ToUpperInvariant() },
                    new SqlParameter("@Observaciones", SqlDbType.NVarChar, -1) { Value = (object?)dto.Observaciones?.Trim() ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;
                string cargoTexto = dto.TipoFirma.ToUpperInvariant() == "PRESIDENCIA" ? "Presidencia del CMS" : "Secretaría General del CMS";

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId },
                    $"Firma reglamentaria de {cargoTexto} estampada exitosamente."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        /// <summary>
        /// Despacho Final al Ejecutivo Municipal o Institución Externa con validación de Firmas Duales
        /// </summary>
        [Authorize]
        [HttpPost("{id}/despacho-final")]
        public async Task<IActionResult> DespachoFinal(int id, [FromBody] DespachoFinalDto dto)
        {
            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var outNuevoMovimientoId = new SqlParameter("@NuevoMovimientoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_DespachoFinal",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = id },
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@CiteDespacho", SqlDbType.VarChar, 100) { Value = dto.CiteDespacho.Trim() },
                    new SqlParameter("@DestinatarioFinal", SqlDbType.NVarChar, 250) { Value = dto.DestinatarioFinal.Trim() },
                    new SqlParameter("@Proveido", SqlDbType.NVarChar, -1) { Value = (object?)dto.Proveido?.Trim() ?? DBNull.Value },
                    outNuevoMovimientoId
                );

                int movId = outNuevoMovimientoId.Value != DBNull.Value ? (int)outNuevoMovimientoId.Value : 0;

                return Ok(ApiResponse<object>.Ok(
                    new { tramiteId = id, movimientoId = movId },
                    $"Despacho Final bajo CITE '{dto.CiteDespacho}' procesado exitosamente. Trámite concluido."
                ));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
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
        [AllowAnonymous]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var detalle = await ObtenerDetalleCompletoAsync(id);
            if (detalle == null)
            {
                return NotFound(ApiResponse.ErrorResult("Trámite no encontrado."));
            }

            return Ok(ApiResponse<TramiteDetalleCompletoDto>.Ok(detalle));
        }

        private async Task<TramiteDetalleCompletoDto?> ObtenerDetalleCompletoAsync(int id)
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
                            TipoCorres = reader.GetSafeString("tipo_corres", "EXTERNA"),
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
                            FechaConclusion = reader.GetNullableDateTime("fecha_conclusion"),
                            FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                            FechaInicioInforme = reader.GetNullableDateTime("fecha_inicio_informe"),
                            DiasPlazoInforme = reader.GetNullableInt32("dias_plazo_informe"),
                            FechaFinInforme = reader.GetNullableDateTime("fecha_fin_informe"),
                            TiempoEstimadoHoras = reader.GetSafeInt32("tiempo_estimado_horas", 24),
                            CreadoPorUsuario = reader.GetSafeString("creado_por_usuario"),
                            UnidadOrigen = reader.GetSafeString("unidad_origen"),
                            SesionPlenoNro = reader.GetNullableString("sesion_pleno_nro"),
                            SesionPlenoFecha = reader.GetNullableDateTime("sesion_pleno_fecha"),
                            SesionPlenoResultado = reader.GetNullableString("sesion_pleno_resultado"),
                            FirmaPresidencia = reader.GetSafeInt32("firma_presidencia", 0) == 1,
                            FirmaPresidenciaFecha = reader.GetNullableDateTime("firma_presidencia_fecha"),
                            FirmaPresidenciaUsuario = reader.GetNullableString("firma_presidencia_usuario"),
                            FirmaSecretaria = reader.GetSafeInt32("firma_secretaria", 0) == 1,
                            FirmaSecretariaFecha = reader.GetNullableDateTime("firma_secretaria_fecha"),
                            FirmaSecretariaUsuario = reader.GetNullableString("firma_secretaria_usuario"),
                            DespachoFinalFecha = reader.GetNullableDateTime("despacho_final_fecha"),
                            DespachoFinalCite = reader.GetNullableString("despacho_final_cite"),
                            DespachoFinalDestinatario = reader.GetNullableString("despacho_final_destinatario"),
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
                                Id = reader.GetSafeInt32("id"),
                                Orden = reader.GetSafeInt32("orden"),
                                Actividad = reader.GetSafeString("actividad"),
                                TipoMovimiento = reader.GetSafeString("tipo_movimiento"),
                                UsuarioOrigenId = reader.GetNullableInt32("usuario_origen_id"),
                                UsuarioOrigenNombre = reader.GetNullableString("usuario_origen_nombre"),
                                UsuarioOrigenCargo = reader.GetNullableString("usuario_origen_cargo"),
                                UnidadOrigen = reader.GetSafeString("unidad_origen"),
                                UsuarioDestinoId = reader.GetNullableInt32("usuario_destino_id"),
                                UsuarioDestinoNombre = reader.GetNullableString("usuario_destino_nombre"),
                                UsuarioDestinoCargo = reader.GetNullableString("usuario_destino_cargo"),
                                UnidadDestino = reader.GetNullableString("unidad_destino"),
                                Estado = reader.GetSafeString("estado"),
                                Proveido = reader.GetNullableString("proveido"),
                                Instruccion = reader.GetNullableString("instruccion"),
                                JustificacionRetroceso = reader.GetNullableString("justificacion_retroceso"),
                                InstrumentoGenerado = reader.GetNullableString("instrumento_generado"),
                                InstrumentosGenerados = reader.GetNullableString("instrumentos_generados") ?? reader.GetNullableString("instrumento_generado"),
                                FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                                FechaEnvio = reader.GetNullableDateTime("fecha_envio"),
                                FechaRecepcion = reader.GetNullableDateTime("fecha_recepcion"),
                                Fecha = reader.GetSafeDateTime("fecha"),
                                TiempoEstimadoMinutos = reader.GetSafeInt32("tiempo_estimado_minutos", 0),
                                TiempoTranscurridoMinutos = reader.GetSafeInt32("tiempo_transcurrido_minutos", 0),
                                EsHastaHoy = reader.GetSafeInt32("es_hasta_hoy", 0) == 1
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

            return detalle;
        }

        /// <summary>
        /// Generar Hoja de Ruta imprimible en formato HTML/PDF (RF-08 / Sprint 4)
        /// Permite visualización e impresión directa con diseño institucional Gaceta Sucre.
        /// </summary>
        [AllowAnonymous]
        [HttpGet("{id}/hoja-de-ruta/html")]
        public async Task<IActionResult> GenerarHojaDeRutaHtml(int id, [FromQuery] bool autoprint = false)
        {
            var detalle = await ObtenerDetalleCompletoAsync(id);
            if (detalle == null)
            {
                return NotFound("<h3>Error: Trámite u Hoja de Ruta no encontrado.</h3>");
            }

            var html = RenderHojaDeRutaHtml(detalle, autoprint);
            return Content(html, "text/html; charset=utf-8");
        }

        private static string RenderHojaDeRutaHtml(TramiteDetalleCompletoDto d, bool autoprint)
        {
            var sb = new System.Text.StringBuilder();
            sb.Append("<!DOCTYPE html>");
            sb.Append("<html lang=\"es\">");
            sb.Append("<head>");
            sb.Append("<meta charset=\"UTF-8\" />");
            sb.Append("<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />");
            sb.Append($"<title>Hoja de Ruta - {System.Net.WebUtility.HtmlEncode(d.NumeroCorrelativo)}</title>");
            sb.Append("<style>");
            sb.Append(@"
                @page { size: letter portrait; margin: 10mm 12mm 12mm 12mm; }
                * { box-sizing: border-box; }
                body {
                    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
                    font-size: 11px;
                    color: #1A202C;
                    background-color: #F8F9FA;
                    margin: 0;
                    padding: 20px;
                }
                .toolbar {
                    max-width: 800px;
                    margin: 0 auto 15px auto;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: #1B365D;
                    color: white;
                    padding: 10px 18px;
                    border-radius: 6px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
                }
                .toolbar button {
                    background: #800000;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    font-weight: 600;
                    border-radius: 4px;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .toolbar button:hover { background: #9B111E; }
                .page {
                    max-width: 800px;
                    margin: 0 auto;
                    background: #FFFFFF;
                    padding: 25px 30px;
                    border: 1px solid #CBD5E0;
                    border-radius: 4px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.06);
                }
                .header-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 12px;
                    border-bottom: 2px solid #800000;
                    padding-bottom: 8px;
                }
                .header-table td { vertical-align: middle; }
                .inst-title {
                    font-size: 13px;
                    font-weight: bold;
                    color: #800000;
                    letter-spacing: 0.5px;
                    text-transform: uppercase;
                }
                .inst-sub {
                    font-size: 11px;
                    font-weight: 600;
                    color: #1B365D;
                    margin-top: 2px;
                }
                .doc-title {
                    font-size: 15px;
                    font-weight: 800;
                    color: #1B365D;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                    margin-top: 4px;
                }
                .corr-box {
                    border: 2px solid #800000;
                    background: #FDF8F8;
                    padding: 6px 12px;
                    text-align: center;
                    border-radius: 4px;
                }
                .corr-nro {
                    font-size: 16px;
                    font-weight: 800;
                    color: #800000;
                }
                .corr-gestion {
                    font-size: 10px;
                    color: #4A5568;
                    font-weight: 600;
                }
                .section-header {
                    background: #1B365D;
                    color: #FFFFFF;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    padding: 4px 8px;
                    margin-top: 10px;
                    margin-bottom: 6px;
                    border-left: 4px solid #800000;
                }
                .info-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 8px;
                }
                .info-table th {
                    background: #EDF2F7;
                    color: #2D3748;
                    font-size: 9.5px;
                    text-align: left;
                    padding: 4px 6px;
                    border: 1px solid #CBD5E0;
                    width: 22%;
                    font-weight: 600;
                }
                .info-table td {
                    font-size: 10px;
                    padding: 4px 6px;
                    border: 1px solid #CBD5E0;
                    color: #1A202C;
                }
                .timeline-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 6px;
                    margin-bottom: 12px;
                }
                .timeline-table th {
                    background: #800000;
                    color: #FFFFFF;
                    font-size: 9px;
                    font-weight: 700;
                    padding: 5px 6px;
                    border: 1px solid #4A5568;
                    text-align: center;
                }
                .timeline-table td {
                    font-size: 9px;
                    padding: 5px 6px;
                    border: 1px solid #CBD5E0;
                    vertical-align: top;
                }
                .timeline-table tr:nth-child(even) { background-color: #F7FAFC; }
                .firma-box {
                    height: 48px;
                    border: 1px dashed #A0AEC0;
                    background: #FFFFFF;
                    text-align: center;
                    font-size: 8px;
                    color: #A0AEC0;
                    display: flex;
                    align-items: flex-end;
                    justify-content: center;
                    padding-bottom: 2px;
                }
                .manual-box {
                    border: 1px solid #4A5568;
                    background: #FFFFFF;
                    padding: 6px;
                    margin-bottom: 8px;
                    font-size: 9px;
                }
                .manual-grid {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 8px;
                }
                .footer {
                    margin-top: 15px;
                    border-top: 1px solid #CBD5E0;
                    padding-top: 8px;
                    font-size: 8.5px;
                    color: #718096;
                    display: flex;
                    justify-content: space-between;
                }
                .badge {
                    display: inline-block;
                    padding: 2px 6px;
                    border-radius: 3px;
                    font-weight: 700;
                    font-size: 8.5px;
                }
                .badge-concluido { background: #C6F6D5; color: #22543D; border: 1px solid #9AE6B4; }
                .badge-atencion { background: #EBF8FF; color: #2B6CB0; border: 1px solid #BEE3F8; }
                .badge-urgente { background: #FED7D7; color: #9B2C2C; border: 1px solid #FEB2B2; }
                @media print {
                    body { background: #FFFFFF; padding: 0; font-size: 10px; }
                    .toolbar { display: none !important; }
                    .page { border: none; box-shadow: none; padding: 0; max-width: 100%; }
                    tr { page-break-inside: avoid; }
                }
            ");
            sb.Append("</style>");
            sb.Append("</head>");
            sb.Append("<body>");

            // Barra de herramientas para impresión
            sb.Append("<div class=\"toolbar\">");
            sb.Append($"<div><strong>Concejo Municipal de Sucre</strong> | Hoja de Ruta Oficial: {System.Net.WebUtility.HtmlEncode(d.NumeroCorrelativo)}</div>");
            sb.Append("<div>");
            sb.Append("<button onclick=\"window.print()\">🖨️ Imprimir / Guardar como PDF</button>");
            sb.Append("</div>");
            sb.Append("</div>");

            // Documento de Hoja de Ruta
            sb.Append("<div class=\"page\">");

            // Encabezado
            sb.Append("<table class=\"header-table\"><tr>");
            sb.Append("<td style=\"width: 65px; text-align: center;\">");
            sb.Append("<svg width=\"50\" height=\"50\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"#800000\" stroke-width=\"1.8\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z\"/><polyline points=\"9 22 9 12 15 12 15 22\"/></svg>");
            sb.Append("</td>");
            sb.Append("<td>");
            sb.Append("<div class=\"inst-title\">Gobierno Autónomo Municipal de Sucre</div>");
            sb.Append("<div class=\"inst-sub\">CONCEJO MUNICIPAL DE SUCRE - GACETA OFICIAL</div>");
            sb.Append("<div class=\"doc-title\">HOJA DE RUTA DE TRÁMITES Y CORRESPONDENCIA</div>");
            sb.Append("</td>");
            sb.Append("<td style=\"width: 190px;\">");
            sb.Append("<div class=\"corr-box\">");
            sb.Append("<div class=\"corr-gestion\">CÓDIGO DE HOJA DE RUTA</div>");
            sb.Append($"<div class=\"corr-nro\">{System.Net.WebUtility.HtmlEncode(d.NumeroCorrelativo)}</div>");
            sb.Append($"<div class=\"corr-gestion\">GESTIÓN: {d.Gestion} &bull; ESTADO: <span class=\"badge {(d.Estado == "CONCLUIDO" ? "badge-concluido" : "badge-atencion")}\">{System.Net.WebUtility.HtmlEncode(d.Estado)}</span></div>");
            sb.Append("</div>");
            sb.Append("</td>");
            sb.Append("</tr></table>");

            // Sección 1: Datos de Radicatoria y Remitente
            sb.Append("<div class=\"section-header\">1. Datos de Radicatoria y Remitente</div>");
            sb.Append("<table class=\"info-table\">");
            sb.Append("<tr>");
            sb.Append("<th>Tipo de Proceso / Asunto:</th>");
            sb.Append($"<td><strong>{System.Net.WebUtility.HtmlEncode(d.TipoProcesoNombre)}</strong> ({System.Net.WebUtility.HtmlEncode(d.TipoProcesoCodigo)})</td>");
            sb.Append("<th>Fecha y Hora Ingreso:</th>");
            sb.Append($"<td>{d.FechaCreacion:dd/MM/yyyy HH:mm}</td>");
            sb.Append("</tr>");
            sb.Append("<tr>");
            sb.Append("<th>Procedencia / Categoría:</th>");
            sb.Append($"<td>{System.Net.WebUtility.HtmlEncode(d.TipoCategoria)} &bull; {System.Net.WebUtility.HtmlEncode(d.TipoCorres)}</td>");
            sb.Append("<th>Prioridad / Fojas:</th>");
            sb.Append($"<td><span class=\"badge {(d.Prioridad == "URGENTE" ? "badge-urgente" : "")}\">{System.Net.WebUtility.HtmlEncode(d.Prioridad)}</span> &bull; {d.NroHojas} foja(s), {d.NroAnexos} anexo(s)</td>");
            sb.Append("</tr>");
            sb.Append("<tr>");
            sb.Append("<th>Remitente Oficial:</th>");
            sb.Append($"<td><strong>{System.Net.WebUtility.HtmlEncode(d.Remitente)}</strong>{(string.IsNullOrEmpty(d.InstitucionRemitente) ? "" : $" &bull; {System.Net.WebUtility.HtmlEncode(d.InstitucionRemitente)}")}</td>");
            sb.Append("<th>CITE Externo:</th>");
            sb.Append($"<td>{(string.IsNullOrEmpty(d.CiteExterno) ? "S/C" : System.Net.WebUtility.HtmlEncode(d.CiteExterno))}</td>");
            sb.Append("</tr>");
            sb.Append("<tr>");
            sb.Append("<th>Referencia / Objeto:</th>");
            sb.Append($"<td colspan=\"3\"><strong>{System.Net.WebUtility.HtmlEncode(d.Referencia)}</strong></td>");
            sb.Append("</tr>");
            if (!string.IsNullOrWhiteSpace(d.Instruccion))
            {
                sb.Append("<tr>");
                sb.Append("<th>Instrucción Inicial:</th>");
                sb.Append($"<td colspan=\"3\">{System.Net.WebUtility.HtmlEncode(d.Instruccion)}</td>");
                sb.Append("</tr>");
            }
            sb.Append("</table>");

            // Sección 2: Asignación y Destino Inicial
            sb.Append("<div class=\"section-header\">2. Asignación y Destino Inicial</div>");
            sb.Append("<table class=\"info-table\">");
            sb.Append("<tr>");
            sb.Append("<th>Primer Destinatario:</th>");
            sb.Append($"<td><strong>{System.Net.WebUtility.HtmlEncode(d.DestinatarioNombre ?? "No asignado")}</strong></td>");
            sb.Append("<th>Cargo y Unidad:</th>");
            sb.Append($"<td>{System.Net.WebUtility.HtmlEncode(d.DestinatarioCargo ?? "-")} &bull; {System.Net.WebUtility.HtmlEncode(d.DestinatarioUnidad ?? "-")}</td>");
            sb.Append("</tr>");
            sb.Append("<tr>");
            sb.Append("<th>Ingresado por:</th>");
            sb.Append($"<td>{System.Net.WebUtility.HtmlEncode(d.CreadoPorUsuario)} ({System.Net.WebUtility.HtmlEncode(d.UnidadOrigen)})</td>");
            sb.Append("<th>Plazo de Respuesta:</th>");
            sb.Append($"<td>{(d.FechaLimiteRespuesta.HasValue ? d.FechaLimiteRespuesta.Value.ToString("dd/MM/yyyy") : "Según reglamento")}</td>");
            sb.Append("</tr>");
            sb.Append("</table>");

            // Sección 3: Resoluciones e Instrumentos Legislativos (si existen)
            if (!string.IsNullOrEmpty(d.SesionPlenoNro) || d.FirmaPresidencia || d.FirmaSecretaria || !string.IsNullOrEmpty(d.DespachoFinalCite))
            {
                sb.Append("<div class=\"section-header\">3. Actuaciones del Pleno y Despacho Final</div>");
                sb.Append("<table class=\"info-table\">");
                sb.Append("<tr>");
                sb.Append("<th>Sesión de Pleno:</th>");
                sb.Append($"<td>{System.Net.WebUtility.HtmlEncode(d.SesionPlenoNro ?? "-")} &bull; Resultado: <strong>{System.Net.WebUtility.HtmlEncode(d.SesionPlenoResultado ?? "-")}</strong></td>");
                sb.Append("<th>Firmas Directivas:</th>");
                sb.Append($"<td>Presidencia: {(d.FirmaPresidencia ? "✅ Firmado" : "Pendiente")} | Secretaría: {(d.FirmaSecretaria ? "✅ Firmado" : "Pendiente")}</td>");
                sb.Append("</tr>");
                if (!string.IsNullOrEmpty(d.DespachoFinalCite))
                {
                    sb.Append("<tr>");
                    sb.Append("<th>Despacho Final:</th>");
                    sb.Append($"<td>CITE: <strong>{System.Net.WebUtility.HtmlEncode(d.DespachoFinalCite)}</strong></td>");
                    sb.Append("<th>Destinatario Final:</th>");
                    sb.Append($"<td>{System.Net.WebUtility.HtmlEncode(d.DespachoFinalDestinatario ?? "-")}</td>");
                    sb.Append("</tr>");
                }
                sb.Append("</table>");
            }

            // Sección 4: Cadena de Custodia y Movimientos Registrados
            sb.Append("<div class=\"section-header\">4. Cadena de Custodia y Movimientos Registrados en Sistema</div>");
            sb.Append("<table class=\"timeline-table\">");
            sb.Append("<thead>");
            sb.Append("<tr>");
            sb.Append("<th style=\"width: 25px;\">N°</th>");
            sb.Append("<th style=\"width: 100px;\">Fecha / Hora</th>");
            sb.Append("<th style=\"width: 130px;\">De (Remitente)</th>");
            sb.Append("<th style=\"width: 130px;\">A (Destinatario)</th>");
            sb.Append("<th>Proveído / Instrucción / Instrumento</th>");
            sb.Append("<th style=\"width: 85px;\">Firma / Sello</th>");
            sb.Append("</tr>");
            sb.Append("</thead>");
            sb.Append("<tbody>");

            if (d.Historial == null || d.Historial.Count == 0)
            {
                sb.Append("<tr><td colspan=\"6\" style=\"text-align: center; color: #718096; padding: 10px;\">Sin movimientos registrados.</td></tr>");
            }
            else
            {
                foreach (var mov in d.Historial)
                {
                    sb.Append("<tr>");
                    sb.Append($"<td style=\"text-align: center; font-weight: bold;\">{mov.Orden}</td>");
                    sb.Append($"<td><div>Env: {mov.FechaEnvio:dd/MM/yy HH:mm}</div>{(mov.FechaRecepcion.HasValue ? $"<div>Rec: {mov.FechaRecepcion.Value:dd/MM/yy HH:mm}</div>" : "<div style=\"color:#C53030;\">Sin recepción</div>")}</td>");
                    sb.Append($"<td><strong>{System.Net.WebUtility.HtmlEncode(mov.UsuarioOrigenNombre ?? "Ventanilla")}</strong><br/><span style=\"color:#718096; font-size:8px;\">{System.Net.WebUtility.HtmlEncode(mov.UnidadOrigen)}</span></td>");
                    sb.Append($"<td><strong>{System.Net.WebUtility.HtmlEncode(mov.UsuarioDestinoNombre ?? "-")}</strong><br/><span style=\"color:#718096; font-size:8px;\">{System.Net.WebUtility.HtmlEncode(mov.UnidadDestino ?? "-")}</span></td>");
                    sb.Append($"<td><div><strong>[{System.Net.WebUtility.HtmlEncode(mov.TipoMovimiento)}]</strong> {System.Net.WebUtility.HtmlEncode(mov.Proveido ?? mov.Instruccion ?? "-")}</div>{(!string.IsNullOrEmpty(mov.InstrumentosGenerados) ? $"<div style=\"color:#800000; font-weight:600; margin-top:2px;\">Doc: {System.Net.WebUtility.HtmlEncode(mov.InstrumentosGenerados)}</div>" : "")}</td>");
                    sb.Append("<td><div class=\"firma-box\">Sello y Firma</div></td>");
                    sb.Append("</tr>");
                }
            }
            sb.Append("</tbody>");
            sb.Append("</table>");

            // Sección 5: Diligencias Físicas Complementarias
            sb.Append("<div class=\"section-header\">5. Diligencias y Proveídos Físicos Siguientes (Continuación en Papel)</div>");
            sb.Append("<div class=\"manual-grid\">");
            for (int i = 1; i <= 2; i++)
            {
                sb.Append("<div class=\"manual-box\">");
                sb.Append("<div style=\"display:flex; justify-content:space-between; margin-bottom:4px; font-weight:bold; color:#1B365D;\">");
                sb.Append($"<span>ACTUACIÓN FÍSICA N° _____</span>");
                sb.Append("<span>Fecha: ___/___/2026 Hora: ___:___</span>");
                sb.Append("</div>");
                sb.Append("<div style=\"margin-bottom:3px;\">DE: _________________________________ UNIDAD: _____________________</div>");
                sb.Append("<div style=\"margin-bottom:3px;\">A: __________________________________ UNIDAD: _____________________</div>");
                sb.Append("<div style=\"margin-bottom:4px;\">PROVEÍDO / INSTRUCCIÓN: ___________________________________________</div>");
                sb.Append("<div style=\"margin-bottom:4px; border-bottom: 1px dotted #CBD5E0; height: 12px;\"></div>");
                sb.Append("<div style=\"display:flex; justify-content:space-between; margin-top:6px; font-size:8px; color:#718096;\">");
                sb.Append("<span>Fojas remitidas: _____</span>");
                sb.Append("<span style=\"border:1px dashed #A0AEC0; padding:2px 12px;\">Sello y Firma Receptor</span>");
                sb.Append("</div>");
                sb.Append("</div>");
            }
            sb.Append("</div>");

            // Pie de página oficial
            sb.Append("<div class=\"footer\">");
            sb.Append("<div>Documento Oficial emitido por el Sistema de Gestión Documental y Trámites &bull; Concejo Municipal de Sucre</div>");
            sb.Append($"<div>Impresión: {DateTime.Now:dd/MM/yyyy HH:mm:ss} &bull; Validez oficial institucional</div>");
            sb.Append("</div>");

            sb.Append("</div>"); // Fin .page

            if (autoprint)
            {
                sb.Append("<script>window.onload = function() { window.print(); };</script>");
            }

            sb.Append("</body>");
            sb.Append("</html>");

            return sb.ToString();
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
                    new SqlParameter("@TipoCorres", SqlDbType.VarChar, 20) { Value = !string.IsNullOrWhiteSpace(dto.TipoCorres) ? dto.TipoCorres.Trim().ToUpper() : "EXTERNA" },
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
                    Gestion = DateTime.Now.Year,
                    TipoProcesoId = dto.TipoProcesoId,
                    TipoProcesoCodigo = string.Empty,
                    TipoProcesoNombre = string.Empty,
                    TipoCategoria = "CORRESPONDENCIA",
                    TipoCorres = !string.IsNullOrWhiteSpace(dto.TipoCorres) ? dto.TipoCorres.Trim().ToUpper() : "EXTERNA",
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
                    FechaCreacion = DateTime.Now,
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
        /// Exclusivo de Administrador de Trámites y Administrador del Sistema.
        /// </summary>
        [Authorize]
        [HttpPost("{id}/anular")]
        public async Task<IActionResult> Anular(int id, [FromBody] AnularTramiteDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse.ErrorResult(string.IsNullOrEmpty(errors) ? "Motivo de anulación requerido." : errors));
            }

            var rolCodigo = User.FindFirst("rolCodigo")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            bool esAdmin = rolCodigo == "ADMIN_SISTEMA" || rolCodigo == "ADMIN_TRAMITES";
            if (!esAdmin)
            {
                return StatusCode(403, ApiResponse.ErrorResult("Acceso denegado: La anulación de trámites es una operación reservada para el Administrador de Trámites o Administrador del Sistema (RF-10.1)."));
            }

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

                return Ok(ApiResponse.SuccessResult("Trámite anulado formalmente de forma exitosa."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult("Error interno al procesar la anulación del trámite: " + ex.Message));
            }
        }

        /// <summary>
        /// Habilitación y reactivación de trámite concluido (RF-10.2)
        /// Permite al Administrador de Trámites reactivar el flujo de un expediente finalizado.
        /// </summary>
        [Authorize]
        [HttpPost("{id}/habilitar")]
        public async Task<IActionResult> Habilitar(int id, [FromBody] HabilitarTramiteDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse.ErrorResult(string.IsNullOrEmpty(errors) ? "Motivo de habilitación requerido." : errors));
            }

            var rolCodigo = User.FindFirst("rolCodigo")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            bool esAdmin = rolCodigo == "ADMIN_SISTEMA" || rolCodigo == "ADMIN_TRAMITES";
            if (!esAdmin)
            {
                return StatusCode(403, ApiResponse.ErrorResult("Acceso denegado: La habilitación de trámites concluidos es una operación reservada para el Administrador de Trámites o Administrador del Sistema (RF-10.2)."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubiClaim == null || ubicacionId <= 0) ubicacionId = 3;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Habilitar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Motivo", SqlDbType.NVarChar, -1) { Value = dto.Motivo.Trim() },
                    new SqlParameter("@UserId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionId", SqlDbType.Int) { Value = ubicacionId }
                );

                return Ok(ApiResponse.SuccessResult("Trámite habilitado y reactivado exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult("Error interno al procesar la habilitación del trámite: " + ex.Message));
            }
        }

        /// <summary>
        /// Bloqueo administrativo temporal de trámite (RF-11.1, RF-11.2, RF-11.3)
        /// Permite a Ventanilla Única y Administración suspender temporalmente el flujo operativo.
        /// </summary>
        [Authorize]
        [HttpPost("{id}/bloquear")]
        public async Task<IActionResult> Bloquear(int id, [FromBody] BloquearTramiteDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse.ErrorResult(string.IsNullOrEmpty(errors) ? "Motivo o proveído de bloqueo inválido." : errors));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubiClaim == null || ubicacionId <= 0) ubicacionId = 3;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Bloquear",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Motivo", SqlDbType.NVarChar, -1) { Value = dto.Motivo.Trim() },
                    new SqlParameter("@UserId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionId", SqlDbType.Int) { Value = ubicacionId }
                );

                return Ok(ApiResponse.SuccessResult("Trámite bloqueado temporalmente de forma exitosa."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult("Error interno al procesar el bloqueo: " + ex.Message));
            }
        }

        /// <summary>
        /// Desbloqueo y reactivación de trámite (RF-11.4)
        /// Reactiva un trámite bloqueado retornándolo al estado operativo EN_ATENCION.
        /// </summary>
        [Authorize]
        [HttpPost("{id}/desbloquear")]
        public async Task<IActionResult> Desbloquear(int id, [FromBody] DesbloquearTramiteDto dto)
        {
            if (!ModelState.IsValid)
            {
                var errors = string.Join("; ", ModelState.Values.SelectMany(v => v.Errors).Select(e => e.ErrorMessage));
                return BadRequest(ApiResponse.ErrorResult(string.IsNullOrEmpty(errors) ? "Motivo o proveído de desbloqueo inválido." : errors));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1;

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubiClaim == null || ubicacionId <= 0) ubicacionId = 3;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Tramites_Desbloquear",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Motivo", SqlDbType.NVarChar, -1) { Value = dto.Motivo.Trim() },
                    new SqlParameter("@UserId", SqlDbType.Int) { Value = userId },
                    new SqlParameter("@UbicacionId", SqlDbType.Int) { Value = ubicacionId }
                );

                return Ok(ApiResponse.SuccessResult("Trámite desbloqueado y reactivado exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult("Error interno al procesar el desbloqueo: " + ex.Message));
            }
        }

        /// <summary>
        /// Búsqueda avanzada de trámites por proceso y por estado/fechas (RF-12.2 / RF-12.4).
        /// Devuelve datos referenciales, actividad actual, responsable y fecha de ingreso
        /// a la bandeja actual, con paginación.
        /// </summary>
        /// <remarks>
        /// ADMIN_SISTEMA y ADMIN_TRAMITES pueden consultar todos los trámites.
        /// Los demás roles solo pueden consultar trámites de su ubicación orgánica (§5.3).
        /// </remarks>
        [Authorize]
        [HttpGet("busqueda-avanzada")]
        public async Task<IActionResult> BuscarAvanzado(
            [FromQuery] string? correlativo = null,
            [FromQuery(Name = "tipo_proceso_id")] int? tipoProcesoId = null,
            [FromQuery] string? estado = null,
            [FromQuery(Name = "fecha_desde")] DateTime? fechaDesde = null,
            [FromQuery(Name = "fecha_hasta")] DateTime? fechaHasta = null,
            [FromQuery] int? gestion = null,
            [FromQuery] string? search = null,
            [FromQuery(Name = "ubicacion_org_id")] int? ubicacionOrgId = null,
            [FromQuery] int limit = 100,
            [FromQuery] int offset = 0)
        {
            // ---------------------------------------------------------
            // 1. Validaciones de rango y paginación
            // ---------------------------------------------------------
            if (fechaDesde.HasValue && fechaHasta.HasValue)
            {
                if (fechaHasta.Value.Date < fechaDesde.Value.Date)
                {
                    return BadRequest(ApiResponse.ErrorResult(
                        "La fecha 'hasta' no puede ser anterior a la fecha 'desde'."));
                }
            }

            limit = Math.Clamp(limit, 1, 200);
            offset = Math.Max(offset, 0);

            // ---------------------------------------------------------
            // 2. Resolver alcance por rol / oficina (§5.3)
            // ---------------------------------------------------------
            var rolCodigo = User.FindFirst("rolCodigo")?.Value ?? User.FindFirst(ClaimTypes.Role)?.Value;
            bool esAdmin = rolCodigo == "ADMIN_SISTEMA" || rolCodigo == "ADMIN_TRAMITES";

            int? ubicacionClaim = null;
            if (int.TryParse(User.FindFirst("ubicacionOrgId")?.Value, out int ubi) && ubi > 0)
            {
                ubicacionClaim = ubi;
            }

            if (!esAdmin && !ubicacionClaim.HasValue)
            {
                return StatusCode(403, ApiResponse.ErrorResult(
                    "El usuario no tiene una ubicación orgánica asignada para realizar búsquedas."));
            }

            int? ubicacionFiltro = esAdmin
                ? (ubicacionOrgId.HasValue && ubicacionOrgId.Value > 0 ? ubicacionOrgId : (int?)null)
                : ubicacionClaim;

            string? Normalizar(string? valor) =>
                string.IsNullOrWhiteSpace(valor) ? null : valor.Trim();

            var estadoFiltro = Normalizar(estado);
            if (string.Equals(estadoFiltro, "TODOS", StringComparison.OrdinalIgnoreCase))
            {
                estadoFiltro = null;
            }
            else if (estadoFiltro != null)
            {
                estadoFiltro = estadoFiltro.ToUpperInvariant();
            }

            int total = 0;
            var resultado = new TramiteBusquedaAvanzadaDto();

            try
            {
                var items = await _sp.QueryAsync(
                    "dbo.usp_Tramites_BusquedaAvanzada",
                    reader =>
                    {
                        total = reader.GetSafeInt32("total_registros");

                        return new TramiteBusquedaItemDto
                        {
                            Id = reader.GetSafeInt32("id"),
                            NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                            Gestion = reader.GetSafeInt32("gestion"),
                            TipoProcesoId = reader.GetSafeInt32("tipo_proceso_id"),
                            TipoProcesoCodigo = reader.GetSafeString("tipo_proceso_codigo"),
                            TipoProcesoNombre = reader.GetSafeString("tipo_proceso_nombre"),
                            TipoCategoria = reader.GetNullableString("tipo_categoria"),
                            Remitente = reader.GetSafeString("remitente"),
                            InstitucionRemitente = reader.GetNullableString("institucion_remitente"),
                            CiteExterno = reader.GetNullableString("cite_externo"),
                            Referencia = reader.GetSafeString("referencia"),
                            Estado = reader.GetSafeString("estado"),
                            Prioridad = reader.GetSafeString("prioridad"),
                            NroHojas = reader.GetSafeInt32("nro_hojas"),
                            NroAnexos = reader.GetSafeInt32("nro_anexos"),
                            ActividadActual = reader.GetSafeString("actividad_actual"),
                            UsuarioActualId = reader.GetNullableInt32("usuario_actual_id"),
                            UsuarioActualNombre = reader.GetNullableString("usuario_actual_nombre"),
                            UsuarioActualLogin = reader.GetNullableString("usuario_actual_login"),
                            UsuarioActualCargo = reader.GetNullableString("usuario_actual_cargo"),
                            UbicacionActualId = reader.GetNullableInt32("ubicacion_actual_id"),
                            UbicacionActualNombre = reader.GetNullableString("ubicacion_actual_nombre"),
                            UbicacionActualSigla = reader.GetNullableString("ubicacion_actual_sigla"),
                            FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                            FechaIngresoBandeja = reader.GetSafeDateTime("fecha_ingreso_bandeja"),
                            FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                            DiasEnBandeja = reader.GetSafeInt32("dias_en_bandeja"),
                            EsVencido = reader.GetSafeBoolean("es_vencido"),
                            NroAdjuntos = reader.GetSafeInt32("nro_adjuntos")
                        };
                    },
                    new SqlParameter("@Correlativo", SqlDbType.NVarChar, 50) { Value = (object?)Normalizar(correlativo) ?? DBNull.Value },
                    new SqlParameter("@TipoProcesoId", SqlDbType.Int) { Value = (object?)tipoProcesoId ?? DBNull.Value },
                    new SqlParameter("@Estado", SqlDbType.VarChar, 30) { Value = (object?)estadoFiltro ?? DBNull.Value },
                    new SqlParameter("@FechaDesde", SqlDbType.Date) { Value = (object?)fechaDesde?.Date ?? DBNull.Value },
                    new SqlParameter("@FechaHasta", SqlDbType.Date) { Value = (object?)fechaHasta?.Date ?? DBNull.Value },
                    new SqlParameter("@Gestion", SqlDbType.Int) { Value = (object?)gestion ?? DBNull.Value },
                    new SqlParameter("@Search", SqlDbType.NVarChar, 200) { Value = (object?)Normalizar(search) ?? DBNull.Value },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)ubicacionFiltro ?? DBNull.Value },
                    new SqlParameter("@Limit", SqlDbType.Int) { Value = limit },
                    new SqlParameter("@Offset", SqlDbType.Int) { Value = offset }
                );

                resultado.Total = total;
                resultado.Items = items;

                return Ok(ApiResponse<TramiteBusquedaAvanzadaDto>.Ok(
                    resultado,
                    $"Búsqueda completada: {total} trámite(s) encontrado(s)."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult(
                    "Error interno al realizar la búsqueda de trámites: " + ex.Message));
            }
        }
    }
}
