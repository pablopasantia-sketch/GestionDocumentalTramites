using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Adjuntos;
using GestionDocumental.Api.DTOs.Common;
using GestionDocumental.Api.Entities;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    public class AdjuntosController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IWebHostEnvironment _env;
        private const long MaxFileSize = 25 * 1024 * 1024; // 25 MB

        public AdjuntosController(AppDbContext context, IWebHostEnvironment env)
        {
            _context = context;
            _env = env;
        }

        private string GetUploadDirectory()
        {
            var uploadDir = Path.Combine(_env.ContentRootPath, "Uploads", "adjuntos");
            if (!Directory.Exists(uploadDir))
            {
                Directory.CreateDirectory(uploadDir);
            }
            return uploadDir;
        }

        /// <summary>
        /// Subir uno o más documentos PDF a una Hoja de Ruta / Trámite Externo (RF-07.1)
        /// </summary>
        [Authorize]
        [HttpPost("api/tramites/{tramiteId}/adjuntos")]
        public async Task<IActionResult> UploadAdjuntos(int tramiteId, [FromForm] List<IFormFile> files, [FromForm] int? movimiento_id)
        {
            var tramite = await _context.Tramites.FirstOrDefaultAsync(t => t.Id == tramiteId && t.Activo);
            if (tramite == null)
            {
                return NotFound(ApiResponse.ErrorResult("Trámite no encontrado."));
            }

            if (files == null || files.Count == 0)
            {
                // Intentar leer de Request.Form.Files si no llegó por binding
                if (Request.HasFormContentType && Request.Form.Files.Count > 0)
                {
                    files = Request.Form.Files.ToList();
                }
                else
                {
                    return BadRequest(ApiResponse.ErrorResult("Debe seleccionar al menos un archivo PDF."));
                }
            }

            var userIdClaim = User.FindFirst("userId")?.Value ?? User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            int.TryParse(userIdClaim, out int userId);
            if (userId <= 0) userId = tramite.CreadoPor;

            var uploadDir = GetUploadDirectory();
            var uploadedList = new List<AdjuntoItemDto>();

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

                // Validación de extensión y tamaño
                var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
                if (ext != ".pdf")
                {
                    return BadRequest(ApiResponse.ErrorResult($"El archivo '{file.FileName}' no es un documento PDF válido. Solo se admiten archivos .pdf."));
                }

                if (file.Length > MaxFileSize)
                {
                    return BadRequest(ApiResponse.ErrorResult($"El archivo '{file.FileName}' excede el límite máximo permitido de 25 MB."));
                }

                var safeFileName = Path.GetFileName(file.FileName);
                var storedFileName = $"tramite_{tramiteId}_{Guid.NewGuid():N}.pdf";
                var destinationPath = Path.Combine(uploadDir, storedFileName);

                using (var stream = new FileStream(destinationPath, FileMode.Create))
                {
                    await file.CopyToAsync(stream);
                }

                var adjunto = new Adjunto
                {
                    TramiteId = tramite.Id,
                    MovimientoId = movimiento_id,
                    NombreOriginal = safeFileName,
                    NombreAlmacenado = storedFileName,
                    RutaArchivo = destinationPath,
                    TipoMime = "application/pdf",
                    TamanoBytes = file.Length,
                    SubidoPor = userId,
                    Activo = true,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Adjuntos.Add(adjunto);
                await _context.SaveChangesAsync();

                var usuarioSubio = await _context.Usuarios
                    .Include(u => u.Persona)
                    .FirstOrDefaultAsync(u => u.Id == userId);

                var nombreUsuario = usuarioSubio?.Persona != null
                    ? $"{usuarioSubio.Persona.Nombres} {usuarioSubio.Persona.ApellidoPaterno}".Trim()
                    : usuarioSubio?.Login ?? "Operador Ventanilla";

                uploadedList.Add(new AdjuntoItemDto
                {
                    Id = adjunto.Id,
                    TramiteId = adjunto.TramiteId,
                    MovimientoId = adjunto.MovimientoId,
                    NombreOriginal = adjunto.NombreOriginal,
                    TamanoBytes = adjunto.TamanoBytes,
                    TipoMime = adjunto.TipoMime,
                    SubidoPorNombre = nombreUsuario,
                    FechaSubida = adjunto.CreatedAt
                });
            }

            tramite.UpdatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse<List<AdjuntoItemDto>>.Ok(uploadedList, $"{uploadedList.Count} archivo(s) PDF adjuntado(s) exitosamente."));
        }

        /// <summary>
        /// Listar todos los archivos PDF adjuntos a una Hoja de Ruta (RF-07.2)
        /// </summary>
        [Authorize]
        [HttpGet("api/tramites/{tramiteId}/adjuntos")]
        public async Task<IActionResult> GetAdjuntosByTramite(int tramiteId)
        {
            var adjuntos = await _context.Adjuntos
                .Include(a => a.SubidoPorUsuario)
                    .ThenInclude(u => u.Persona)
                .Where(a => a.TramiteId == tramiteId && a.Activo)
                .OrderByDescending(a => a.Id)
                .Select(a => new AdjuntoItemDto
                {
                    Id = a.Id,
                    TramiteId = a.TramiteId,
                    MovimientoId = a.MovimientoId,
                    NombreOriginal = a.NombreOriginal,
                    TamanoBytes = a.TamanoBytes,
                    TipoMime = a.TipoMime,
                    SubidoPorNombre = a.SubidoPorUsuario.Persona != null
                        ? $"{a.SubidoPorUsuario.Persona.Nombres} {a.SubidoPorUsuario.Persona.ApellidoPaterno}".Trim()
                        : a.SubidoPorUsuario.Login,
                    FechaSubida = a.CreatedAt
                })
                .ToListAsync();

            return Ok(ApiResponse<List<AdjuntoItemDto>>.Ok(adjuntos));
        }

        /// <summary>
        /// Descargar archivo PDF con su nombre original (RF-07.2)
        /// </summary>
        [AllowAnonymous]
        [HttpGet("api/adjuntos/{id}/descargar")]
        [HttpHead("api/adjuntos/{id}/descargar")]
        public async Task<IActionResult> DescargarAdjunto(int id)
        {
            var adjunto = await _context.Adjuntos.FirstOrDefaultAsync(a => a.Id == id && a.Activo);
            if (adjunto == null)
            {
                return NotFound(ApiResponse.ErrorResult("Documento PDF no encontrado."));
            }

            if (!System.IO.File.Exists(adjunto.RutaArchivo))
            {
                return NotFound(ApiResponse.ErrorResult("El archivo físico no fue localizado en el servidor."));
            }

            var stream = new FileStream(adjunto.RutaArchivo, FileMode.Open, FileAccess.Read, FileShare.Read);
            return File(stream, "application/pdf", adjunto.NombreOriginal);
        }

        /// <summary>
        /// Visualizar archivo PDF en línea en el navegador (inline preview)
        /// </summary>
        [AllowAnonymous]
        [HttpGet("api/adjuntos/{id}/ver")]
        [HttpHead("api/adjuntos/{id}/ver")]
        public async Task<IActionResult> VerAdjunto(int id)
        {
            var adjunto = await _context.Adjuntos.FirstOrDefaultAsync(a => a.Id == id && a.Activo);
            if (adjunto == null)
            {
                return NotFound(ApiResponse.ErrorResult("Documento PDF no encontrado."));
            }

            if (!System.IO.File.Exists(adjunto.RutaArchivo))
            {
                return NotFound(ApiResponse.ErrorResult("El archivo físico no fue localizado en el servidor."));
            }

            var stream = new FileStream(adjunto.RutaArchivo, FileMode.Open, FileAccess.Read, FileShare.Read);
            Response.Headers.Append("Content-Disposition", $"inline; filename=\"{adjunto.NombreOriginal}\"");
            return File(stream, "application/pdf");
        }

        /// <summary>
        /// Baja lógica de archivo adjunto (RF-07.3)
        /// </summary>
        [Authorize]
        [HttpDelete("api/adjuntos/{id}")]
        public async Task<IActionResult> DeleteAdjunto(int id)
        {
            var adjunto = await _context.Adjuntos.FirstOrDefaultAsync(a => a.Id == id && a.Activo);
            if (adjunto == null)
            {
                return NotFound(ApiResponse.ErrorResult("Documento PDF no encontrado."));
            }

            adjunto.Activo = false;
            await _context.SaveChangesAsync();

            return Ok(ApiResponse.SuccessResult($"Documento '{adjunto.NombreOriginal}' eliminado exitosamente."));
        }
    }
}
