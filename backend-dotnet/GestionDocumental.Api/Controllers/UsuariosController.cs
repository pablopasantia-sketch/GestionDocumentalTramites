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
            PersonaId = reader.GetSafeInt32("persona_id"),
            Login = reader.GetSafeString("login"),
            Cargo = reader.GetNullableString("cargo"),
            Activo = reader.GetSafeBoolean("activo"),
            Nombres = reader.GetSafeString("nombres"),
            ApellidoPaterno = reader.GetSafeString("apellido_paterno"),
            ApellidoMaterno = reader.GetNullableString("apellido_materno"),
            Ci = reader.GetSafeString("ci"),
            CiExpedido = reader.GetNullableString("ci_expedido"),
            Email = reader.GetNullableString("email"),
            RolesResumen = string.Empty,
            Roles = new List<UsuarioRolItemDto>()
        };

        private async Task<List<UsuarioRolItemDto>> LoadRolesForUsuario(int usuarioId)
        {
            return await _sp.QueryAsync(
                "dbo.usp_Usuarios_ObtenerRoles",
                reader => new UsuarioRolItemDto
                {
                    Id = reader.GetSafeInt32("rol_id"), // rol assignment
                    UsuarioId = usuarioId,
                    RolId = reader.GetSafeInt32("rol_id"),
                    RolCodigo = reader.GetSafeString("rol_codigo"),
                    RolNombre = reader.GetSafeString("rol_nombre"),
                    UbicacionOrgId = reader.GetSafeInt32("ubicacion_org_id"),
                    UbicacionCodigo = string.Empty,
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
                new SqlParameter("@Search", SqlDbType.VarChar, 100) { Value = (object?)search?.Trim() ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.VarChar, 20) { Value = activoParam },
                new SqlParameter("@Offset", SqlDbType.Int) { Value = 0 },
                new SqlParameter("@Limit", SqlDbType.Int) { Value = 500 }
            );

            // Cargar roles asignados para cada usuario mediante SP
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

            if (u == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

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

            // Verificar si el usuario ya existe mediante SP
            var existingUser = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_Autenticar",
                reader => new { Id = reader.GetSafeInt32("id"), Activo = reader.GetSafeBoolean("activo") },
                new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = dto.Login.Trim().ToLower() }
            );

            if (existingUser != null)
            {
                if (!existingUser.Activo)
                {
                    return Conflict(ApiResponse.ErrorResult($"Existe una cuenta dada de baja con el usuario '{dto.Login}'. Puede reactivarla cambiando el filtro a 'Dados de Baja (Inactivos)'."));
                }
                return Conflict(ApiResponse.ErrorResult($"Ya existe una cuenta con el login '{dto.Login}'."));
            }

            // Validar que la persona existe
            var persona = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Personas_ObtenerPorId",
                reader => new { Id = reader.GetSafeInt32("id"), Activo = reader.GetSafeBoolean("activo") },
                new SqlParameter("@Id", SqlDbType.Int) { Value = dto.PersonaId }
            );

            if (persona == null || !persona.Activo)
            {
                return NotFound(ApiResponse.ErrorResult("La persona seleccionada no existe o está inactiva."));
            }

            string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);
            var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Usuarios_Insertar",
                    new SqlParameter("@PersonaId", SqlDbType.Int) { Value = dto.PersonaId },
                    new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = dto.Login.Trim().ToLower() },
                    new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 255) { Value = passwordHash },
                    new SqlParameter("@Cargo", SqlDbType.NVarChar, 100) { Value = (object?)dto.Cargo?.Trim() ?? DBNull.Value },
                    outParam
                );

                int nuevoId = (int)outParam.Value;
                return Ok(ApiResponse<object>.Ok(new { id = nuevoId, login = dto.Login.Trim().ToLower() }, "Usuario creado exitosamente."));
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
                    PersonaId = reader.GetSafeInt32("persona_id"),
                    Login = reader.GetSafeString("login"),
                    Cargo = reader.GetNullableString("cargo"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            int personaId = dto.PersonaId ?? usuario.PersonaId;
            string cargo = dto.Cargo != null ? dto.Cargo.Trim() : (usuario.Cargo ?? string.Empty);
            bool activo = dto.Activo ?? usuario.Activo;

            try
            {
                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Usuarios_Actualizar",
                    new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                    new SqlParameter("@PersonaId", SqlDbType.Int) { Value = personaId },
                    new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = usuario.Login },
                    new SqlParameter("@Cargo", SqlDbType.NVarChar, 100) { Value = cargo },
                    new SqlParameter("@Activo", SqlDbType.Bit) { Value = activo }
                );

                return Ok(ApiResponse.SuccessResult("Usuario actualizado exitosamente."));
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
                reader => new { Id = reader.GetSafeInt32("id"), Login = reader.GetSafeString("login"), Activo = reader.GetSafeBoolean("activo") },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

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

            return Ok(ApiResponse.SuccessResult($"Contraseña restablecida exitosamente para '{usuario.Login}'."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var usuario = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new { Id = reader.GetSafeInt32("id"), Login = reader.GetSafeString("login") },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_EliminarLogico",
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            return Ok(ApiResponse.SuccessResult($"Usuario '{usuario.Login}' dado de baja."));
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var usuario = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new
                {
                    Id = reader.GetSafeInt32("id"),
                    PersonaId = reader.GetSafeInt32("persona_id"),
                    Login = reader.GetSafeString("login"),
                    Cargo = reader.GetNullableString("cargo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            // Validar que la persona esté activa
            var persona = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Personas_ObtenerPorId",
                reader => new
                {
                    Id = reader.GetSafeInt32("id"),
                    Activo = reader.GetSafeBoolean("activo"),
                    Nombres = reader.GetSafeString("nombres"),
                    ApellidoPaterno = reader.GetSafeString("apellido_paterno")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = usuario.PersonaId }
            );

            if (persona != null && !persona.Activo)
            {
                return BadRequest(ApiResponse.ErrorResult($"No se puede reactivar el usuario: la persona asociada '{persona.Nombres} {persona.ApellidoPaterno}' se encuentra inactiva. Primero reactive la persona."));
            }

            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_Actualizar",
                new SqlParameter("@Id", SqlDbType.Int) { Value = id },
                new SqlParameter("@PersonaId", SqlDbType.Int) { Value = usuario.PersonaId },
                new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = usuario.Login },
                new SqlParameter("@Cargo", SqlDbType.NVarChar, 100) { Value = (object?)usuario.Cargo ?? DBNull.Value },
                new SqlParameter("@Activo", SqlDbType.Bit) { Value = true }
            );

            return Ok(ApiResponse.SuccessResult($"Usuario '{usuario.Login}' reactivado exitosamente."));
        }
    }
}
