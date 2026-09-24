using System;
using System.Collections.Generic;
using System.Data;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Auth;
using GestionDocumental.Api.DTOs.Common;

namespace GestionDocumental.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly IStoredProcedureService _sp;
        private readonly IConfiguration _config;

        public AuthService(IStoredProcedureService sp, IConfiguration config)
        {
            _sp = sp;
            _config = config;
        }

        private class UsuarioAuthRecord
        {
            public int Id { get; set; }
            public int PersonaId { get; set; }
            public string Login { get; set; } = string.Empty;
            public string PasswordHash { get; set; } = string.Empty;
            public string? Email { get; set; }
            public string? Cargo { get; set; }
            public string Ci { get; set; } = string.Empty;
            public string Nombres { get; set; } = string.Empty;
            public string ApellidoPaterno { get; set; } = string.Empty;
            public string? ApellidoMaterno { get; set; }
            public bool Activo { get; set; }
        }

        public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
        {
            var user = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_Autenticar",
                reader => new UsuarioAuthRecord
                {
                    Id = reader.GetSafeInt32("id"),
                    PersonaId = reader.GetSafeInt32("persona_id"),
                    Login = reader.GetSafeString("login"),
                    PasswordHash = reader.GetSafeString("password_hash"),
                    Email = reader.GetNullableString("email"),
                    Cargo = reader.GetNullableString("cargo"),
                    Ci = reader.GetSafeString("ci"),
                    Nombres = reader.GetSafeString("nombres"),
                    ApellidoPaterno = reader.GetSafeString("apellido_paterno"),
                    ApellidoMaterno = reader.GetNullableString("apellido_materno"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Login", SqlDbType.NVarChar, 50) { Value = request.Login.Trim() }
            );

            if (user == null || !user.Activo)
            {
                return ApiResponse<AuthResponse>.Fail("Credenciales inválidas o usuario inactivo.");
            }

            bool passwordValid = false;
            try
            {
                passwordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            }
            catch
            {
                passwordValid = false;
            }

            if (!passwordValid)
            {
                return ApiResponse<AuthResponse>.Fail("Credenciales inválidas.");
            }

            // Obtener roles asignados mediante Stored Procedure
            var rolesAsignados = await _sp.QueryAsync(
                "dbo.usp_Usuarios_ObtenerRoles",
                reader => new RoleAssignmentDto
                {
                    RolId = reader.GetSafeInt32("rol_id"),
                    RolCodigo = reader.GetSafeString("rol_codigo"),
                    RolNombre = reader.GetSafeString("rol_nombre"),
                    UbicacionOrgId = reader.GetSafeInt32("ubicacion_org_id"),
                    UbicacionNombre = reader.GetSafeString("ubicacion_nombre"),
                    UbicacionSigla = reader.GetNullableString("ubicacion_sigla"),
                    EsPrincipal = reader.GetSafeBoolean("es_principal"),
                    NivelAcceso = reader.GetSafeString("nivel_acceso", "CONTROL_TOTAL")
                },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = user.Id }
            );

            if (!rolesAsignados.Any())
            {
                return ApiResponse<AuthResponse>.Fail("El usuario no tiene roles activos asignados en el sistema.");
            }

            // Registrar último acceso de forma asíncrona
            _ = _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_ActualizarUltimoAcceso",
                new SqlParameter("@Id", SqlDbType.Int) { Value = user.Id }
            );

            RoleAssignmentDto? selectedRole = null;
            if (request.RolId.HasValue && request.UbicacionOrgId.HasValue)
            {
                selectedRole = rolesAsignados.FirstOrDefault(r => 
                    r.RolId == request.RolId.Value && r.UbicacionOrgId == request.UbicacionOrgId.Value);
            }

            if (selectedRole == null)
            {
                selectedRole = rolesAsignados.FirstOrDefault(r => r.EsPrincipal) ?? rolesAsignados.First();
            }

            var activeRole = new ActiveRoleDto
            {
                RolId = selectedRole.RolId,
                RolCodigo = selectedRole.RolCodigo,
                RolNombre = selectedRole.RolNombre,
                UbicacionOrgId = selectedRole.UbicacionOrgId,
                UbicacionNombre = selectedRole.UbicacionNombre,
                UbicacionSigla = selectedRole.UbicacionSigla,
                NivelAcceso = selectedRole.NivelAcceso
            };

            var userDto = new UserDto
            {
                Id = user.Id,
                PersonaId = user.PersonaId,
                Nombres = user.Nombres,
                Apellidos = $"{user.ApellidoPaterno} {user.ApellidoMaterno}".Trim(),
                Ci = user.Ci,
                Login = user.Login,
                Username = user.Login,
                Email = user.Email,
                Cargo = user.Cargo,
                Roles = rolesAsignados,
                ActiveRole = activeRole
            };

            string token = GenerateJwtToken(userDto, activeRole);

            return ApiResponse<AuthResponse>.Ok(new AuthResponse
            {
                Token = token,
                User = userDto
            }, "Inicio de sesión exitoso.");
        }

        public async Task<ApiResponse<UserDto>> GetProfileAsync(int userId, int? activeRolId, int? activeUbicacionId)
        {
            var user = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new UsuarioAuthRecord
                {
                    Id = reader.GetSafeInt32("id"),
                    PersonaId = reader.GetSafeInt32("persona_id"),
                    Login = reader.GetSafeString("login"),
                    Cargo = reader.GetNullableString("cargo"),
                    Ci = reader.GetSafeString("ci"),
                    Nombres = reader.GetSafeString("nombres"),
                    ApellidoPaterno = reader.GetSafeString("apellido_paterno"),
                    ApellidoMaterno = reader.GetNullableString("apellido_materno"),
                    Email = reader.GetNullableString("email"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = userId }
            );

            if (user == null || !user.Activo)
            {
                return ApiResponse<UserDto>.Fail("Usuario no encontrado.");
            }

            var rolesAsignados = await _sp.QueryAsync(
                "dbo.usp_Usuarios_ObtenerRoles",
                reader => new RoleAssignmentDto
                {
                    RolId = reader.GetSafeInt32("rol_id"),
                    RolCodigo = reader.GetSafeString("rol_codigo"),
                    RolNombre = reader.GetSafeString("rol_nombre"),
                    UbicacionOrgId = reader.GetSafeInt32("ubicacion_org_id"),
                    UbicacionNombre = reader.GetSafeString("ubicacion_nombre"),
                    UbicacionSigla = reader.GetNullableString("ubicacion_sigla"),
                    EsPrincipal = reader.GetSafeBoolean("es_principal"),
                    NivelAcceso = reader.GetSafeString("nivel_acceso", "CONTROL_TOTAL")
                },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = user.Id }
            );

            RoleAssignmentDto? selectedRole = null;
            if (activeRolId.HasValue && activeUbicacionId.HasValue)
            {
                selectedRole = rolesAsignados.FirstOrDefault(r => 
                    r.RolId == activeRolId.Value && r.UbicacionOrgId == activeUbicacionId.Value);
            }

            if (selectedRole == null && rolesAsignados.Any())
            {
                selectedRole = rolesAsignados.FirstOrDefault(r => r.EsPrincipal) ?? rolesAsignados.First();
            }

            ActiveRoleDto? activeRole = selectedRole != null ? new ActiveRoleDto
            {
                RolId = selectedRole.RolId,
                RolCodigo = selectedRole.RolCodigo,
                RolNombre = selectedRole.RolNombre,
                UbicacionOrgId = selectedRole.UbicacionOrgId,
                UbicacionNombre = selectedRole.UbicacionNombre,
                UbicacionSigla = selectedRole.UbicacionSigla,
                NivelAcceso = selectedRole.NivelAcceso
            } : null;

            var userDto = new UserDto
            {
                Id = user.Id,
                PersonaId = user.PersonaId,
                Nombres = user.Nombres,
                Apellidos = $"{user.ApellidoPaterno} {user.ApellidoMaterno}".Trim(),
                Ci = user.Ci,
                Login = user.Login,
                Username = user.Login,
                Email = user.Email,
                Cargo = user.Cargo,
                Roles = rolesAsignados,
                ActiveRole = activeRole
            };

            return ApiResponse<UserDto>.Ok(userDto);
        }

        public async Task<ApiResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request)
        {
            var user = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new
                {
                    Id = reader.GetSafeInt32("id"),
                    Activo = reader.GetSafeBoolean("activo"),
                    PasswordHash = reader.GetSafeString("password_hash")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = userId }
            );

            if (user == null || !user.Activo)
            {
                return ApiResponse.ErrorResult("Usuario no encontrado.");
            }

            if (!BCrypt.Net.BCrypt.Verify(request.CurrentPassword, user.PasswordHash))
            {
                return ApiResponse.ErrorResult("La contraseña actual no es correcta.");
            }

            if (string.IsNullOrWhiteSpace(request.NewPassword) || request.NewPassword.Length < 6)
            {
                return ApiResponse.ErrorResult("La nueva contraseña debe tener al menos 6 caracteres.");
            }

            if (!Regex.IsMatch(request.NewPassword, @"[0-9]"))
            {
                return ApiResponse.ErrorResult("La contraseña debe contener al menos un número.");
            }

            string newHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Usuarios_CambiarPassword",
                new SqlParameter("@Id", SqlDbType.Int) { Value = userId },
                new SqlParameter("@PasswordHash", SqlDbType.NVarChar, 255) { Value = newHash }
            );

            return ApiResponse.SuccessResult("Contraseña actualizada exitosamente.");
        }

        public async Task<ApiResponse<SwitchRoleResponse>> SwitchRoleAsync(int userId, SwitchRoleRequest request)
        {
            var roles = await _sp.QueryAsync(
                "dbo.usp_Usuarios_ObtenerRoles",
                reader => new RoleAssignmentDto
                {
                    RolId = reader.GetSafeInt32("rol_id"),
                    RolCodigo = reader.GetSafeString("rol_codigo"),
                    RolNombre = reader.GetSafeString("rol_nombre"),
                    UbicacionOrgId = reader.GetSafeInt32("ubicacion_org_id"),
                    UbicacionNombre = reader.GetSafeString("ubicacion_nombre"),
                    UbicacionSigla = reader.GetNullableString("ubicacion_sigla"),
                    EsPrincipal = reader.GetSafeBoolean("es_principal"),
                    NivelAcceso = reader.GetSafeString("nivel_acceso", "CONTROL_TOTAL")
                },
                new SqlParameter("@UsuarioId", SqlDbType.Int) { Value = userId }
            );

            var assignment = roles.FirstOrDefault(r => r.RolId == request.RolId && r.UbicacionOrgId == request.UbicacionOrgId);
            if (assignment == null)
            {
                return ApiResponse<SwitchRoleResponse>.Fail("El rol u oficina seleccionada no está asignada o se encuentra inactiva.");
            }

            var user = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Usuarios_ObtenerPorId",
                reader => new UsuarioAuthRecord
                {
                    Id = reader.GetSafeInt32("id"),
                    PersonaId = reader.GetSafeInt32("persona_id"),
                    Login = reader.GetSafeString("login"),
                    Cargo = reader.GetNullableString("cargo"),
                    Ci = reader.GetSafeString("ci"),
                    Nombres = reader.GetSafeString("nombres"),
                    ApellidoPaterno = reader.GetSafeString("apellido_paterno"),
                    ApellidoMaterno = reader.GetNullableString("apellido_materno"),
                    Email = reader.GetNullableString("email"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = userId }
            );

            if (user == null || !user.Activo)
            {
                return ApiResponse<SwitchRoleResponse>.Fail("Usuario no encontrado.");
            }

            var activeRole = new ActiveRoleDto
            {
                RolId = assignment.RolId,
                RolCodigo = assignment.RolCodigo,
                RolNombre = assignment.RolNombre,
                UbicacionOrgId = assignment.UbicacionOrgId,
                UbicacionNombre = assignment.UbicacionNombre,
                UbicacionSigla = assignment.UbicacionSigla,
                NivelAcceso = assignment.NivelAcceso
            };

            var userDto = new UserDto
            {
                Id = user.Id,
                PersonaId = user.PersonaId,
                Nombres = user.Nombres,
                Apellidos = $"{user.ApellidoPaterno} {user.ApellidoMaterno}".Trim(),
                Ci = user.Ci,
                Login = user.Login,
                Username = user.Login,
                Email = user.Email,
                Cargo = user.Cargo,
                ActiveRole = activeRole
            };

            string newToken = GenerateJwtToken(userDto, activeRole);

            return ApiResponse<SwitchRoleResponse>.Ok(new SwitchRoleResponse
            {
                Token = newToken,
                ActiveRole = activeRole
            }, "Rol activo cambiado exitosamente.");
        }

        private string GenerateJwtToken(UserDto user, ActiveRoleDto activeRole)
        {
            var jwtKey = _config["Jwt:Key"] ?? "gestion_documental_tramites_jwt_secret_key_2026_sucre_institutional_32bytes!";
            var jwtIssuer = _config["Jwt:Issuer"] ?? "GestionDocumentalApi";
            var jwtAudience = _config["Jwt:Audience"] ?? "GestionDocumentalClient";
            var expiresInHours = int.TryParse(_config["Jwt:ExpiresInHours"], out int h) ? h : 24;

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Login),
                new Claim("userId", user.Id.ToString()),
                new Claim("username", user.Login),
                new Claim("personaId", user.PersonaId.ToString()),
                new Claim("rolId", activeRole.RolId.ToString()),
                new Claim("rolCodigo", activeRole.RolCodigo),
                new Claim(ClaimTypes.Role, activeRole.RolCodigo),
                new Claim("ubicacionOrgId", activeRole.UbicacionOrgId.ToString()),
                new Claim("ubicacionNombre", activeRole.UbicacionNombre),
                new Claim("nivelAcceso", activeRole.NivelAcceso)
            };

            var token = new JwtSecurityToken(
                issuer: jwtIssuer,
                audience: jwtAudience,
                claims: claims,
                expires: DateTime.UtcNow.AddHours(expiresInHours),
                signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
