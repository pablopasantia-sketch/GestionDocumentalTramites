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
        /// Obtener previsualización del siguiente número correlativo institucional (RF-03.3)
        /// </summary>
        [Authorize]
        [HttpGet("next-correlativo")]
        public async Task<IActionResult> GetNextCorrelativo([FromQuery] int tipo_proceso_id, [FromQuery] int? gestion)
        {
            var tipo = await _context.TiposProceso.FirstOrDefaultAsync(tp => tp.Id == tipo_proceso_id && tp.Activo);
            if (tipo == null)
            {
                return NotFound(ApiResponse.ErrorResult("Tipo de trámite externo no encontrado o inactivo."));
            }

            int year = gestion ?? DateTime.UtcNow.Year;
            var corr = await _context.Correlativos
                .FirstOrDefaultAsync(c => c.TipoProcesoId == tipo.Id && c.Gestion == year);

            int nextNum = (corr != null ? corr.UltimoNumero : 0) + 1;
            string preview = $"{tipo.Codigo}-{nextNum}/{year}";

            var result = new NextCorrelativoPreviewDto
            {
                NumeroCorrelativo = preview,
                Gestion = year,
                CodigoTipo = tipo.Codigo,
                NombreTipo = tipo.Nombre,
                TiempoEstimadoHoras = tipo.TiempoEstimadoHoras
            };

            return Ok(ApiResponse<NextCorrelativoPreviewDto>.Ok(result));
        }

        /// <summary>
        /// Obtener detalle completo de un trámite por ID (para Hoja de Ruta y consulta)
        /// </summary>
        [Authorize]
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(int id)
        {
            var tramite = await _context.Tramites
                .Include(t => t.TipoProceso)
                .Include(t => t.CreadoPorUsuario)
                    .ThenInclude(u => u.Persona)
                .Include(t => t.UbicacionOrg)
                .Include(t => t.Movimientos)
                    .ThenInclude(m => m.UsuarioOrigen)
                        .ThenInclude(u => u.Persona)
                .Include(t => t.Movimientos)
                    .ThenInclude(m => m.UbicacionOrigen)
                .Include(t => t.Movimientos)
                    .ThenInclude(m => m.UbicacionDestino)
                .FirstOrDefaultAsync(t => t.Id == id && t.Activo);

            if (tramite == null)
            {
                return NotFound(ApiResponse.ErrorResult("Trámite no encontrado."));
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

            var creadorNombre = tramite.CreadoPorUsuario?.Persona != null
                ? $"{tramite.CreadoPorUsuario.Persona.Nombres} {tramite.CreadoPorUsuario.Persona.ApellidoPaterno}".Trim()
                : tramite.CreadoPorUsuario?.Login ?? "Operador Ventanilla";

            var detalle = new TramiteDetalleCompletoDto
            {
                Id = tramite.Id,
                NumeroCorrelativo = tramite.NumeroCorrelativo,
                Gestion = tramite.Gestion,
                TipoProcesoId = tramite.TipoProcesoId,
                TipoProcesoCodigo = tramite.TipoProceso.Codigo,
                TipoProcesoNombre = tramite.TipoProceso.Nombre,
                TipoCategoria = tramite.TipoProceso.TipoCategoria,
                Estado = tramite.Estado,
                Remitente = tramite.Remitente,
                InstitucionRemitente = tramite.InstitucionRemitente,
                CiteExterno = tramite.CiteExterno,
                Referencia = tramite.Referencia,
                Prioridad = tramite.Prioridad,
                NroHojas = tramite.NroHojas,
                NroAnexos = tramite.NroAnexos,
                Instruccion = tramite.Instruccion,
                DestinatarioNombre = tramite.DestinatarioNombre,
                DestinatarioCargo = tramite.DestinatarioCargo,
                DestinatarioUnidad = tramite.DestinatarioUnidad,
                CodUDestino = tramite.CodUDestino,
                CodCargoDestino = tramite.CodCargoDestino,
                CiEmpleadoDestino = tramite.CiEmpleadoDestino,
                FechaCreacion = tramite.FechaCreacion,
                FechaLimiteRespuesta = tramite.FechaLimiteRespuesta,
                CreadoPorUsuario = creadorNombre,
                UnidadOrigen = tramite.UbicacionOrg?.Nombre ?? "Ventanilla Única",
                Historial = historial
            };

            return Ok(ApiResponse<TramiteDetalleCompletoDto>.Ok(detalle));
        }

        /// <summary>
        /// Crear trámite / correspondencia externa unificada (Ventanilla Única y Despachos - RF-03)
        /// Genera automáticamente correlativo oficial [CÓDIGO]-[NRO]/[GESTIÓN] y registra movimiento inicial
        /// </summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] CreateTramiteExternoDto dto)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ApiResponse.ErrorResult("Datos de correspondencia inválidos. Verifique los campos obligatorios."));
            }

            var tipo = await _context.TiposProceso.FirstOrDefaultAsync(tp => tp.Id == dto.TipoProcesoId && tp.Activo);
            if (tipo == null)
            {
                return BadRequest(ApiResponse.ErrorResult("El tipo de trámite seleccionado no existe o no está activo."));
            }

            // Exclusividad Trámites Externos
            if (tipo.TipoCategoria != "CORRESPONDENCIA")
            {
                return BadRequest(ApiResponse.ErrorResult("Solo se permite la recepción de correspondencia y trámites externos en este módulo."));
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = 1; // Default admin/operador

            var ubiClaim = User.FindFirst("ubicacionOrgId")?.Value;
            int.TryParse(ubiClaim, out int ubicacionId);
            if (ubicacionId <= 0)
            {
                var userRol = await _context.UsuarioRoles
                    .FirstOrDefaultAsync(ur => ur.UsuarioId == userId && ur.Activo);
                ubicacionId = userRol?.UbicacionOrgId ?? tipo.UbicacionOrgId ?? 3; // 3: Ventanilla Única
            }

            int year = DateTime.UtcNow.Year;

            // Iniciar transacción para garantizar correlativo atómico sin colisiones
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var corr = await _context.Correlativos
                    .FirstOrDefaultAsync(c => c.TipoProcesoId == tipo.Id && c.Gestion == year);

                if (corr == null)
                {
                    corr = new Correlativo
                    {
                        TipoProcesoId = tipo.Id,
                        UbicacionOrgId = ubicacionId,
                        Gestion = year,
                        UltimoNumero = 1,
                        FormatoPatron = "{CODIGO}-{NUMERO}/{GESTION}",
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    _context.Correlativos.Add(corr);
                }
                else
                {
                    corr.UltimoNumero += 1;
                    corr.UpdatedAt = DateTime.UtcNow;
                }

                int nextSeq = corr.UltimoNumero;
                tipo.CorrelativoSeq = nextSeq;
                tipo.UpdatedAt = DateTime.UtcNow;

                string numeroCorrelativo = $"{tipo.Codigo}-{nextSeq}/{year}";
                DateTime ahora = DateTime.UtcNow;
                DateTime? fechaLimite = tipo.TiempoEstimadoHoras > 0
                    ? ahora.AddHours(tipo.TiempoEstimadoHoras)
                    : (DateTime?)null;

                var nuevoTramite = new Tramite
                {
                    NumeroCorrelativo = numeroCorrelativo,
                    Gestion = year,
                    TipoProcesoId = tipo.Id,
                    Estado = "CREADO",
                    Remitente = dto.Remitente.Trim(),
                    InstitucionRemitente = !string.IsNullOrWhiteSpace(dto.InstitucionRemitente) ? dto.InstitucionRemitente.Trim() : null,
                    CiteExterno = !string.IsNullOrWhiteSpace(dto.CiteExterno) ? dto.CiteExterno.Trim() : null,
                    Referencia = dto.Referencia.Trim(),
                    TipoCorres = "CORRESPONDENCIA",
                    NroHojas = dto.NroHojas,
                    NroAnexos = dto.NroAnexos,
                    Instruccion = !string.IsNullOrWhiteSpace(dto.Instruccion) ? dto.Instruccion.Trim() : null,
                    Prioridad = !string.IsNullOrWhiteSpace(dto.Prioridad) ? dto.Prioridad.Trim().ToUpper() : "NORMAL",
                    CodUDestino = dto.CodUDestino,
                    CodCargoDestino = dto.CodCargoDestino,
                    CiEmpleadoDestino = dto.CiEmpleadoDestino,
                    DestinatarioNombre = !string.IsNullOrWhiteSpace(dto.DestinatarioNombre) ? dto.DestinatarioNombre.Trim() : null,
                    DestinatarioCargo = !string.IsNullOrWhiteSpace(dto.DestinatarioCargo) ? dto.DestinatarioCargo.Trim() : null,
                    DestinatarioUnidad = !string.IsNullOrWhiteSpace(dto.DestinatarioUnidad) ? dto.DestinatarioUnidad.Trim() : null,
                    PrimerDestinatarioId = dto.PrimerDestinatarioId,
                    FechaCreacion = ahora,
                    FechaLimiteRespuesta = fechaLimite,
                    CreadoPor = userId,
                    UbicacionOrgId = ubicacionId,
                    UsuarioActualId = userId,
                    UbicacionActualId = ubicacionId,
                    Activo = true,
                    CreatedAt = ahora,
                    UpdatedAt = ahora
                };

                _context.Tramites.Add(nuevoTramite);
                await _context.SaveChangesAsync();

                // Movimiento 1: Recepción inicial en Ventanilla Única
                var provText = !string.IsNullOrWhiteSpace(dto.ProveidoInicial)
                    ? dto.ProveidoInicial.Trim()
                    : $"Recepción y apertura de Hoja de Ruta externa {numeroCorrelativo}.";

                var primerMovimiento = new Movimiento
                {
                    TramiteId = nuevoTramite.Id,
                    Orden = 1,
                    TipoMovimiento = "INICIO",
                    ActividadNombre = "Recepción en Ventanilla Única",
                    UsuarioOrigenId = userId,
                    UbicacionOrigenId = ubicacionId,
                    EstadoMovimiento = "CREADO",
                    Proveido = provText,
                    Instruccion = nuevoTramite.Instruccion,
                    TiempoEstimadoMinutos = tipo.TiempoEstimadoHoras * 60,
                    FechaEnvio = ahora,
                    FechaRecepcion = ahora,
                    CreatedAt = ahora
                };

                _context.Movimientos.Add(primerMovimiento);
                await _context.SaveChangesAsync();

                await transaction.CommitAsync();

                return CreatedAtAction(nameof(GetById), new { id = nuevoTramite.Id },
                    ApiResponse<TramiteDetalleCompletoDto>.Ok(new TramiteDetalleCompletoDto
                    {
                        Id = nuevoTramite.Id,
                        NumeroCorrelativo = nuevoTramite.NumeroCorrelativo,
                        Gestion = nuevoTramite.Gestion,
                        TipoProcesoId = nuevoTramite.TipoProcesoId,
                        TipoProcesoCodigo = tipo.Codigo,
                        TipoProcesoNombre = tipo.Nombre,
                        TipoCategoria = tipo.TipoCategoria,
                        Estado = nuevoTramite.Estado,
                        Remitente = nuevoTramite.Remitente,
                        InstitucionRemitente = nuevoTramite.InstitucionRemitente,
                        CiteExterno = nuevoTramite.CiteExterno,
                        Referencia = nuevoTramite.Referencia,
                        Prioridad = nuevoTramite.Prioridad,
                        NroHojas = nuevoTramite.NroHojas,
                        NroAnexos = nuevoTramite.NroAnexos,
                        Instruccion = nuevoTramite.Instruccion,
                        DestinatarioNombre = nuevoTramite.DestinatarioNombre,
                        DestinatarioCargo = nuevoTramite.DestinatarioCargo,
                        DestinatarioUnidad = nuevoTramite.DestinatarioUnidad,
                        CodUDestino = nuevoTramite.CodUDestino,
                        CodCargoDestino = nuevoTramite.CodCargoDestino,
                        CiEmpleadoDestino = nuevoTramite.CiEmpleadoDestino,
                        FechaCreacion = nuevoTramite.FechaCreacion,
                        FechaLimiteRespuesta = nuevoTramite.FechaLimiteRespuesta,
                        CreadoPorUsuario = "Operador Ventanilla",
                        UnidadOrigen = "Ventanilla Única"
                    }, $"Hoja de Ruta {nuevoTramite.NumeroCorrelativo} creada exitosamente."));
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, ApiResponse.ErrorResult($"Error al emitir la Hoja de Ruta: {ex.Message}"));
            }
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
