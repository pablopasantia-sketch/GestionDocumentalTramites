using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        private readonly AppDbContext _context;

        public RolesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var roles = await _context.Roles
                .Where(r => r.Activo)
                .OrderBy(r => r.Id)
                .Select(r => new
                {
                    id = r.Id,
                    codigo = r.Codigo,
                    nombre = r.Nombre,
                    descripcion = r.Descripcion,
                    activo = r.Activo
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(roles));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var r = await _context.Roles.FindAsync(id);
            if (r == null) return NotFound(ApiResponse.ErrorResult("Rol no encontrado."));

            var data = new
            {
                id = r.Id,
                codigo = r.Codigo,
                nombre = r.Nombre,
                descripcion = r.Descripcion,
                activo = r.Activo
            };

            return Ok(ApiResponse<object>.Ok(data));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] Rol model)
        {
            if (string.IsNullOrWhiteSpace(model.Codigo) || string.IsNullOrWhiteSpace(model.Nombre))
            {
                return BadRequest(ApiResponse.ErrorResult("Código y nombre son obligatorios."));
            }

            bool exists = await _context.Roles.AnyAsync(r => r.Codigo == model.Codigo.Trim());
            if (exists) return Conflict(ApiResponse.ErrorResult($"Ya existe un rol con el código {model.Codigo}."));

            var rol = new Rol
            {
                Codigo = model.Codigo.Trim().ToUpper(),
                Nombre = model.Nombre.Trim(),
                Descripcion = model.Descripcion?.Trim(),
                Activo = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Roles.Add(rol);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                id = rol.Id,
                nombre = rol.Nombre,
                codigo = rol.Codigo,
                descripcion = rol.Descripcion,
                activo = rol.Activo
            }, "Rol creado exitosamente."));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] Rol model)
        {
            var rol = await _context.Roles.FindAsync(id);
            if (rol == null) return NotFound(ApiResponse.ErrorResult("Rol no encontrado."));

            if (!string.IsNullOrWhiteSpace(model.Nombre)) rol.Nombre = model.Nombre.Trim();
            if (model.Descripcion != null) rol.Descripcion = model.Descripcion.Trim();
            rol.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.SuccessResult("Rol actualizado exitosamente."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var rol = await _context.Roles.Include(r => r.UsuarioRoles).FirstOrDefaultAsync(r => r.Id == id);
            if (rol == null) return NotFound(ApiResponse.ErrorResult("Rol no encontrado."));

            if (rol.UsuarioRoles.Any(ur => ur.Activo))
            {
                return BadRequest(ApiResponse.ErrorResult("No se puede eliminar el rol: tiene asignaciones activas a usuarios."));
            }

            rol.Activo = false;
            rol.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Rol dado de baja exitosamente."));
        }
    }
}
