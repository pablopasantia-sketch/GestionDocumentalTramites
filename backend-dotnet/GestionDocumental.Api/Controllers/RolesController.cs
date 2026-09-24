using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class RolesController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public RolesController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var roles = await _sp.QueryAsync(
                "dbo.usp_Roles_Listar",
                reader => new
                {
                    id = reader.GetSafeInt32("id"),
                    codigo = reader.GetSafeString("codigo"),
                    nombre = reader.GetSafeString("nombre"),
                    descripcion = reader.GetNullableString("descripcion"),
                    activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = "activos" }
            );

            return Ok(ApiResponse<object>.Ok(roles));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var rol = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Roles_ObtenerPorId",
                reader => new
                {
                    id = reader.GetSafeInt32("id"),
                    codigo = reader.GetSafeString("codigo"),
                    nombre = reader.GetSafeString("nombre"),
                    descripcion = reader.GetNullableString("descripcion"),
                    activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (rol == null) return NotFound(ApiResponse.ErrorResult("Rol no encontrado."));

            return Ok(ApiResponse<object>.Ok(rol));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Rol model)
        {
            if (string.IsNullOrWhiteSpace(model.Codigo) || string.IsNullOrWhiteSpace(model.Nombre))
            {
                return BadRequest(ApiResponse.ErrorResult("Código y nombre son obligatorios."));
            }

            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Roles_Insertar",
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 30) { Value = model.Codigo.Trim().ToUpper() },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 100) { Value = model.Nombre.Trim() },
                    new SqlParameter("@Descripcion", SqlDbType.VarChar, 255) { Value = (object?)model.Descripcion?.Trim() ?? DBNull.Value },
                    outParam
                );

                int nuevoId = (int)outParam.Value;

                return Ok(ApiResponse<object>.Ok(new
                {
                    id = nuevoId,
                    nombre = model.Nombre.Trim(),
                    codigo = model.Codigo.Trim().ToUpper(),
                    descripcion = model.Descripcion?.Trim(),
                    activo = true
                }, "Rol creado exitosamente."));
            }
            catch (SqlException ex)
            {
                return Conflict(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Rol model)
        {
            var existing = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Roles_ObtenerPorId",
                reader => new
                {
                    id = reader.GetSafeInt32("id"),
                    codigo = reader.GetSafeString("codigo"),
                    nombre = reader.GetSafeString("nombre"),
                    descripcion = reader.GetNullableString("descripcion"),
                    activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (existing == null) return NotFound(ApiResponse.ErrorResult("Rol no encontrado."));

            string nombre = !string.IsNullOrWhiteSpace(model.Nombre) ? model.Nombre.Trim() : existing.nombre;
            string? descripcion = model.Descripcion != null ? model.Descripcion.Trim() : existing.descripcion;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Roles_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@Codigo", SqlDbType.VarChar, 30) { Value = existing.codigo },
                    new SqlParameter("@Nombre", SqlDbType.VarChar, 100) { Value = nombre },
                    new SqlParameter("@Descripcion", SqlDbType.VarChar, 255) { Value = (object?)descripcion ?? DBNull.Value },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = existing.activo }
                );

                return Ok(ApiResponse.SuccessResult("Rol actualizado exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Roles_EliminarLogico",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id }
                );
                return Ok(ApiResponse.SuccessResult("Rol dado de baja exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }
    }
}
