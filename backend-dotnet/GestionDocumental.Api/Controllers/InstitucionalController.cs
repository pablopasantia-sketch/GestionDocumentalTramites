using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.Entities;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Institucional;

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
                    u.Activo,
                    TotalCargos = u.Cargos.Count
                })
                .ToListAsync();

            return Ok(ApiResponse<object>.Ok(unidades, "Unidades institucionales obtenidas exitosamente"));
        }

        /// <summary>
        /// Crea una nueva unidad institucional (TUnidad)
        /// </summary>
        [HttpPost("unidades")]
        public async Task<IActionResult> CreateUnidad([FromBody] CrearUnidadDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de unidad inválidos", ModelState));
            }

            var existeNombre = await _context.TUnidades.AnyAsync(u => u.NombU.ToLower() == request.NombU.Trim().ToLower());
            if (existeNombre)
            {
                return BadRequest(ApiResponse<object>.Fail($"Ya existe una unidad institucional con el nombre '{request.NombU.Trim()}'."));
            }

            short nuevoCodU = request.CodU ?? 0;
            if (nuevoCodU <= 0)
            {
                var maxCodU = await _context.TUnidades.MaxAsync(u => (short?)u.CodU) ?? 0;
                nuevoCodU = (short)(maxCodU + 1);
            }
            else
            {
                var existeCodigo = await _context.TUnidades.AnyAsync(u => u.CodU == nuevoCodU);
                if (existeCodigo)
                {
                    return BadRequest(ApiResponse<object>.Fail($"Ya existe una unidad institucional con el código {nuevoCodU}."));
                }
            }

            var nuevaUnidad = new TUnidad
            {
                CodU = nuevoCodU,
                NombU = request.NombU.Trim().ToUpper(),
                Activo = request.Activo
            };

            _context.TUnidades.Add(nuevaUnidad);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUnidades), new { activo = true }, ApiResponse<object>.Ok(nuevaUnidad, "Unidad institucional creada con éxito"));
        }

        /// <summary>
        /// Actualiza una unidad institucional existente (TUnidad)
        /// </summary>
        [HttpPut("unidades/{codU:int}")]
        public async Task<IActionResult> UpdateUnidad(short codU, [FromBody] ActualizarUnidadDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de unidad inválidos", ModelState));
            }

            var unidad = await _context.TUnidades.FirstOrDefaultAsync(u => u.CodU == codU);
            if (unidad == null)
            {
                return NotFound(ApiResponse<object>.Fail($"Unidad institucional con código {codU} no encontrada."));
            }

            var existeNombre = await _context.TUnidades.AnyAsync(u => u.CodU != codU && u.NombU.ToLower() == request.NombU.Trim().ToLower());
            if (existeNombre)
            {
                return BadRequest(ApiResponse<object>.Fail($"Ya existe otra unidad institucional con el nombre '{request.NombU.Trim()}'."));
            }

            unidad.NombU = request.NombU.Trim().ToUpper();
            unidad.Activo = request.Activo;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(unidad, "Unidad institucional actualizada con éxito"));
        }

        /// <summary>
        /// Elimina o da de baja lógica a una unidad institucional (TUnidad)
        /// </summary>
        [HttpDelete("unidades/{codU:int}")]
        public async Task<IActionResult> DeleteUnidad(short codU)
        {
            var unidad = await _context.TUnidades.Include(u => u.Cargos).FirstOrDefaultAsync(u => u.CodU == codU);
            if (unidad == null)
            {
                return NotFound(ApiResponse<object>.Fail($"Unidad institucional con código {codU} no encontrada."));
            }

            if (unidad.Cargos != null && unidad.Cargos.Any())
            {
                unidad.Activo = false;
                await _context.SaveChangesAsync();
                return Ok(ApiResponse<object>.Ok(unidad, $"La unidad posee {unidad.Cargos.Count} cargo(s) dependiente(s). Se procedió a su desactivación lógica."));
            }

            _context.TUnidades.Remove(unidad);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "Unidad institucional eliminada permanentemente"));
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

            return Ok(ApiResponse<object>.Ok(cargos, "Cargos institucionales obtenidos exitosamente"));
        }

        /// <summary>
        /// Crea un nuevo cargo institucional (TCargo)
        /// </summary>
        [HttpPost("cargos")]
        public async Task<IActionResult> CreateCargo([FromBody] CrearCargoDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de cargo inválidos", ModelState));
            }

            var unidadExiste = await _context.TUnidades.AnyAsync(u => u.CodU == request.CodU);
            if (!unidadExiste)
            {
                return BadRequest(ApiResponse<object>.Fail($"La unidad con código {request.CodU} no existe en DB_TRAMITES_EXTERNOS."));
            }

            short nuevoCodCargo = request.CodCargo ?? 0;
            if (nuevoCodCargo <= 0)
            {
                var maxCodCargo = await _context.TCargos.MaxAsync(c => (short?)c.CodCargo) ?? 0;
                nuevoCodCargo = (short)(maxCodCargo + 1);
            }
            else
            {
                var existeCodigo = await _context.TCargos.AnyAsync(c => c.CodCargo == nuevoCodCargo);
                if (existeCodigo)
                {
                    return BadRequest(ApiResponse<object>.Fail($"Ya existe un cargo institucional con el código {nuevoCodCargo}."));
                }
            }

            var nuevoCargo = new TCargo
            {
                CodCargo = nuevoCodCargo,
                NombreC = request.NombreC.Trim().ToUpper(),
                CodU = request.CodU
            };

            _context.TCargos.Add(nuevoCargo);
            await _context.SaveChangesAsync();

            return CreatedAtAction(nameof(GetCargos), new { codU = request.CodU }, ApiResponse<object>.Ok(nuevoCargo, "Cargo institucional creado con éxito"));
        }

        /// <summary>
        /// Actualiza un cargo institucional existente (TCargo)
        /// </summary>
        [HttpPut("cargos/{codCargo:int}")]
        public async Task<IActionResult> UpdateCargo(short codCargo, [FromBody] ActualizarCargoDto request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse<object>.Fail("Datos de cargo inválidos", ModelState));
            }

            var cargo = await _context.TCargos.FirstOrDefaultAsync(c => c.CodCargo == codCargo);
            if (cargo == null)
            {
                return NotFound(ApiResponse<object>.Fail($"Cargo institucional con código {codCargo} no encontrado."));
            }

            var unidadExiste = await _context.TUnidades.AnyAsync(u => u.CodU == request.CodU);
            if (!unidadExiste)
            {
                return BadRequest(ApiResponse<object>.Fail($"La unidad institucional con código {request.CodU} no existe."));
            }

            cargo.NombreC = request.NombreC.Trim().ToUpper();
            cargo.CodU = request.CodU;

            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(cargo, "Cargo institucional actualizado con éxito"));
        }

        /// <summary>
        /// Elimina un cargo institucional (TCargo)
        /// </summary>
        [HttpDelete("cargos/{codCargo:int}")]
        public async Task<IActionResult> DeleteCargo(short codCargo)
        {
            var cargo = await _context.TCargos.FirstOrDefaultAsync(c => c.CodCargo == codCargo);
            if (cargo == null)
            {
                return NotFound(ApiResponse<object>.Fail($"Cargo institucional con código {codCargo} no encontrado."));
            }

            _context.TCargos.Remove(cargo);
            await _context.SaveChangesAsync();
            return Ok(ApiResponse<object>.Ok(null, "Cargo institucional eliminado exitosamente"));
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

            return Ok(ApiResponse<object>.Ok(empleados, "Empleados institucionales obtenidos exitosamente"));
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
                return NotFound(ApiResponse<object>.Fail($"Empleado con CI {ci} no encontrado en DB_TRAMITES_EXTERNOS."));
            }

            return Ok(ApiResponse<object>.Ok(empleado, "Empleado institucional encontrado"));
        }
    }
}
