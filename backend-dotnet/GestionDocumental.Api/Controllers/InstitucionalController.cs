using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class InstitucionalController : ControllerBase
    {
        private readonly AppDbContext _context;

        public InstitucionalController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Obtiene todas las unidades institucionales (TUnidad)
        /// </summary>
        [HttpGet("unidades")]
        public async Task<IActionResult> GetUnidades([FromQuery] bool? activo = null)
        {
            var query = _context.TUnidades.AsQueryable();
            if (activo.HasValue)
            {
                query = query.Where(u => u.Activo == activo.Value);
            }

            var unidades = await query
                .OrderBy(u => u.CodU)
                .Select(u => new
                {
                    u.CodU,
                    u.NombU,
                    u.Activo
                })
                .ToListAsync();

            return Ok(unidades);
        }

        /// <summary>
        /// Obtiene los cargos institucionales (TCargo), con filtro opcional por unidad
        /// </summary>
        [HttpGet("cargos")]
        public async Task<IActionResult> GetCargos([FromQuery] short? codU = null)
        {
            var query = _context.TCargos.Include(c => c.Unidad).AsQueryable();
            if (codU.HasValue)
            {
                query = query.Where(c => c.CodU == codU.Value);
            }

            var cargos = await query
                .OrderBy(c => c.CodCargo)
                .Select(c => new
                {
                    c.CodCargo,
                    c.NombreC,
                    c.CodU,
                    UnidadNombre = c.Unidad != null ? c.Unidad.NombU : null
                })
                .ToListAsync();

            return Ok(cargos);
        }

        /// <summary>
        /// Obtiene los empleados institucionales (TEmpleados)
        /// </summary>
        [HttpGet("empleados")]
        public async Task<IActionResult> GetEmpleados([FromQuery] bool? activo = null, [FromQuery] string? search = null)
        {
            var query = _context.TEmpleados.AsQueryable();
            if (activo.HasValue)
            {
                query = query.Where(e => e.Activo == activo.Value);
            }
            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(e => e.Nombres.ToLower().Contains(term) || 
                                         e.Apellidos.ToLower().Contains(term) ||
                                         e.CI.ToString().Contains(term));
            }

            var empleados = await query
                .OrderBy(e => e.Apellidos)
                .ThenBy(e => e.Nombres)
                .Select(e => new
                {
                    e.CI,
                    e.Apellidos,
                    e.Nombres,
                    NombreCompleto = $"{e.Nombres} {e.Apellidos}",
                    e.Direccion,
                    e.Cel,
                    e.Email,
                    e.Activo
                })
                .ToListAsync();

            return Ok(empleados);
        }

        /// <summary>
        /// Obtiene el detalle de un empleado por CI
        /// </summary>
        [HttpGet("empleados/{ci:int}")]
        public async Task<IActionResult> GetEmpleadoPorCi(int ci)
        {
            var empleado = await _context.TEmpleados
                .Where(e => e.CI == ci)
                .Select(e => new
                {
                    e.CI,
                    e.Apellidos,
                    e.Nombres,
                    NombreCompleto = $"{e.Nombres} {e.Apellidos}",
                    e.Direccion,
                    e.Cel,
                    e.Email,
                    e.Activo
                })
                .FirstOrDefaultAsync();

            if (empleado == null)
            {
                return NotFound(new { message = $"Empleado con CI {ci} no encontrado en DBNotasCMS." });
            }

            return Ok(empleado);
        }
    }
}
