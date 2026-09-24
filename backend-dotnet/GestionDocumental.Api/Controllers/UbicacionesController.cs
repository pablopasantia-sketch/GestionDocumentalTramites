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
using GestionDocumental.Api.DTOs.Ubicaciones;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UbicacionesController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public UbicacionesController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        private static UbicacionDto MapUbicacion(SqlDataReader reader) => new UbicacionDto
        {
            Id = reader.GetSafeInt32("id"),
            Codigo = reader.GetSafeString("codigo"),
            Nombre = reader.GetSafeString("nombre"),
            Sigla = reader.GetNullableString("sigla"),
            Nivel = reader.GetSafeInt32("nivel", 1),
            PadreId = reader.GetNullableInt32("padre_id"),
            PadreNombre = reader.GetNullableString("padre_nombre"),
            Descripcion = reader.GetNullableString("descripcion"),
            Activo = reader.GetSafeBoolean("activo"),
            TotalUsuarios = 0
        };

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? activo)
        {
            string activoParam = "activos";
            if (activo == "all" || activo == "todos") activoParam = "todos";
            else if (activo == "false" || activo == "0" || activo == "inactivos") activoParam = "inactivos";

            var list = await _sp.QueryAsync(
                "dbo.usp_UbicacionesOrg_Listar",
                MapUbicacion,
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = activoParam }
            );

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                list = list.Where(u =>
                    u.Codigo.ToLower().Contains(term) ||
                    u.Nombre.ToLower().Contains(term) ||
                    (u.Sigla != null && u.Sigla.ToLower().Contains(term))
                ).ToList();
            }

            return Ok(ApiResponse<List<UbicacionDto>>.Ok(list));
        }

        [HttpGet("arbol")]
        public async Task<IActionResult> GetArbol()
        {
            var all = await _sp.QueryAsync(
                "dbo.usp_UbicacionesOrg_Listar",
                MapUbicacion,
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = "activos" }
            );

            var nodes = all.Select(u => new UbicacionArbolNodeDto
            {
                Id = u.Id,
                Codigo = u.Codigo,
                Nombre = u.Nombre,
                Sigla = u.Sigla,
                PadreId = u.PadreId,
                Nivel = u.Nivel,
                Descripcion = u.Descripcion,
                Hijos = new List<UbicacionArbolNodeDto>()
            }).ToDictionary(n => n.Id);

            var rootNodes = new List<UbicacionArbolNodeDto>();

            foreach (var node in nodes.Values)
            {
                if (node.PadreId.HasValue && nodes.ContainsKey(node.PadreId.Value))
                {
                    nodes[node.PadreId.Value].Hijos.Add(node);
                }
                else
                {
                    rootNodes.Add(node);
                }
            }

            return Ok(ApiResponse<List<UbicacionArbolNodeDto>>.Ok(rootNodes));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_UbicacionesOrg_ObtenerPorId",
                MapUbicacion,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (u == null) return NotFound(ApiResponse.ErrorResult("Ubicación no encontrada."));

            return Ok(ApiResponse<UbicacionDto>.Ok(u));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUbicacionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));

            int nivel = 1;
            if (dto.PadreId.HasValue)
            {
                var padre = await _sp.QueryFirstOrDefaultAsync(
                    "dbo.usp_UbicacionesOrg_ObtenerPorId",
                    MapUbicacion,
                    new SqlParameter("@Id", SqlDbType.Int) { Value = dto.PadreId.Value }
                );

                if (padre == null || !padre.Activo) return BadRequest(ApiResponse.ErrorResult("La unidad superior no existe o está inactiva."));
                nivel = padre.Nivel + 1;
            }

            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UbicacionesOrg_Insertar",
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 50) { Value = dto.Codigo.Trim().ToUpper() },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 150) { Value = dto.Nombre.Trim() },
                    new SqlParameter("@Sigla", SqlDbType.VarChar, 30) { Value = (object?)dto.Sigla?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Nivel", SqlDbType.Int) { Value = nivel },
                    new SqlParameter("@PadreId", SqlDbType.Int) { Value = (object?)dto.PadreId ?? DBNull.Value },
                    new SqlParameter("@Descripcion", SqlDbType.NVarChar, -1) { Value = (object?)dto.Descripcion?.Trim() ?? DBNull.Value },
                    outParam
                );

                int nuevoId = (int)outParam.Value;

                var resultDto = new UbicacionDto
                {
                    Id = nuevoId,
                    Codigo = dto.Codigo.Trim().ToUpper(),
                    Nombre = dto.Nombre.Trim(),
                    Sigla = dto.Sigla?.Trim(),
                    PadreId = dto.PadreId,
                    Nivel = nivel,
                    Descripcion = dto.Descripcion?.Trim(),
                    Activo = true,
                    TotalUsuarios = 0
                };

                return Ok(ApiResponse<UbicacionDto>.Ok(resultDto, "Unidad orgánica creada exitosamente."));
            }
            catch (SqlException ex)
            {
                return Conflict(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUbicacionDto dto)
        {
            var u = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_UbicacionesOrg_ObtenerPorId",
                MapUbicacion,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (u == null) return NotFound(ApiResponse.ErrorResult("Unidad no encontrada."));

            string codigo = !string.IsNullOrWhiteSpace(dto.Codigo) ? dto.Codigo.Trim().ToUpper() : u.Codigo;
            string nombre = !string.IsNullOrWhiteSpace(dto.Nombre) ? dto.Nombre.Trim() : u.Nombre;
            string? sigla = dto.Sigla != null ? dto.Sigla.Trim() : u.Sigla;
            string? descripcion = dto.Descripcion != null ? dto.Descripcion.Trim() : u.Descripcion;
            bool activo = dto.Activo ?? u.Activo;

            int nivel = u.Nivel;
            int? padreId = u.PadreId;

            if (dto.PadreId.HasValue && dto.PadreId.Value != u.PadreId)
            {
                if (dto.PadreId.Value == id) return BadRequest(ApiResponse.ErrorResult("Una unidad no puede ser superior de sí misma."));
                var padre = await _sp.QueryFirstOrDefaultAsync(
                    "dbo.usp_UbicacionesOrg_ObtenerPorId",
                    MapUbicacion,
                    new SqlParameter("@Id", SqlDbType.Int) { Value = dto.PadreId.Value }
                );
                if (padre == null) return BadRequest(ApiResponse.ErrorResult("La unidad superior no existe."));
                padreId = dto.PadreId.Value;
                nivel = padre.Nivel + 1;
            }
            else if (dto.PadreId == null && u.PadreId != null)
            {
                padreId = null;
                nivel = 1;
            }

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UbicacionesOrg_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 50) { Value = codigo },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 150) { Value = nombre },
                    new SqlParameter("@Sigla", SqlDbType.VarChar, 30) { Value = (object?)sigla ?? DBNull.Value },
                    new SqlParameter("@Nivel", SqlDbType.Int) { Value = nivel },
                    new SqlParameter("@PadreId", SqlDbType.Int) { Value = (object?)padreId ?? DBNull.Value },
                    new SqlParameter("@Descripcion", SqlDbType.NVarChar, -1) { Value = (object?)descripcion ?? DBNull.Value },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = activo }
                );

                return Ok(ApiResponse.SuccessResult("Unidad orgánica actualizada exitosamente."));
            }
            catch (SqlException ex)
            {
                return Conflict(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UbicacionesOrg_EliminarLogico",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id }
                );
                return Ok(ApiResponse.SuccessResult("Unidad orgánica dada de baja exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var u = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_UbicacionesOrg_ObtenerPorId",
                MapUbicacion,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (u == null) return NotFound(ApiResponse.ErrorResult("Unidad no encontrada."));

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UbicacionesOrg_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 50) { Value = u.Codigo },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 150) { Value = u.Nombre },
                    new SqlParameter("@Sigla", SqlDbType.VarChar, 30) { Value = (object?)u.Sigla ?? DBNull.Value },
                    new SqlParameter("@Nivel", SqlDbType.Int) { Value = u.Nivel },
                    new SqlParameter("@PadreId", SqlDbType.Int) { Value = (object?)u.PadreId ?? DBNull.Value },
                    new SqlParameter("@Descripcion", SqlDbType.NVarChar, -1) { Value = (object?)u.Descripcion ?? DBNull.Value },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = true }
                );

                return Ok(ApiResponse.SuccessResult("Unidad orgánica reactivada exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }
    }
}
