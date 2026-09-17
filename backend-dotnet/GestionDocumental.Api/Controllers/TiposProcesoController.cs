using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.TiposProceso;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/tipos-proceso")]
    public class TiposProcesoController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TiposProcesoController(AppDbContext context)
        {
            _context = context;
        }

        [HttpGet]
        public async Task<IActionResult> GetAll([FromQuery] string? tipo_categoria, [FromQuery] string? search)
        {
            var query = _context.TiposProceso
                .Include(tp => tp.UbicacionOrg)
                .Where(tp => tp.Activo)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(tipo_categoria))
            {
                query = query.Where(tp => tp.TipoCategoria == tipo_categoria.Trim().ToUpper());
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(tp =>
                    tp.Codigo.ToLower().Contains(term) ||
                    tp.Nombre.ToLower().Contains(term) ||
                    (tp.Descripcion != null && tp.Descripcion.ToLower().Contains(term)));
            }

            var list = await query
                .OrderBy(tp => tp.TipoCategoria)
                .ThenBy(tp => tp.Nombre)
                .Select(tp => new TipoProcesoDto
                {
                    Id = tp.Id,
                    Codigo = tp.Codigo,
                    Nombre = tp.Nombre,
                    Descripcion = tp.Descripcion,
                    TipoCategoria = tp.TipoCategoria,
                    UbicacionOrgId = tp.UbicacionOrgId,
                    UbicacionCodigo = tp.UbicacionOrg != null ? tp.UbicacionOrg.Codigo : null,
                    UbicacionNombre = tp.UbicacionOrg != null ? tp.UbicacionOrg.Nombre : null,
                    UbicacionSigla = tp.UbicacionOrg != null ? tp.UbicacionOrg.Sigla : null,
                    CorrelativoSeq = tp.CorrelativoSeq,
                    TiempoEstimadoHoras = tp.TiempoEstimadoHoras,
                    Activo = tp.Activo
                })
                .ToListAsync();

            return Ok(ApiResponse<List<TipoProcesoDto>>.Ok(list));
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var tp = await _context.TiposProceso
                .Include(x => x.UbicacionOrg)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (tp == null) return NotFound(ApiResponse.ErrorResult("Tipo de proceso no encontrado."));

            var dto = new TipoProcesoDto
            {
                Id = tp.Id,
                Codigo = tp.Codigo,
                Nombre = tp.Nombre,
                Descripcion = tp.Descripcion,
                TipoCategoria = tp.TipoCategoria,
                UbicacionOrgId = tp.UbicacionOrgId,
                UbicacionCodigo = tp.UbicacionOrg != null ? tp.UbicacionOrg.Codigo : null,
                UbicacionNombre = tp.UbicacionOrg != null ? tp.UbicacionOrg.Nombre : null,
                UbicacionSigla = tp.UbicacionOrg != null ? tp.UbicacionOrg.Sigla : null,
                CorrelativoSeq = tp.CorrelativoSeq,
                TiempoEstimadoHoras = tp.TiempoEstimadoHoras,
                Activo = tp.Activo
            };

            return Ok(ApiResponse<TipoProcesoDto>.Ok(dto));
        }

        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTipoProcesoDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Datos inválidos."));

            bool exists = await _context.TiposProceso.AnyAsync(x => x.Codigo == dto.Codigo.Trim().ToUpper());
            if (exists) return Conflict(ApiResponse.ErrorResult($"Ya existe un tipo de proceso con el código '{dto.Codigo}'."));

            var nuevo = new TipoProceso
            {
                Codigo = dto.Codigo.Trim().ToUpper(),
                Nombre = dto.Nombre.Trim(),
                Descripcion = dto.Descripcion?.Trim(),
                TipoCategoria = dto.TipoCategoria ?? "TRAMITE",
                UbicacionOrgId = dto.UbicacionOrgId,
                TiempoEstimadoHoras = dto.TiempoEstimadoHoras > 0 ? dto.TiempoEstimadoHoras : 24,
                Activo = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.TiposProceso.Add(nuevo);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<object>.Ok(new
            {
                id = nuevo.Id,
                codigo = nuevo.Codigo,
                nombre = nuevo.Nombre,
                descripcion = nuevo.Descripcion,
                tiempoEstimadoHoras = nuevo.TiempoEstimadoHoras,
                activo = nuevo.Activo
            }, "Tipo de proceso creado exitosamente."));
        }

        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] UpdateTipoProcesoDto dto)
        {
            var tp = await _context.TiposProceso.FindAsync(id);
            if (tp == null) return NotFound(ApiResponse.ErrorResult("Tipo de proceso no encontrado."));

            if (!string.IsNullOrWhiteSpace(dto.Codigo) && dto.Codigo.Trim().ToUpper() != tp.Codigo)
            {
                bool exists = await _context.TiposProceso.AnyAsync(x => x.Codigo == dto.Codigo.Trim().ToUpper() && x.Id != id);
                if (exists) return Conflict(ApiResponse.ErrorResult($"Ya existe otro tipo de proceso con el código '{dto.Codigo}'."));
                tp.Codigo = dto.Codigo.Trim().ToUpper();
            }

            if (!string.IsNullOrWhiteSpace(dto.Nombre)) tp.Nombre = dto.Nombre.Trim();
            if (dto.Descripcion != null) tp.Descripcion = dto.Descripcion.Trim();
            if (!string.IsNullOrWhiteSpace(dto.TipoCategoria)) tp.TipoCategoria = dto.TipoCategoria;
            if (dto.UbicacionOrgId.HasValue) tp.UbicacionOrgId = dto.UbicacionOrgId.Value;
            if (dto.TiempoEstimadoHoras.HasValue) tp.TiempoEstimadoHoras = dto.TiempoEstimadoHoras.Value;
            if (dto.Activo.HasValue) tp.Activo = dto.Activo.Value;

            tp.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Tipo de proceso actualizado exitosamente."));
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var tp = await _context.TiposProceso
                .Include(x => x.Tramites)
                .FirstOrDefaultAsync(x => x.Id == id);

            if (tp == null) return NotFound(ApiResponse.ErrorResult("Tipo de proceso no encontrado."));

            if (tp.Tramites.Any(t => t.Activo))
            {
                return BadRequest(ApiResponse.ErrorResult("No se puede dar de baja: existen trámites activos asociados a este tipo."));
            }

            tp.Activo = false;
            tp.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult("Tipo de proceso dado de baja exitosamente."));
        }
    }
}
