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
using GestionDocumental.Api.DTOs.Reportes;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class ReportesController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public ReportesController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        /// <summary>
        /// Pendientes del escritorio virtual de un funcionario (RF-12.7).
        /// Devuelve totales operativos, resumen semanal por estado y el detalle
        /// de los trámites activos asignados al funcionario.
        /// </summary>
        /// <remarks>
        /// ADMIN_SISTEMA y ADMIN_TRAMITES pueden consultar cualquier funcionario.
        /// Los demás roles solo pueden consultar funcionarios de su misma
        /// ubicación orgánica del JWT (§5.3).
        /// </remarks>
        [Authorize]
        [HttpGet("pendientes-funcionario")]
        public async Task<IActionResult> GetPendientesPorFuncionario(
            [FromQuery(Name = "funcionario_id")] int funcionarioId,
            [FromQuery(Name = "gestion")] int? gestion = null,
            [FromQuery(Name = "fecha_corte")] DateTime? fechaCorte = null)
        {
            if (funcionarioId <= 0)
            {
                return BadRequest(ApiResponse.ErrorResult(
                    "Debe seleccionar un funcionario válido para generar el reporte."));
            }

            // ---------------------------------------------------------
            // 1. Resolver alcance por rol / oficina (§5.3)
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
                    "El usuario no tiene una ubicación orgánica asignada para generar reportes."));
            }

            DateTime corte = (fechaCorte ?? DateTime.Today).Date;
            var resultado = new PendientesFuncionarioDto
            {
                Gestion = gestion,
                FechaCorte = corte
            };

            var porEstado = new List<PendientesEstadoSemanalDto>();
            var detalle = new List<PendienteDetalleDto>();
            bool cabeceraEncontrada = false;

            try
            {
                await _sp.ExecuteMultiReaderAsync(
                    "dbo.usp_Reportes_PendientesPorFuncionario",
                    async reader =>
                    {
                        // RS1: Cabecera y totales
                        if (await reader.ReadAsync())
                        {
                            cabeceraEncontrada = true;
                            resultado.Funcionario = new PendientesFuncionarioCabeceraDto
                            {
                                Id = reader.GetSafeInt32("funcionario_id"),
                                Nombre = reader.GetSafeString("funcionario_nombre"),
                                Cargo = reader.GetNullableString("cargo"),
                                UnidadNombre = reader.GetNullableString("unidad_nombre"),
                                UbicacionOrgId = reader.GetNullableInt32("ubicacion_org_id"),
                                UbicacionNombre = reader.GetNullableString("ubicacion_nombre"),
                                UbicacionSigla = reader.GetNullableString("ubicacion_sigla")
                            };
                            resultado.Gestion = reader.GetNullableInt32("gestion");
                            resultado.FechaCorte = reader.GetSafeDateTime("fecha_corte");
                            resultado.FechaCalculo = reader.GetSafeDateTime("fecha_calculo");
                            resultado.Totales = new PendientesFuncionarioTotalesDto
                            {
                                Pendientes = reader.GetSafeInt32("pendientes"),
                                EnMovimiento = reader.GetSafeInt32("en_movimiento"),
                                EnAtencion = reader.GetSafeInt32("en_atencion"),
                                Atendidos = reader.GetSafeInt32("atendidos"),
                                Bloqueados = reader.GetSafeInt32("bloqueados"),
                                Vencidos = reader.GetSafeInt32("vencidos")
                            };
                        }

                        // RS2: Resumen semanal por estado
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                porEstado.Add(new PendientesEstadoSemanalDto
                                {
                                    Estado = reader.GetSafeString("estado"),
                                    Anterior = reader.GetSafeInt32("anterior"),
                                    SemanaActual = reader.GetSafeInt32("semana_actual"),
                                    Hoy = reader.GetSafeInt32("hoy"),
                                    Total = reader.GetSafeInt32("total")
                                });
                            }
                        }

                        // RS3: Detalle de trámites pendientes
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                detalle.Add(new PendienteDetalleDto
                                {
                                    Id = reader.GetSafeInt32("id"),
                                    NumeroCorrelativo = reader.GetSafeString("numero_correlativo"),
                                    Gestion = reader.GetSafeInt32("gestion"),
                                    TipoProcesoCodigo = reader.GetSafeString("tipo_proceso_codigo"),
                                    TipoProcesoNombre = reader.GetSafeString("tipo_proceso_nombre"),
                                    Remitente = reader.GetSafeString("remitente"),
                                    InstitucionRemitente = reader.GetNullableString("institucion_remitente"),
                                    CiteExterno = reader.GetNullableString("cite_externo"),
                                    Referencia = reader.GetSafeString("referencia"),
                                    Estado = reader.GetSafeString("estado"),
                                    Prioridad = reader.GetSafeString("prioridad"),
                                    ActividadActual = reader.GetSafeString("actividad_actual"),
                                    UbicacionActualId = reader.GetNullableInt32("ubicacion_actual_id"),
                                    UbicacionActualNombre = reader.GetNullableString("ubicacion_actual_nombre"),
                                    FechaCreacion = reader.GetSafeDateTime("fecha_creacion"),
                                    FechaIngresoBandeja = reader.GetSafeDateTime("fecha_ingreso_bandeja"),
                                    FechaLimiteRespuesta = reader.GetNullableDateTime("fecha_limite_respuesta"),
                                    DiasEnBandeja = reader.GetSafeInt32("dias_en_bandeja"),
                                    EsVencido = reader.GetSafeBoolean("es_vencido")
                                });
                            }
                        }
                    },
                    new SqlParameter("@FuncionarioId", SqlDbType.Int) { Value = funcionarioId },
                    new SqlParameter("@Gestion", SqlDbType.Int) { Value = (object?)gestion ?? DBNull.Value },
                    new SqlParameter("@FechaCorte", SqlDbType.Date) { Value = corte }
                );

                if (!cabeceraEncontrada)
                {
                    return NotFound(ApiResponse.ErrorResult(
                        "El funcionario seleccionado no existe en el padrón institucional."));
                }

                // Un usuario no administrador solo puede consultar su propia oficina.
                if (!esAdmin && resultado.Funcionario.UbicacionOrgId != ubicacionClaim)
                {
                    return StatusCode(403, ApiResponse.ErrorResult(
                        "Acceso denegado: solo puede consultar funcionarios de su ubicación orgánica."));
                }

                resultado.PorEstado = porEstado;
                resultado.Detalle = detalle;

                return Ok(ApiResponse<PendientesFuncionarioDto>.Ok(
                    resultado,
                    "Reporte de pendientes por funcionario generado exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult(
                    "Error interno al generar los pendientes por funcionario: " + ex.Message));
            }
        }
    }
}
