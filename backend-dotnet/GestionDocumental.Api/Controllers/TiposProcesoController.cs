using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.TiposProceso;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/tipos-proceso")]
    public class TiposProcesoController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public TiposProcesoController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        private static TipoProcesoDto MapTipoProceso(SqlDataReader reader) => new TipoProcesoDto
        {
            Id = reader.GetSafeInt32("id"),
            Codigo = reader.GetSafeString("codigo"),
            Nombre = reader.GetSafeString("nombre"),
            Descripcion = reader.GetNullableString("descripcion"),
            TipoCategoria = reader.GetSafeString("tipo_categoria"),
            UbicacionOrgId = reader.GetNullableInt32("ubicacion_org_id"),
            UbicacionCodigo = reader.GetNullableString("ubicacion_codigo"),
            UbicacionNombre = reader.GetNullableString("ubicacion_nombre"),
            UbicacionSigla = reader.GetNullableString("ubicacion_sigla"),
            CorrelativoSeq = reader.GetSafeInt32("correlativo_seq"),
            TiempoEstimadoHoras = reader.GetSafeInt32("tiempo_estimado_horas", 24),
            Activo = reader.GetSafeBoolean("activo")
        };

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? tipo_categoria, [FromQuery] string? search, [FromQuery] string? activo = "all")
        {
            string activoParam = "todos";
            if (activo == "activos" || activo == "true") activoParam = "activos";
            else if (activo == "inactivos" || activo == "false") activoParam = "inactivos";

            var list = await _sp.QueryAsync(
                "dbo.usp_TiposProceso_Listar",
                MapTipoProceso,
                new SqlParameter("@TipoCategoria", SqlDbType.VarChar, 30) { Value = (object?)tipo_categoria?.Trim().ToUpper() ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = activoParam }
            );

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                list = list.Where(tp =>
                    tp.Codigo.ToLower().Contains(term) ||
                    tp.Nombre.ToLower().Contains(term) ||
                    (tp.Descripcion != null && tp.Descripcion.ToLower().Contains(term))
                ).ToList();
            }

            return Ok(ApiResponse<List<TipoProcesoDto>>.Ok(list));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var tp = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_TiposProceso_ObtenerPorId",
                MapTipoProceso,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (tp == null) return NotFound(ApiResponse.ErrorResult("Tipo de proceso no encontrado."));

            return Ok(ApiResponse<TipoProcesoDto>.Ok(tp));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTipoProcesoDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));

            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TiposProceso_Insertar",
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 20) { Value = dto.Codigo.Trim().ToUpper() },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 150) { Value = dto.Nombre.Trim() },
                    new SqlParameter("@Descripcion", SqlDbType.VarChar, 500) { Value = (object?)dto.Descripcion?.Trim() ?? DBNull.Value },
                    new SqlParameter("@TipoCategoria", SqlDbType.VarChar, 30) { Value = dto.TipoCategoria ?? "CORRESPONDENCIA" },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)dto.UbicacionOrgId ?? DBNull.Value },
                    new SqlParameter("@TiempoEstimadoHoras", SqlDbType.Int) { Value = dto.TiempoEstimadoHoras > 0 ? dto.TiempoEstimadoHoras : 24 },
                    outParam
                );

                int nuevoId = (int)outParam.Value;

                return Ok(ApiResponse<object>.Ok(new
                {
                    id = nuevoId,
                    codigo = dto.Codigo.Trim().ToUpper(),
                    nombre = dto.Nombre.Trim(),
                    descripcion = dto.Descripcion?.Trim(),
                    tipoCategoria = dto.TipoCategoria ?? "CORRESPONDENCIA",
                    tiempoEstimadoHoras = dto.TiempoEstimadoHoras > 0 ? dto.TiempoEstimadoHoras : 24,
                    activo = true
                }, "Tipo de trámite externo creado exitosamente."));
            }
            catch (SqlException ex)
            {
                return Conflict(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTipoProcesoDto dto)
        {
            var existing = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_TiposProceso_ObtenerPorId",
                MapTipoProceso,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (existing == null) return NotFound(ApiResponse.ErrorResult("Tipo de trámite no encontrado."));

            string codigo = !string.IsNullOrWhiteSpace(dto.Codigo) ? dto.Codigo.Trim().ToUpper() : existing.Codigo;
            string nombre = !string.IsNullOrWhiteSpace(dto.Nombre) ? dto.Nombre.Trim() : existing.Nombre;
            string? descripcion = dto.Descripcion != null ? dto.Descripcion.Trim() : existing.Descripcion;
            string tipoCategoria = !string.IsNullOrWhiteSpace(dto.TipoCategoria) ? dto.TipoCategoria : existing.TipoCategoria;
            int? ubicacionOrgId = dto.UbicacionOrgId.HasValue ? dto.UbicacionOrgId.Value : existing.UbicacionOrgId;
            int tiempoHoras = dto.TiempoEstimadoHoras.HasValue ? dto.TiempoEstimadoHoras.Value : existing.TiempoEstimadoHoras;
            bool activo = dto.Activo ?? existing.Activo;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TiposProceso_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 20) { Value = codigo },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 150) { Value = nombre },
                    new SqlParameter("@Descripcion", SqlDbType.VarChar, 500) { Value = (object?)descripcion ?? DBNull.Value },
                    new SqlParameter("@TipoCategoria", SqlDbType.VarChar, 30) { Value = tipoCategoria },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)ubicacionOrgId ?? DBNull.Value },
                    new SqlParameter("@TiempoEstimadoHoras", SqlDbType.Int) { Value = tiempoHoras },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = activo }
                );

                return Ok(ApiResponse.SuccessResult("Tipo de trámite actualizado exitosamente."));
            }
            catch (SqlException ex)
            {
                return Conflict(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var existing = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_TiposProceso_ObtenerPorId",
                MapTipoProceso,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (existing == null) return NotFound(ApiResponse.ErrorResult("Tipo de trámite no encontrado."));

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TiposProceso_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 20) { Value = existing.Codigo },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 150) { Value = existing.Nombre },
                    new SqlParameter("@Descripcion", SqlDbType.VarChar, 500) { Value = (object?)existing.Descripcion ?? DBNull.Value },
                    new SqlParameter("@TipoCategoria", SqlDbType.VarChar, 30) { Value = existing.TipoCategoria },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = (object?)existing.UbicacionOrgId ?? DBNull.Value },
                    new SqlParameter("@TiempoEstimadoHoras", SqlDbType.Int) { Value = existing.TiempoEstimadoHoras },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = false }
                );

                return Ok(ApiResponse.SuccessResult("Tipo de trámite dado de baja exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPatch("{id}/toggle-activo")]
        public async Task<IActionResult> ToggleActivo(int id)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_TiposProceso_ToggleActivo",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id }
                );

                return Ok(ApiResponse.SuccessResult("Estado del tipo de trámite alternado exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }
    }
}
