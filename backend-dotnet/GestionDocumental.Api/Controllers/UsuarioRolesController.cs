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
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/usuario-roles")]
    public class UsuarioRolesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UsuarioRolesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var asignaciones = await _context.UsuarioRoles
                .Include(ur => ur.Rol)
                .Include(ur => ur.UbicacionOrg)
                .Where(ur => ur.Activo)
                .OrderBy(ur => ur.UsuarioId)
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
                })
                .ToListAsync();

            return Ok(ApiResponse<List<UsuarioRolItemDto>>.Ok(asignaciones));
        }

        [HttpGet("usuario/{usuarioId}")]
        public async Task<IActionResult> GetByUsuario(int usuarioId)
        {
            var asignaciones = await _context.UsuarioRoles
                .Include(ur => ur.Rol)
                .Include(ur => ur.UbicacionOrg)
                .Where(ur => ur.UsuarioId == usuarioId && ur.Activo)
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
                })
                .ToListAsync();

            return Ok(ApiResponse<List<UsuarioRolItemDto>>.Ok(asignaciones));
        }

        [HttpPost]
        public async Task<IActionResult> Assign([FromBody] AssignRoleDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));

            var usuario = await _context.Usuarios.FindAsync(dto.UsuarioId);
            if (usuario == null || !usuario.Activo) return NotFound(ApiResponse.ErrorResult("Usuario no encontrado o inactivo."));

            var rol = await _context.Roles.FindAsync(dto.RolId);
            if (rol == null || !rol.Activo) return NotFound(ApiResponse.ErrorResult("Rol no encontrado o inactivo."));

            var ubicacion = await _context.UbicacionesOrg.FindAsync(dto.UbicacionOrgId);
            if (ubicacion == null || !ubicacion.Activo) return NotFound(ApiResponse.ErrorResult("Ubicación orgánica no encontrada o inactiva."));

            // Verificar si ya existe asignación
            var existing = await _context.UsuarioRoles.FirstOrDefaultAsync(ur =>
                ur.UsuarioId == dto.UsuarioId && ur.RolId == dto.RolId && ur.UbicacionOrgId == dto.UbicacionOrgId);

            if (existing != null)
            {
                if (existing.Activo)
                {
                    return Conflict(ApiResponse.ErrorResult("El usuario ya tiene asignado este rol en la misma oficina."));
                }
                existing.Activo = true;
                existing.NivelAcceso = dto.NivelAcceso ?? "CONTROL_TOTAL";
                existing.FechaExpiracion = dto.FechaExpiracion;
                existing.EsPrincipal = dto.EsPrincipal;
                existing.UpdatedAt = DateTime.UtcNow;
            }
            else
            {
                var nuevaAsignacion = new UsuarioRol
                {
                    UsuarioId = dto.UsuarioId,
                    RolId = dto.RolId,
                    UbicacionOrgId = dto.UbicacionOrgId,
                    NivelAcceso = dto.NivelAcceso ?? "CONTROL_TOTAL",
                    FechaExpiracion = dto.FechaExpiracion,
                    EsPrincipal = dto.EsPrincipal,
                    Activo = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.UsuarioRoles.Add(nuevaAsignacion);
            }

            if (dto.EsPrincipal)
            {
                var otherRoles = await _context.UsuarioRoles
                    .Where(ur => ur.UsuarioId == dto.UsuarioId && (ur.RolId != dto.RolId || ur.UbicacionOrgId != dto.UbicacionOrgId))
                    .ToListAsync();
                foreach (var r in otherRoles) r.EsPrincipal = false;
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.SuccessResult("Rol asignado al usuario exitosamente."));
        }

        [HttpPatch("{id}/principal")]
        public async Task<IActionResult> SetPrincipal(int id)
        {
            var asignacion = await _context.UsuarioRoles.FindAsync(id);
            if (asignacion == null || !asignacion.Activo) return NotFound(ApiResponse.ErrorResult("Asignación no encontrada."));

            var userRoles = await _context.UsuarioRoles.Where(ur => ur.UsuarioId == asignacion.UsuarioId).ToListAsync();
            foreach (var r in userRoles)
            {
                r.EsPrincipal = (r.Id == id);
            }

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.SuccessResult("Rol marcado como principal para el usuario."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var asignacion = await _context.UsuarioRoles.FindAsync(id);
            if (asignacion == null) return NotFound(ApiResponse.ErrorResult("Asignación no encontrada."));

            asignacion.Activo = false;
            asignacion.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Rol desasignado del usuario exitosamente."));
        }
    }
}
