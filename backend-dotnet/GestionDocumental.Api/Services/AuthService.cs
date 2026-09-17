using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Auth;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _config;

        public AuthService(AppDbContext context, IConfiguration config)
        {
            _context = context;
            _config = config;
        }

        public async Task<ApiResponse<AuthResponse>> LoginAsync(LoginRequest request)
        {
            var user = await _context.Usuarios
                .Include(u => u.Persona)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.Rol)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.UbicacionOrg)
                .FirstOrDefaultAsync(u => u.Login == request.Login && u.Activo);

            if (user == null)
            {
                return ApiResponse<AuthResponse>.Fail("Credenciales inválidas o usuario inactivo.");
            }

            // Validar hash BCrypt
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

            var rolesAsignados = user.UsuarioRoles
                .Where(ur => ur.Activo && ur.Rol.Activo && ur.UbicacionOrg.Activo)
                .Select(ur => new RoleAssignmentDto
                {
                    RolId = ur.RolId,
                    RolCodigo = ur.Rol.Codigo,
                    RolNombre = ur.Rol.Nombre,
                    UbicacionOrgId = ur.UbicacionOrgId,
                    UbicacionNombre = ur.UbicacionOrg.Nombre,
                    UbicacionSigla = ur.UbicacionOrg.Sigla,
                    EsPrincipal = ur.EsPrincipal,
                    NivelAcceso = ur.NivelAcceso
                })
                .ToList();

            if (!rolesAsignados.Any())
            {
                return ApiResponse<AuthResponse>.Fail("El usuario no tiene roles activos asignados en el sistema.");
            }

            // Determinar rol activo
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
                Nombres = user.Persona.Nombres,
                Apellidos = $"{user.Persona.ApellidoPaterno} {user.Persona.ApellidoMaterno}".Trim(),
                Ci = user.Persona.Ci,
                Login = user.Login,
                Username = user.Login,
                Email = user.Persona.Email,
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
            var user = await _context.Usuarios
                .Include(u => u.Persona)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.Rol)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.UbicacionOrg)
                .FirstOrDefaultAsync(u => u.Id == userId && u.Activo);

            if (user == null)
            {
                return ApiResponse<UserDto>.Fail("Usuario no encontrado.");
            }

            var rolesAsignados = user.UsuarioRoles
                .Where(ur => ur.Activo && ur.Rol.Activo && ur.UbicacionOrg.Activo)
                .Select(ur => new RoleAssignmentDto
                {
                    RolId = ur.RolId,
                    RolCodigo = ur.Rol.Codigo,
                    RolNombre = ur.Rol.Nombre,
                    UbicacionOrgId = ur.UbicacionOrgId,
                    UbicacionNombre = ur.UbicacionOrg.Nombre,
                    UbicacionSigla = ur.UbicacionOrg.Sigla,
                    EsPrincipal = ur.EsPrincipal,
                    NivelAcceso = ur.NivelAcceso
                })
                .ToList();

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
                Nombres = user.Persona.Nombres,
                Apellidos = $"{user.Persona.ApellidoPaterno} {user.Persona.ApellidoMaterno}".Trim(),
                Ci = user.Persona.Ci,
                Login = user.Login,
                Username = user.Login,
                Email = user.Persona.Email,
                Cargo = user.Cargo,
                Roles = rolesAsignados,
                ActiveRole = activeRole
            };

            return ApiResponse<UserDto>.Ok(userDto);
        }

        public async Task<ApiResponse> ChangePasswordAsync(int userId, ChangePasswordRequest request)
        {
            var user = await _context.Usuarios.FindAsync(userId);
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

            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            user.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return ApiResponse.SuccessResult("Contraseña actualizada exitosamente.");
        }

        public async Task<ApiResponse<SwitchRoleResponse>> SwitchRoleAsync(int userId, SwitchRoleRequest request)
        {
            var assignment = await _context.UsuarioRoles
                .Include(ur => ur.Rol)
                .Include(ur => ur.UbicacionOrg)
                .Include(ur => ur.Usuario)
                    .ThenInclude(u => u.Persona)
                .FirstOrDefaultAsync(ur => ur.UsuarioId == userId &&
                                           ur.RolId == request.RolId &&
                                           ur.UbicacionOrgId == request.UbicacionOrgId &&
                                           ur.Activo);

            if (assignment == null)
            {
                return ApiResponse<SwitchRoleResponse>.Fail("El rol u oficina seleccionada no está asignada o se encuentra inactiva.");
            }

            var activeRole = new ActiveRoleDto
            {
                RolId = assignment.RolId,
                RolCodigo = assignment.Rol.Codigo,
                RolNombre = assignment.Rol.Nombre,
                UbicacionOrgId = assignment.UbicacionOrgId,
                UbicacionNombre = assignment.UbicacionOrg.Nombre,
                UbicacionSigla = assignment.UbicacionOrg.Sigla,
                NivelAcceso = assignment.NivelAcceso
            };

            var userDto = new UserDto
            {
                Id = assignment.UsuarioId,
                PersonaId = assignment.Usuario.PersonaId,
                Nombres = assignment.Usuario.Persona.Nombres,
                Apellidos = $"{assignment.Usuario.Persona.ApellidoPaterno} {assignment.Usuario.Persona.ApellidoMaterno}".Trim(),
                Ci = assignment.Usuario.Persona.Ci,
                Login = assignment.Usuario.Login,
                Username = assignment.Usuario.Login,
                Email = assignment.Usuario.Persona.Email,
                Cargo = assignment.Usuario.Cargo,
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
