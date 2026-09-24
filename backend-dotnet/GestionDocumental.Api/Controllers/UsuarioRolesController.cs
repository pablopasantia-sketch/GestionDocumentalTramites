using System;
using System.Collections.Generic;
using System.Data;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Roles;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/usuario-roles")]
    public class UsuarioRolesController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public UsuarioRolesController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        private static UsuarioRolItemDto MapUsuarioRol(SqlDataReader reader) => new UsuarioRolItemDto
        {
            Id = reader.GetSafeInt32("id"),
            UsuarioId = reader.GetSafeInt32("usuario_id"),
            RolId = reader.GetSafeInt32("rol_id"),
            RolCodigo = reader.GetSafeString("rol_codigo"),
            RolNombre = reader.GetSafeString("rol_nombre"),
            UbicacionOrgId = reader.GetSafeInt32("ubicacion_org_id"),
            UbicacionCodigo = reader.GetSafeString("ubicacion_codigo"),
            UbicacionNombre = reader.GetSafeString("ubicacion_nombre"),
            UbicacionSigla = reader.GetNullableString("ubicacion_sigla"),
            NivelAcceso = reader.GetSafeString("nivel_acceso", "CONTROL_TOTAL"),
            FechaExpiracion = reader.GetNullableDateTime("fecha_expiracion"),
            EsPrincipal = reader.GetSafeBoolean("es_principal"),
            Activo = reader.GetSafeBoolean("activo", true)
        };

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var asignaciones = await _sp.QueryAsync(
                "dbo.usp_UsuarioRoles_Listar",
                MapUsuarioRol,
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = DBNull.Value }
            );

            return Ok(ApiResponse<List<UsuarioRolItemDto>>.Ok(asignaciones));
        }

        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> GetByUsuario(int usuarioId)
        {
            var asignaciones = await _sp.QueryAsync(
                "dbo.usp_UsuarioRoles_Listar",
                MapUsuarioRol,
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = usuarioId }
            );

            return Ok(ApiResponse<List<UsuarioRolItemDto>>.Ok(asignaciones));
        }

        [HttpPost]
        public async Task<IActionResult> Assign([FromBody] AssignRoleDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));

            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UsuarioRoles_Asignar",
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = dto.UsuarioId },
                    new SqlParameter("@RolId", SqlDbType.Int) { Value = dto.RolId },
                    new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = dto.UbicacionOrgId },
                    new SqlParameter("@NivelAcceso", SqlDbType.VarChar, 20) { Value = dto.NivelAcceso ?? "CONTROL_TOTAL" },
                    new SqlParameter("@FechaExpiracion", SqlDbType.Date) { Value = (object?)dto.FechaExpiracion ?? DBNull.Value },
                    new SqlParameter("@EsPrincipal", SqlDbType.Bit) { Value = dto.EsPrincipal },
                    outParam
                );

                return Ok(ApiResponse.SuccessResult("Rol asignado al usuario exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPatch("{id}/principal")]
        public async Task<IActionResult> SetPrincipal(int id)
        {
            // Primero obtener la asignación para conocer el usuarioId
            var asignacion = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_UsuarioRoles_Listar",
                reader => new { Id = reader.GetSafeInt32("id"), UsuarioId = reader.GetSafeInt32("usuario_id") },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = DBNull.Value }
            );

            // También podemos buscar directamente
            try
            {
                // Buscar usuario_id del registro
                int? usuarioId = await _sp.ExecuteScalarAsync<int?>(
                    "dbo.usp_UsuarioRoles_Listar",
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = DBNull.Value }
                );

                // Ejecutar SetPrincipal
                var asig = await _sp.QueryFirstOrDefaultAsync(
                    "dbo.usp_UsuarioRoles_Listar",
                    MapUsuarioRol,
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = DBNull.Value }
                );

                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UsuarioRoles_SetPrincipal",
                    new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = asig?.UsuarioId ?? 1 },
                    new SqlParameter("@UsuarioRolId", SqlDbType.Int) { Value = id }
                );

                return Ok(ApiResponse.SuccessResult("Rol marcado como principal para el usuario."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_UsuarioRoles_Eliminar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id }
                );

                return Ok(ApiResponse.SuccessResult("Rol desasignado del usuario exitosamente."));
            }
            catch (SqlException ex)
            {
                return BadRequest(ApiResponse.ErrorResult(ex.Message));
            }
        }
    }
}
