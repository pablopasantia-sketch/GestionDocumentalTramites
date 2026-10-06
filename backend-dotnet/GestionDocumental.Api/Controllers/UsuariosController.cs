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
using GestionDocumental.Api.DTOs.Roles;
using GestionDocumental.Api.DTOs.Usuarios;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;

        public UsuariosController(IStoredProcedureService sp)
        {
            _sp = sp;
        }

        private static UsuarioListItemDto MapUsuario(SqlDataReader reader) => new UsuarioListItemDto
        {
            Id = reader.GetSafeInt32("id"),
            PersonaId = reader.GetSafeInt32("id"),
            Login = reader.GetNullableString("login"),
            Cargo = reader.GetNullableString("cargo"),
            Activo = reader.GetSafeBoolean("activo"),
            Nombres = reader.GetSafeString("nombres"),
            ApellidoPaterno = reader.GetSafeString("apellido_paterno"),
            ApellidoMaterno = reader.GetNullableString("apellido_materno"),
            Ci = reader.GetSafeString("ci"),
            CiExpedido = "CH",
            Email = reader.GetNullableString("email"),
            Cel = reader.GetNullableString("telefono"),
            Direccion = reader.GetNullableString("direccion"),
            CodU = reader.GetNullableInt16("cod_u"),
            UnidadNombre = reader.GetNullableString("unidad_nombre"),
            CodCargo = reader.GetNullableInt16("cod_cargo"),
            CargoOficial = reader.GetNullableString("cargo_oficial"),
            RolesResumen = string.Empty,
            Roles = new List<UsuarioRolItemDto>()
        };

        private async Task<List<UsuarioRolItemDto>> LoadRolesForUsuario(int usuarioId)
        {
            return await _sp.QueryAsync(
                "dbo.usp_Usuarios_ObtenerRoles",
                reader => new UsuarioRolItemDto
                {
                    Id = reader.GetSafeInt32("id"),
                    UsuarioId = usuarioId,
                    RolId = reader.GetSafeInt32("rol_id"),
                    RolCodigo = reader.GetSafeString("rol_codigo"),
                    RolNombre = reader.GetSafeString("rol_nombre"),
                    UbicacionOrgId = reader.GetSafeInt32("ubicacion_org_id"),
                    UbicacionCodigo = reader.GetSafeString("ubicacion_codigo"),
                    UbicacionNombre = reader.GetSafeString("ubicacion_nombre"),
                    UbicacionSigla = reader.GetNullableString("ubicacion_sigla"),
                    NivelAcceso = reader.GetSafeString("nivel_acceso", "CONTROL_TOTAL"),
                    FechaExpiracion = null,
                    EsPrincipal = reader.GetSafeBoolean("es_principal"),
                    Activo = reader.GetSafeBoolean("activo", true)
                },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = usuarioId }
            );
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? activo)
        {
            string activoParam = "activos";
            if (activo == "all" || activo == "todos")
            {
                activoParam = "todos";
            }
            else if (activo == "false" || activo == "inactivos")
            {
                activoParam = "inactivos";
            }

            var usuarios = await _sp.QueryAsync(
                "dbo.usp_Usuarios_Listar",
                MapUsuario,
                new SqlParameter("@Search", SqlDbType.NVarChar, 100) { Value = (object?)search?.Trim() ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = activoParam }
            );

            // Cargar roles asignados para cada funcionario mediante SP
            foreach (var u in usuarios)
            {
                var roles = await LoadRolesForUsuario(u.Id);
                u.Roles = roles;
                u.RolesResumen = string.Join(", ", roles.Select(r => r.RolNombre));
            }

            return Ok(ApiResponse<List<UsuarioListItemDto>>.Ok(usuarios));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                MapUsuario,
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (u == null) return NotFound(ApiResponse.ErrorResult("Personal municipal no encontrado."));

            var roles = await LoadRolesForUsuario(u.Id);
            u.Roles = roles;
            u.RolesResumen = string.Join(", ", roles.Select(r => r.RolNombre));

            return Ok(ApiResponse<UsuarioListItemDto>.Ok(u));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUsuarioDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));
            }

            string? login = string.IsNullOrWhiteSpace(dto.Login) ? null : dto.Login.Trim().ToLower();

            if (!string.IsNullOrEmpty(login))
            {
                var existingUser = await _sp.QueryFirstOrDefaultAsync(
                    "dbo.usp_Usuarios_Autenticar",
                    reader => new { Id = reader.GetSafeInt32("id"), Activo = reader.GetSafeBoolean("activo") },
                    new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = login }
                );

                if (existingUser != null)
                {
                    if (!existingUser.Activo)
                    {
                        return Conflict(ApiResponse.ErrorResult($"Existe una cuenta dada de baja con el usuario '{login}'. Puede reactivarla cambiando el filtro a 'Dados de Baja (Inactivos)'."));
                    }
                    return Conflict(ApiResponse.ErrorResult($"Ya existe una cuenta con el login '{login}'."));
                }
            }

            string? passwordHash = !string.IsNullOrWhiteSpace(dto.Password) 
                ? BCrypt.Net.BCrypt.HashPassword(dto.Password) 
                : null;

            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Usuarios_Insertar",
                    new SqlParameter("@PersonaId", SqlDbType.Int) { Value = DBNull.Value },
                    new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = (object?)login ?? DBNull.Value },
                    new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 255) { Value = (object?)passwordHash ?? DBNull.Value },
                    new SqlParameter("@Cargo", SqlDbType.NVarChar, 100) { Value = (object?)dto.Cargo?.Trim() ?? DBNull.Value },
                    new SqlParameter("@CI", SqlDbType.Int) { Value = (object?)dto.Ci ?? DBNull.Value },
                    new SqlParameter("@Nombres", SqlDbType.VarChar, 50) { Value = (object?)dto.Nombres?.Trim().ToUpper() ?? DBNull.Value },
                    new SqlParameter("@Apellidos", SqlDbType.VarChar, 50) { Value = (object?)dto.Apellidos?.Trim().ToUpper() ?? DBNull.Value },
                    new SqlParameter("@Direccion", SqlDbType.VarChar, 50) { Value = (object?)dto.Direccion?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Cel", SqlDbType.Int) { Value = (object?)dto.Cel ?? DBNull.Value },
                    new SqlParameter("@Email", SqlDbType.VarChar, 50) { Value = (object?)dto.Email?.Trim() ?? DBNull.Value },
                    new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = (object?)dto.CodU ?? DBNull.Value },
                    new SqlParameter("@CodCargo", SqlDbType.SmallInt) { Value = (object?)dto.CodCargo ?? DBNull.Value },
                    outParam
                );

                int nuevoId = (int)outParam.Value;

                // Asignar roles si se especificaron
                if (dto.RolesIds != null && dto.RolesIds.Any())
                {
                    int ubiId = dto.CodU.HasValue ? (int)dto.CodU.Value : 1;
                    foreach (var rolId in dto.RolesIds)
                    {
                        try
                        {
                            await _sp.ExecuteNonQueryAsync(
                                "dbo.usp_UsuarioRoles_Asignar",
                                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = nuevoId },
                                new SqlParameter("@RolId", SqlDbType.Int) { Value = rolId },
                                new SqlParameter("@UbicacionOrgId", SqlDbType.Int) { Value = ubiId },
                                new SqlParameter("@NivelAcceso", SqlDbType.VarChar, 50) { Value = "CONTROL_TOTAL" },
                                new SqlParameter("@FechaExpiracion", SqlDbType.Date) { Value = DBNull.Value },
                                new SqlParameter("@EsPrincipal", SqlDbType.Bit) { Value = true }
                            );
                        }
                        catch { /* ignorar duplicados de rol */ }
                    }
                }

                return Ok(ApiResponse<object>.Ok(new { id = nuevoId, login = login }, "Personal municipal registrado exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUsuarioDto dto)
        {
            var usuario = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new
                {
                    Id = reader.GetSafeInt32("id"),
                    Login = reader.GetNullableString("login"),
                    Cargo = reader.GetNullableString("cargo"),
                    Activo = reader.GetSafeBoolean("activo"),
                    Nombres = reader.GetSafeString("nombres"),
                    Apellidos = reader.GetSafeString("apellido_paterno")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Personal municipal no encontrado."));

            string? login = dto.Login != null 
                ? (string.IsNullOrWhiteSpace(dto.Login) ? null : dto.Login.Trim().ToLower()) 
                : usuario.Login;
            string cargo = dto.Cargo != null ? dto.Cargo.Trim() : (usuario.Cargo ?? string.Empty);
            bool activo = dto.Activo ?? usuario.Activo;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Usuarios_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@PersonaId", SqlDbType.Int) { Value = DBNull.Value },
                    new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = (object?)login ?? DBNull.Value },
                    new SqlParameter("@Cargo", SqlDbType.NVarChar, 100) { Value = (object?)cargo ?? DBNull.Value },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = activo },
                    new SqlParameter("@Nombres", SqlDbType.VarChar, 50) { Value = (object?)dto.Nombres?.Trim().ToUpper() ?? DBNull.Value },
                    new SqlParameter("@Apellidos", SqlDbType.VarChar, 50) { Value = (object?)dto.Apellidos?.Trim().ToUpper() ?? DBNull.Value },
                    new SqlParameter("@Direccion", SqlDbType.VarChar, 50) { Value = (object?)dto.Direccion?.Trim() ?? DBNull.Value },
                    new SqlParameter("@Cel", SqlDbType.Int) { Value = (object?)dto.Cel ?? DBNull.Value },
                    new SqlParameter("@Email", SqlDbType.VarChar, 50) { Value = (object?)dto.Email?.Trim() ?? DBNull.Value },
                    new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = (object?)dto.CodU ?? DBNull.Value },
                    new SqlParameter("@CodCargo", SqlDbType.SmallInt) { Value = (object?)dto.CodCargo ?? DBNull.Value }
                );

                if (!string.IsNullOrWhiteSpace(dto.Password))
                {
                    string newPasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password.Trim());
                    await _sp.ExecuteNonQueryAsync(
                        "dbo.usp_Usuarios_CambiarPassword",
                        new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                        new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 255) { Value = newPasswordHash }
                    );
                }

                return Ok(ApiResponse.SuccessResult("Datos de personal actualizados exitosamente."));
            }
            catch (SqlException ex)
            {
                return StatusCode(500, ApiResponse.ErrorResult(ex.Message));
            }
        }

        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
        {
            var usuario = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new { Id = reader.GetSafeInt32("id"), Login = reader.GetNullableString("login"), Activo = reader.GetSafeBoolean("activo") },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Personal municipal no encontrado."));

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            {
                return BadRequest(ApiResponse.ErrorResult("La contraseña debe tener al menos 6 caracteres."));
            }

            string newHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_CambiarPassword",
                new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 255) { Value = newHash }
            );

            return Ok(ApiResponse.SuccessResult($"Contraseña restablecida exitosamente para '{usuario.Login ?? "funcionario"}'."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var usuario = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new { Id = reader.GetSafeInt32("id"), Login = reader.GetNullableString("login") },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Personal municipal no encontrado."));

            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_EliminarLogico",
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            return Ok(ApiResponse.SuccessResult($"Personal municipal dado de baja."));
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var usuario = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new
                {
                    Id = reader.GetSafeInt32("id"),
                    Login = reader.GetNullableString("login"),
                    Cargo = reader.GetNullableString("cargo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Personal municipal no encontrado."));

            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_Actualizar",
                new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                new SqlParameter("@PersonaId", SqlDbType.Int) { Value = DBNull.Value },
                new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = (object?)usuario.Login ?? DBNull.Value },
                new SqlParameter("@Cargo", SqlDbType.NVarChar, 100) { Value = (object?)usuario.Cargo ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.Bit) { Value = true },
                new SqlParameter("@Nombres", SqlDbType.VarChar, 50) { Value = DBNull.Value },
                new SqlParameter("@Apellidos", SqlDbType.VarChar, 50) { Value = DBNull.Value },
                new SqlParameter("@Direccion", SqlDbType.VarChar, 50) { Value = DBNull.Value },
                new SqlParameter("@Cel", SqlDbType.Int) { Value = DBNull.Value },
                new SqlParameter("@Email", SqlDbType.VarChar, 50) { Value = DBNull.Value },
                new SqlParameter("@CodU", SqlDbType.SmallInt) { Value = DBNull.Value },
                new SqlParameter("@CodCargo", SqlDbType.SmallInt) { Value = DBNull.Value }
            );

            return Ok(ApiResponse.SuccessResult($"Personal municipal '{usuario.Login ?? "funcionario"}' reactivado exitosamente."));
        }
    }
}
