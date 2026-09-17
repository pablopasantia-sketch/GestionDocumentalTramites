using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
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
        public async Task<IActionResult> GetAll([FromQuery] string? search)
        {
            var query = _context.Usuarios
                .Include(u => u.Persona)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                    .ThenInclude(ur => ur.Rol)
                .AsQueryable();

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
                    RolesResumen = string.Join(", ", u.UsuarioRoles.Where(ur => ur.Activo).Select(ur => ur.Rol.Nombre))
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
                RolesResumen = string.Join(", ", u.UsuarioRoles.Where(ur => ur.Activo).Select(ur => ur.Rol.Nombre))
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

            bool loginExists = await _context.Usuarios.AnyAsync(u => u.Login == dto.Login.Trim());
            if (loginExists)
            {
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
    }
}
