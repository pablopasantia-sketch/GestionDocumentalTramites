using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Roles;
using GestionDocumental.Api.DTOs.Usuarios;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UsuariosController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsuariosController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? activo)
        {
            var query = _context.Usuarios
                .Include(u => u.Persona)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.Rol)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.UbicacionOrg)
                .AsQueryable();

            if (activo == "all" || activo == "todos")
            {
                // Incluir todos
            }
            else if (activo == "false" || activo == "inactivos")
            {
                query = query.Where(u => !u.Activo);
            }
            else // Por defecto solo activos
            {
                query = query.Where(u => u.Activo);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(u =>
                    u.Login.ToLower().Contains(term) ||
                    (u.Cargo != null && u.Cargo.ToLower().Contains(term)) ||
                    u.Persona.Nombres.ToLower().Contains(term) ||
                    u.Persona.ApellidoPaterno.ToLower().Contains(term) ||
                    u.Persona.Ci.ToLower().Contains(term));
            }

            var usuarios = await query
                .OrderBy(u => u.Login)
                .Select(u => new UsuarioListItemDto
                {
                    Id = u.Id,
                    PersonaId = u.PersonaId,
                    Login = u.Login,
                    Cargo = u.Cargo,
                    Activo = u.Activo,
                    Nombres = u.Persona.Nombres,
                    ApellidoPaterno = u.Persona.ApellidoPaterno,
                    ApellidoMaterno = u.Persona.ApellidoMaterno,
                    Ci = u.Persona.Ci,
                    CiExpedido = u.Persona.CiExpedido,
                    Email = u.Persona.Email,
                    RolesResumen = string.Join(", ", u.UsuarioRoles.Where(ur => ur.Activo).Select(ur => ur.Rol.Nombre)),
                    Roles = u.UsuarioRoles.Where(ur => ur.Activo)
                        .OrderByDescending(ur => ur.EsPrincipal)
                        .ThenBy(ur => ur.Rol.Nombre)
                        .Select(ur => new UsuarioRolItemDto
                        {
                            Id = ur.Id,
                            UsuarioId = ur.UsuarioId,
                            RolId = ur.RolId,
                            RolCodigo = ur.Rol.Codigo,
                            RolNombre = ur.Rol.Nombre,
                            UbicacionOrgId = ur.UbicacionOrgId,
                            UbicacionCodigo = ur.UbicacionOrg.Codigo,
                            UbicacionNombre = ur.UbicacionOrg.Nombre,
                            UbicacionSigla = ur.UbicacionOrg.Sigla,
                            NivelAcceso = ur.NivelAcceso,
                            FechaExpiracion = ur.FechaExpiracion,
                            EsPrincipal = ur.EsPrincipal,
                            Activo = ur.Activo
                        }).ToList()
                })
                .ToListAsync();

            return Ok(ApiResponse<List<UsuarioListItemDto>>.Ok(usuarios));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await _context.Usuarios
                .Include(u => u.Persona)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.Rol)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.UbicacionOrg)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (u == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            var dto = new UsuarioListItemDto
            {
                Id = u.Id,
                PersonaId = u.PersonaId,
                Login = u.Login,
                Cargo = u.Cargo,
                Activo = u.Activo,
                Nombres = u.Persona.Nombres,
                ApellidoPaterno = u.Persona.ApellidoPaterno,
                ApellidoMaterno = u.Persona.ApellidoMaterno,
                Ci = u.Persona.Ci,
                CiExpedido = u.Persona.CiExpedido,
                Email = u.Persona.Email,
                RolesResumen = string.Join(", ", u.UsuarioRoles.Where(ur => ur.Activo).Select(ur => ur.Rol.Nombre)),
                Roles = u.UsuarioRoles.Where(ur => ur.Activo)
                    .OrderByDescending(ur => ur.EsPrincipal)
                    .ThenBy(ur => ur.Rol.Nombre)
                    .Select(ur => new UsuarioRolItemDto
                    {
                        Id = ur.Id,
                        UsuarioId = ur.UsuarioId,
                        RolId = ur.RolId,
                        RolCodigo = ur.Rol.Codigo,
                        RolNombre = ur.Rol.Nombre,
                        UbicacionOrgId = ur.UbicacionOrgId,
                        UbicacionCodigo = ur.UbicacionOrg.Codigo,
                        UbicacionNombre = ur.UbicacionOrg.Nombre,
                        UbicacionSigla = ur.UbicacionOrg.Sigla,
                        NivelAcceso = ur.NivelAcceso,
                        FechaExpiracion = ur.FechaExpiracion,
                        EsPrincipal = ur.EsPrincipal,
                        Activo = ur.Activo
                    }).ToList()
            };

            return Ok(ApiResponse<UsuarioListItemDto>.Ok(dto));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUsuarioDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));
            }

            var existingUser = await _context.Usuarios.FirstOrDefaultAsync(u => u.Login == dto.Login.Trim());
            if (existingUser != null)
            {
                if (!existingUser.Activo)
                {
                    return Conflict(ApiResponse.ErrorResult($"Existe una cuenta dada de baja con el usuario '{dto.Login}'. Puede reactivarla cambiando el filtro a 'Dados de Baja (Inactivos)'."));
                }
                return Conflict(ApiResponse.ErrorResult($"Ya existe una cuenta con el login '{dto.Login}'."));
            }

            bool personaExists = await _context.Personas.AnyAsync(p => p.Id == dto.PersonaId && p.Activo);
            if (!personaExists)
            {
                return NotFound(ApiResponse.ErrorResult("La persona seleccionada no existe o está inactiva."));
            }

            var usuario = new Usuario
            {
                PersonaId = dto.PersonaId,
                Login = dto.Login.Trim().ToLower(),
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Cargo = dto.Cargo?.Trim(),
                Activo = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Usuarios.Add(usuario);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new { id = usuario.Id, login = usuario.Login }, "Usuario creado exitosamente."));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUsuarioDto dto)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            if (dto.PersonaId.HasValue) usuario.PersonaId = dto.PersonaId.Value;
            if (dto.Cargo != null) usuario.Cargo = dto.Cargo.Trim();
            if (dto.Activo.HasValue) usuario.Activo = dto.Activo.Value;

            usuario.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Usuario actualizado exitosamente."));
        }

        [HttpPost("{id}/reset-password")]
        public async Task<IActionResult> ResetPassword(int id, [FromBody] ResetPasswordDto dto)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
            {
                return BadRequest(ApiResponse.ErrorResult("La contraseña debe tener al menos 6 caracteres."));
            }

            usuario.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
            usuario.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult($"Contraseña restablecida exitosamente para '{usuario.Login}'."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var usuario = await _context.Usuarios.FindAsync(id);
            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            usuario.Activo = false;
            usuario.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult($"Usuario '{usuario.Login}' dado de baja."));
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var usuario = await _context.Usuarios.Include(u => u.Persona).FirstOrDefaultAsync(u => u.Id == id);
            if (usuario == null) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado."));

            if (usuario.Persona != null && !usuario.Persona.Activo)
            {
                return BadRequest(ApiResponse.ErrorResult($"No se puede reactivar el usuario: la persona asociada '{usuario.Persona.Nombres} {usuario.Persona.ApellidoPaterno}' se encuentra inactiva. Primero reactive la persona."));
            }

            usuario.Activo = true;
            usuario.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult($"Usuario '{usuario.Login}' reactivado exitosamente."));
        }
    }
}
