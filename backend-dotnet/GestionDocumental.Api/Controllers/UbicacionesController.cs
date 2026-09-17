using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Ubicaciones;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/[controller]")]
    public class UbicacionesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public UbicacionesController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? activo)
        {
            var query = _context.UbicacionesOrg
                .Include(u => u.Padre)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                .AsQueryable();

            if (activo == "all" || activo == "todos")
            {
                // no filtrar por activo
            }
            else if (activo == "false" || activo == "0" || activo == "inactivos")
            {
                query = query.Where(u => !u.Activo);
            }
            else
            {
                query = query.Where(u => u.Activo);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(u =>
                    u.Codigo.ToLower().Contains(term) ||
                    u.Nombre.ToLower().Contains(term) ||
                    (u.Sigla != null && u.Sigla.ToLower().Contains(term)));
            }

            var list = await query
                .OrderBy(u => u.Nivel)
                .ThenBy(u => u.Nombre)
                .Select(u => new UbicacionDto
                {
                    Id = u.Id,
                    Codigo = u.Codigo,
                    Nombre = u.Nombre,
                    Sigla = u.Sigla,
                    PadreId = u.PadreId,
                    PadreNombre = u.Padre != null ? u.Padre.Nombre : null,
                    PadreSigla = u.Padre != null ? u.Padre.Sigla : null,
                    Nivel = u.Nivel,
                    Descripcion = u.Descripcion,
                    Activo = u.Activo,
                    TotalUsuarios = u.UsuarioRoles.Count(ur => ur.Activo)
                })
                .ToListAsync();

            return Ok(ApiResponse<List<UbicacionDto>>.Ok(list));
        }

        [HttpGet("arbol")]
        public async Task<IActionResult> GetArbol()
        {
            var all = await _context.UbicacionesOrg
                .Where(u => u.Activo)
                .OrderBy(u => u.Nivel)
                .ThenBy(u => u.Nombre)
                .ToListAsync();

            // Construir árbol en memoria
            var nodes = all.Select(u => new UbicacionArbolNodeDto
            {
                Id = u.Id,
                Codigo = u.Codigo,
                Nombre = u.Nombre,
                Sigla = u.Sigla,
                PadreId = u.PadreId,
                Nivel = u.Nivel,
                Descripcion = u.Descripcion,
                Hijos = new List<UbicacionArbolNodeDto>()
            }).ToDictionary(n => n.Id);

            var rootNodes = new List<UbicacionArbolNodeDto>();

            foreach (var node in nodes.Values)
            {
                if (node.PadreId.HasValue && nodes.ContainsKey(node.PadreId.Value))
                {
                    nodes[node.PadreId.Value].Hijos.Add(node);
                }
                else
                {
                    rootNodes.Add(node);
                }
            }

            return Ok(ApiResponse<List<UbicacionArbolNodeDto>>.Ok(rootNodes));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var u = await _context.UbicacionesOrg
                .Include(u => u.Padre)
                .Include(u => u.UsuarioRoles.Where(ur => ur.Activo))
                .FirstOrDefaultAsync(u => u.Id == id);

            if (u == null) return NotFound(ApiResponse.ErrorResult("Ubicación no encontrada."));

            var dto = new UbicacionDto
            {
                Id = u.Id,
                Codigo = u.Codigo,
                Nombre = u.Nombre,
                Sigla = u.Sigla,
                PadreId = u.PadreId,
                PadreNombre = u.Padre != null ? u.Padre.Nombre : null,
                PadreSigla = u.Padre != null ? u.Padre.Sigla : null,
                Nivel = u.Nivel,
                Descripcion = u.Descripcion,
                Activo = u.Activo,
                TotalUsuarios = u.UsuarioRoles.Count(ur => ur.Activo)
            };

            return Ok(ApiResponse<UbicacionDto>.Ok(dto));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateUbicacionDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));

            var existing = await _context.UbicacionesOrg.FirstOrDefaultAsync(u => u.Codigo == dto.Codigo.Trim().ToUpper());
            if (existing != null)
            {
                if (!existing.Activo)
                {
                    return Conflict(ApiResponse.ErrorResult($"Existe una unidad dada de baja con el código '{dto.Codigo}' ({existing.Nombre}). Puede reactivarla cambiando el filtro a 'Dadas de Baja (Inactivas)'."));
                }
                return Conflict(ApiResponse.ErrorResult($"Ya existe una unidad con el código '{dto.Codigo}'."));
            }

            int nivel = 1;
            if (dto.PadreId.HasValue)
            {
                var padre = await _context.UbicacionesOrg.FindAsync(dto.PadreId.Value);
                if (padre == null || !padre.Activo) return BadRequest(ApiResponse.ErrorResult("La unidad superior no existe o está inactiva."));
                nivel = padre.Nivel + 1;
            }

            var ubicacion = new UbicacionOrg
            {
                Codigo = dto.Codigo.Trim().ToUpper(),
                Nombre = dto.Nombre.Trim(),
                Sigla = dto.Sigla?.Trim(),
                PadreId = dto.PadreId,
                Nivel = nivel,
                Descripcion = dto.Descripcion?.Trim(),
                Activo = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.UbicacionesOrg.Add(ubicacion);
            await _context.SaveChangesAsync();

            var resultDto = new UbicacionDto
            {
                Id = ubicacion.Id,
                Codigo = ubicacion.Codigo,
                Nombre = ubicacion.Nombre,
                Sigla = ubicacion.Sigla,
                PadreId = ubicacion.PadreId,
                Nivel = ubicacion.Nivel,
                Descripcion = ubicacion.Descripcion,
                Activo = ubicacion.Activo,
                TotalUsuarios = 0
            };

            return Ok(ApiResponse<UbicacionDto>.Ok(resultDto, "Unidad orgánica creada exitosamente."));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateUbicacionDto dto)
        {
            var u = await _context.UbicacionesOrg.FindAsync(id);
            if (u == null) return NotFound(ApiResponse.ErrorResult("Unidad no encontrada."));

            if (!string.IsNullOrWhiteSpace(dto.Codigo) && dto.Codigo.Trim().ToUpper() != u.Codigo)
            {
                bool exists = await _context.UbicacionesOrg.AnyAsync(x => x.Codigo == dto.Codigo.Trim().ToUpper() && x.Id != id);
                if (exists) return Conflict(ApiResponse.ErrorResult($"Ya existe otra unidad con el código '{dto.Codigo}'."));
                u.Codigo = dto.Codigo.Trim().ToUpper();
            }

            if (!string.IsNullOrWhiteSpace(dto.Nombre)) u.Nombre = dto.Nombre.Trim();
            if (dto.Sigla != null) u.Sigla = dto.Sigla.Trim();
            if (dto.Descripcion != null) u.Descripcion = dto.Descripcion.Trim();

            if (dto.PadreId.HasValue && dto.PadreId.Value != u.PadreId)
            {
                if (dto.PadreId.Value == id) return BadRequest(ApiResponse.ErrorResult("Una unidad no puede ser superior de sí misma."));
                var padre = await _context.UbicacionesOrg.FindAsync(dto.PadreId.Value);
                if (padre == null) return BadRequest(ApiResponse.ErrorResult("La unidad superior no existe."));
                u.PadreId = dto.PadreId.Value;
                u.Nivel = padre.Nivel + 1;
            }
            else if (dto.PadreId == null && u.PadreId != null)
            {
                u.PadreId = null;
                u.Nivel = 1;
            }

            if (dto.Activo.HasValue) u.Activo = dto.Activo.Value;
            u.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse.SuccessResult("Unidad orgánica actualizada exitosamente."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var u = await _context.UbicacionesOrg
                .Include(x => x.Hijos)
                .Include(x => x.UsuarioRoles)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (u == null) return NotFound(ApiResponse.ErrorResult("Unidad no encontrada."));

            if (u.Hijos.Any(h => h.Activo))
            {
                return BadRequest(ApiResponse.ErrorResult("No se puede dar de baja la unidad: contiene dependencias subordinadas activas."));
            }

            if (u.UsuarioRoles.Any(ur => ur.Activo))
            {
                return BadRequest(ApiResponse.ErrorResult("No se puede dar de baja la unidad: contiene usuarios o roles asignados activos."));
            }

            u.Activo = false;
            u.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Unidad orgánica dada de baja exitosamente."));
        }

        [HttpPatch("{id}/reactivar")]
        public async Task<IActionResult> Reactivar(int id)
        {
            var u = await _context.UbicacionesOrg.FindAsync(id);
            if (u == null) return NotFound(ApiResponse.ErrorResult("Unidad no encontrada."));

            if (u.PadreId.HasValue)
            {
                var padre = await _context.UbicacionesOrg.FindAsync(u.PadreId.Value);
                if (padre == null || !padre.Activo)
                {
                    return BadRequest(ApiResponse.ErrorResult("No se puede reactivar la unidad: la unidad superior no existe o está inactiva."));
                }
            }

            u.Activo = true;
            u.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Unidad orgánica reactivada exitosamente."));
        }
    }
}
