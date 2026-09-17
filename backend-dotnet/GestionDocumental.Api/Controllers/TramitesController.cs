using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.DTOs.Tramites;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TramitesController : ControllerBase
    {
        private readonly AppDbContext _context;

        public TramitesController(AppDbContext context)
        {
            _context = context;
        }

        /// <summary>
        /// Consulta pública de trámite por Hoja de Ruta / Correlativo (RF-09.1)
        /// Sin autenticación requerida para acceso ciudadano transparente
        /// </summary>
        [AllowAnonymous]
        [HttpGet("public/consulta")]
        public async Task<IActionResult> ConsultaPublica([FromQuery] string? correlativo, [FromQuery(Name = "nro_tramite")] string? nroTramite, [FromQuery] int? gestion)
        {
            var searchCorr = !string.IsNullOrWhiteSpace(correlativo) ? correlativo : nroTramite;
            if (string.IsNullOrWhiteSpace(searchCorr))
            {
                return BadRequest(ApiResponse.ErrorResult("Debe especificar el número de correlativo u hoja de ruta (ej: CORR-EXT-1/2026)."));
            }

            int year = gestion ?? DateTime.UtcNow.Year;
            var cleanCorrelativo = searchCorr.Trim();

            var tramite = await _context.Tramites
                .Include(t => t.TipoProceso)
                .Include(t => t.UbicacionOrg)
                .Include(t => t.UbicacionActual)
                .Include(t => t.Movimientos)
                    .ThenInclude(m => m.UbicacionOrigen)
                .Include(t => t.Movimientos)
                    .ThenInclude(m => m.UbicacionDestino)
                .FirstOrDefaultAsync(t => t.NumeroCorrelativo == cleanCorrelativo && t.Gestion == year && t.Activo);

            if (tramite == null)
            {
                return NotFound(ApiResponse.ErrorResult($"No se encontró ningún trámite registrado con el correlativo '{cleanCorrelativo}' en la gestión {year}."));
            }

            var historial = tramite.Movimientos
                .OrderBy(m => m.Orden)
                .Select(m => new MovimientoTimelineDto
                {
                    Orden = m.Orden,
                    Actividad = m.ActividadNombre,
                    TipoMovimiento = m.TipoMovimiento,
                    UnidadOrigen = m.UbicacionOrigen != null ? m.UbicacionOrigen.Nombre : "Ventanilla Central",
                    UnidadDestino = m.UbicacionDestino != null ? m.UbicacionDestino.Nombre : null,
                    Estado = m.EstadoMovimiento,
                    Proveido = m.Proveido,
                    Fecha = m.FechaRecepcion ?? m.FechaEnvio ?? m.CreatedAt
                })
                .ToList();

            var resultado = new TramiteConsultaPublicaDto
            {
                Id = tramite.Id,
                NumeroCorrelativo = tramite.NumeroCorrelativo,
                Gestion = tramite.Gestion,
                TipoProceso = tramite.TipoProceso.Nombre,
                TipoCategoria = tramite.TipoProceso.TipoCategoria,
                Referencia = tramite.Referencia,
                Remitente = tramite.Remitente,
                Estado = tramite.Estado,
                Prioridad = tramite.Prioridad,
                NroHojas = tramite.NroHojas,
                FechaCreacion = tramite.FechaCreacion,
                FechaConclusion = tramite.FechaConclusion,
                UbicacionActual = tramite.UbicacionActual != null ? tramite.UbicacionActual.Nombre : "Despacho Central",
                UnidadOrigen = tramite.UbicacionOrg != null ? tramite.UbicacionOrg.Nombre : "Ventanilla Única",
                Historial = historial
            };

            return Ok(ApiResponse<TramiteConsultaPublicaDto>.Ok(resultado, "Trámite localizado exitosamente."));
        }

        [Authorize]
        [HttpGet]
        public async Task<IActionResult> GetAll(
            [FromQuery] string? estado,
            [FromQuery] int? gestion,
            [FromQuery] string? search,
            [FromQuery] int limit = 50,
            [FromQuery] int offset = 0)
        {
            var query = _context.Tramites
                .Include(t => t.TipoProceso)
                .Include(t => t.UbicacionActual)
                .Include(t => t.UsuarioActual)
                .Where(t => t.Activo)
                .AsQueryable();

            if (!string.IsNullOrWhiteSpace(estado) && estado != "TODOS")
            {
                query = query.Where(t => t.Estado == estado.Trim());
            }

            if (gestion.HasValue)
            {
                query = query.Where(t => t.Gestion == gestion.Value);
            }

            if (!string.IsNullOrWhiteSpace(search))
            {
                var term = search.Trim().ToLower();
                query = query.Where(t =>
                    t.NumeroCorrelativo.ToLower().Contains(term) ||
                    t.Remitente.ToLower().Contains(term) ||
                    t.Referencia.ToLower().Contains(term) ||
                    t.TipoProceso.Nombre.ToLower().Contains(term));
            }

            var list = await query
                .OrderByDescending(t => t.Id)
                .Skip(offset)
                .Take(limit)
                .Select(t => new TramiteListItemDto
                {
                    Id = t.Id,
                    NumeroCorrelativo = t.NumeroCorrelativo,
                    Gestion = t.Gestion,
                    TipoProcesoId = t.TipoProcesoId,
                    TipoProcesoNombre = t.TipoProceso.Nombre,
                    TipoCorres = t.TipoCorres,
                    Remitente = t.Remitente,
                    Referencia = t.Referencia,
                    Prioridad = t.Prioridad,
                    NroHojas = t.NroHojas,
                    Estado = t.Estado,
                    UbicacionActualNombre = t.UbicacionActual != null ? t.UbicacionActual.Nombre : null,
                    UsuarioActualLogin = t.UsuarioActual != null ? t.UsuarioActual.Login : null,
                    FechaCreacion = t.FechaCreacion
                })
                .ToListAsync();

            return Ok(ApiResponse<List<TramiteListItemDto>>.Ok(list));
        }

        [Authorize]
        [HttpGet("stats")]
        public async Task<IActionResult> GetStats([FromQuery] int? gestion)
        {
            int year = gestion ?? DateTime.UtcNow.Year;

            var all = await _context.Tramites
                .Where(t => t.Gestion == year && t.Activo)
                .Select(t => t.Estado)
                .ToListAsync();

            var stats = new TramiteStatsDto
            {
                Gestion = year,
                Total = all.Count,
                Creados = all.Count(e => e == "CREADO"),
                EnAtencion = all.Count(e => e == "EN_ATENCION"),
                EnTransito = all.Count(e => e == "EN_TRANSITO" || e == "POR_RECIBIR"),
                Recibidos = all.Count(e => e == "RECIBIDO"),
                Bloqueados = all.Count(e => e == "BLOQUEADO"),
                Concluidos = all.Count(e => e == "CONCLUIDO"),
                Anulados = all.Count(e => e == "ANULADO")
            };

            return Ok(ApiResponse<TramiteStatsDto>.Ok(stats));
        }

        /// <summary>
        /// Anulación de trámite (Operación especial - RF-10.1)
        /// </summary>
        [Authorize]
        [HttpPost("{id}/anular")]
        public async Task<IActionResult> Anular(int id, [FromBody] AnularTramiteDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ApiResponse.ErrorResult("Motivo de anulación requerido."));

            var tramite = await _context.Tramites
                .Include(t => t.Movimientos)
                .FirstOrDefaultAsync(t => t.Id == id && t.Activo);

            if (tramite == null) return NotFound(ApiResponse.ErrorResult("Trámite no encontrado."));

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);

            tramite.Estado = "ANULADO";
            tramite.MotivoAnulacion = dto.Motivo.Trim();
            tramite.UpdatedAt = DateTime.UtcNow;

            int nextOrden = (tramite.Movimientos.Any() ? tramite.Movimientos.Max(m => m.Orden) : 0) + 1;

            var movimientoAnulacion = new Movimiento
            {
                TramiteId = tramite.Id,
                Orden = nextOrden,
                TipoMovimiento = "ANULACION",
                ActividadNombre = "Anulación de trámite",
                UsuarioOrigenId = userId > 0 ? userId : tramite.CreadoPor,
                UbicacionOrigenId = ubicacionId > 0 ? ubicacionId : tramite.UbicacionOrgId,
                EstadoMovimiento = "ANULADO",
                Proveido = $"Anulación: {dto.Motivo.Trim()}",
                FechaEnvio = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow
            };

            _context.Movimientos.Add(movimientoAnulacion);
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult($"Trámite {tramite.NumeroCorrelativo} anulado exitosamente."));
        }
    }
}
