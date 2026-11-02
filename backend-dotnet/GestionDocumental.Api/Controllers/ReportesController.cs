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
        private const int MaxDiasRango = 366;

        private readonly IStoredProcedureService _sp;

        public ReportesController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        /// <summary>
        /// Reporte global de trámites por rango de fechas (RF-12.1).
        /// Devuelve cantidades de procesos Iniciados, Movidos y Concluidos, con
        /// desglose por tipo de proceso y serie diaria.
        /// </summary>
        /// <remarks>
        /// Los perfiles ADMIN_SISTEMA y ADMIN_TRAMITES ven todas las oficinas
        /// (o pueden filtrar por una con <paramref name="ubicacionOrgId"/>).
        /// Los demás roles quedan restringidos a su ubicación orgánica del JWT (§5.3).
        /// </remarks>
        [Authorize]
        [HttpGet("global")]
        public async Task<IActionResult> GetReporteGlobal(
            [FromQuery(Name = "fecha_desde")] DateTime? fechaDesde = null,
            [FromQuery(Name = "fecha_hasta")] DateTime? fechaHasta = null,
            [FromQuery(Name = "gestion")] int? gestion = null,
            [FromQuery(Name = "ubicacion_org_id")] int? ubicacionOrgId = null)
        {
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

            int? ubicacionFiltro;
            if (esAdmin)
            {
                // El admin puede ver el consolidado global o filtrar una oficina puntual.
                ubicacionFiltro = ubicacionOrgId.HasValue && ubicacionOrgId.Value > 0
                    ? ubicacionOrgId.Value
                    : null;
            }
            else
            {
                // Ventanilla / Funcionario: siempre filtrado por su oficina del token.
                ubicacionFiltro = ubicacionClaim;
                if (!ubicacionFiltro.HasValue)
                {
                    return StatusCode(403, ApiResponse.ErrorResult(
                        "El usuario no tiene una ubicación orgánica asignada para generar reportes."));
                }
            }

            // ---------------------------------------------------------
            // 2. Normalizar y validar el rango de fechas
            // ---------------------------------------------------------
            int anioBase = gestion ?? DateTime.UtcNow.Year;
            DateTime desde = (fechaDesde ?? new DateTime(anioBase, 1, 1)).Date;
            DateTime hasta = (fechaHasta ?? DateTime.UtcNow.Date).Date;

            if (desde > hasta)
            {
                return BadRequest(ApiResponse.ErrorResult(
                    "La fecha de inicio no puede ser mayor que la fecha de fin."));
            }

            if ((hasta - desde).TotalDays > MaxDiasRango)
            {
                return BadRequest(ApiResponse.ErrorResult(
                    $"El rango de fechas no puede exceder {MaxDiasRango} días. Ajuste las fechas o filtre por gestión."));
            }

            // ---------------------------------------------------------
            // 3. Ejecutar el stored procedure (3 result sets)
            // ---------------------------------------------------------
            var resultado = new ReporteGlobalDto
            {
                Gestion = gestion,
                FechaDesde = desde,
                FechaHasta = hasta,
                Alcance = ubicacionFiltro.HasValue ? "OFICINA" : "GLOBAL",
                UbicacionOrgId = ubicacionFiltro
            };

            var porTipo = new List<ReporteGlobalTipoDto>();
            var serieDiaria = new List<ReporteGlobalDiaDto>();

            try
            {
                await _sp.ExecuteMultiReaderAsync(
                    "dbo.usp_Reportes_Global",
                    async reader =>
                    {
                        // RS1: Totales
                        if (await reader.ReadAsync())
                        {
                            resultado.Gestion = reader.GetNullableInt32("gestion");
                            resultado.FechaDesde = reader.GetSafeDateTime("fecha_desde");
                            resultado.FechaHasta = reader.GetSafeDateTime("fecha_hasta");
                            resultado.Totales.Iniciados = reader.GetSafeInt32("iniciados");
                            resultado.Totales.Movidos = reader.GetSafeInt32("movidos");
                            resultado.Totales.Movimientos = reader.GetSafeInt32("movimientos");
                            resultado.Totales.Concluidos = reader.GetSafeInt32("concluidos");
                            resultado.Totales.PorcentajeConcluidos = reader.GetSafeDecimal("porcentaje_concluidos");
                            resultado.Totales.PromedioDiasConclusion = reader.GetSafeDecimal("promedio_dias_conclusion");
                        }

                        // RS2: Desglose por tipo de proceso
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                porTipo.Add(new ReporteGlobalTipoDto
                                {
                                    TipoProcesoId = reader.GetSafeInt32("tipo_proceso_id"),
                                    TipoProcesoCodigo = reader.GetSafeString("tipo_proceso_codigo"),
                                    TipoProcesoNombre = reader.GetSafeString("tipo_proceso_nombre"),
                                    Iniciados = reader.GetSafeInt32("iniciados"),
                                    Movidos = reader.GetSafeInt32("movidos"),
                                    Concluidos = reader.GetSafeInt32("concluidos")
                                });
                            }
                        }

                        // RS3: Serie diaria
                        if (await reader.NextResultAsync())
                        {
                            while (await reader.ReadAsync())
                            {
                                serieDiaria.Add(new ReporteGlobalDiaDto
                                {
                                    Fecha = reader.GetSafeDateTime("fecha"),
                                    Iniciados = reader.GetSafeInt32("iniciados"),
                                    Movidos = reader.GetSafeInt32("movidos"),
                                    Concluidos = reader.GetSafeInt32("concluidos")
                                });
                            }
                        }
                    },
                    new SqlParameter("@FechaDesde", SqlDbType.Date) { Value = desde },
                    new SqlParameter("@FechaHasta", SqlDbType.Date) { Value = hasta },
                    new SqlParameter("@Gestion", SqlDbType.Int) { Value = (object?)gestion ?? DBNull.Value },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)ubicacionFiltro ?? DBNull.Value }
                );

                resultado.PorTipo = porTipo;
                resultado.SerieDiaria = serieDiaria;

                return Ok(ApiResponse<ReporteGlobalDto>.Ok(
                    resultado,
                    "Reporte global generado exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
            catch (Exception ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult(
                    "Error interno al generar el reporte global: " + ex.Message));
            }
        }
    }
}
