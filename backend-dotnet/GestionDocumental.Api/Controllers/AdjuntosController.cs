using System;
using System.Collections.Generic;
using System.Data;
using System.IO;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.SqlClient;
using GestionDocumental.Api.Data;
using GestionDocumental.Api.DTOs.Adjuntos;
using GestionDocumental.Api.DTOs.Common;

namespace GestionDocumental.Api.Controllers
{
    [ApiController]
    public class AdjuntosController : ControllerBase
    {
        private readonly IStoredProcedureService _sp;
        private readonly IWebHostEnvironment _env;
        private const long MaxFileSize = 25 * 1024 * 1024; // 25 MB

        public AdjuntosController(IStoredProcedureService sp, IWebHostEnvironment env)
        {
            _sp = sp;
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

        private class AdjuntoRecord
        {
            public int Id { get; set; }
            public int TramiteId { get; set; }
            public int? MovimientoId { get; set; }
            public string NombreOriginal { get; set; } = string.Empty;
            public string NombreAlmacenado { get; set; } = string.Empty;
            public string RutaArchivo { get; set; } = string.Empty;
            public string TipoMime { get; set; } = string.Empty;
            public long TamanoBytes { get; set; }
            public int SubidoPor { get; set; }
            public bool Activo { get; set; }
            public DateTime CreatedAt { get; set; }
        }

        /// <summary>
        /// Subir uno o más documentos PDF a una Hoja de Ruta / Trámite Externo (RF-07.1)
        /// </summary>
        [Authorize]
        [HttpPost("api/tramites/{tramiteId}/adjuntos")]
        public async Task<IActionResult> UploadAdjuntos(int tramiteId, [FromForm] List<IFormFile> files, [FromForm] int? movimiento_id)
        {
            // Validar trámite mediante SP
            var tramite = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Tramites_ObtenerPorId",
                reader => new { Id = reader.GetSafeInt32("id"), CreadoPorUsuario = reader.GetSafeString("creado_por_usuario") },
                new SqlParameter("@Id", SqlDbType.Int) { Value = tramiteId }
            );

            if (tramite == null)
            {
                return NotFound(ApiResponse.ErrorResult("Trámite no encontrado."));
            }

            if (files == null || files.Count == 0)
            {
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
            if (userId <= 0) userId = 1;

            var uploadDir = GetUploadDirectory();
            var uploadedList = new List<AdjuntoItemDto>();

            foreach (var file in files)
            {
                if (file.Length == 0) continue;

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

                var outParam = new SqlParameter("@NuevoId", SqlDbType.Int) { Direction = ParameterDirection.Output };

                await _sp.ExecuteNonQueryAsync(
                    "dbo.usp_Adjuntos_Insertar",
                    new SqlParameter("@TramiteId", SqlDbType.Int) { Value = tramiteId },
                    new SqlParameter("@MovimientoId", SqlDbType.Int) { Value = (object?)movimiento_id ?? DBNull.Value },
                    new SqlParameter("@NombreOriginal", SqlDbType.VarChar, 255) { Value = safeFileName },
                    new SqlParameter("@NombreAlmacenado", SqlDbType.VarChar, 255) { Value = storedFileName },
                    new SqlParameter("@RutaArchivo", SqlDbType.VarChar, 500) { Value = destinationPath },
                    new SqlParameter("@TipoMime", SqlDbType.VarChar, 100) { Value = "application/pdf" },
                    new SqlParameter("@TamanoBytes", SqlDbType.BigInt) { Value = file.Length },
                    new SqlParameter("@SubidoPor", SqlDbType.Int) { Value = userId },
                    outParam
                );

                int nuevoId = (int)outParam.Value;

                uploadedList.Add(new AdjuntoItemDto
                {
                    Id = nuevoId,
                    TramiteId = tramiteId,
                    MovimientoId = movimiento_id,
                    NombreOriginal = safeFileName,
                    TamanoBytes = file.Length,
                    TipoMime = "application/pdf",
                    SubidoPorNombre = "Usuario Actual",
                    FechaSubida = DateTime.UtcNow
                });
            }

            return Ok(ApiResponse<List<AdjuntoItemDto>>.Ok(uploadedList, $"{uploadedList.Count} archivo(s) PDF adjuntado(s) exitosamente."));
        }

        /// <summary>
        /// Listar todos los archivos PDF adjuntos a una Hoja de Ruta (RF-07.2)
        /// </summary>
        [Authorize]
        [HttpGet("api/tramites/{tramiteId}/adjuntos")]
        public async Task<IActionResult> GetAdjuntosByTramite(int tramiteId)
        {
            var adjuntos = await _sp.QueryAsync(
                "dbo.usp_Adjuntos_ListarPorTramite",
                reader => new AdjuntoItemDto
                {
                    Id = reader.GetSafeInt32("id"),
                    TramiteId = reader.GetSafeInt32("tramite_id"),
                    MovimientoId = reader.GetNullableInt32("movimiento_id"),
                    NombreOriginal = reader.GetSafeString("nombre_original"),
                    TamanoBytes = reader.GetSafeInt64("tamano_bytes"),
                    TipoMime = reader.GetSafeString("tipo_mime"),
                    SubidoPorNombre = reader.GetSafeString("subido_por_nombre"),
                    FechaSubida = reader.GetSafeDateTime("fecha_subida")
                },
                new SqlParameter("@TramiteId", SqlDbType.Int) { Value = tramiteId }
            );

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
            var adjunto = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Adjuntos_ObtenerPorId",
                reader => new AdjuntoRecord
                {
                    Id = reader.GetSafeInt32("id"),
                    RutaArchivo = reader.GetSafeString("ruta_archivo"),
                    NombreOriginal = reader.GetSafeString("nombre_original"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (adjunto == null || !adjunto.Activo)
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
            var adjunto = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Adjuntos_ObtenerPorId",
                reader => new AdjuntoRecord
                {
                    Id = reader.GetSafeInt32("id"),
                    RutaArchivo = reader.GetSafeString("ruta_archivo"),
                    NombreOriginal = reader.GetSafeString("nombre_original"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (adjunto == null || !adjunto.Activo)
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
            var adjunto = await _sp.QueryFirstOrDefaultAsync(
                "dbo.usp_Adjuntos_ObtenerPorId",
                reader => new AdjuntoRecord
                {
                    Id = reader.GetSafeInt32("id"),
                    NombreOriginal = reader.GetSafeString("nombre_original"),
                    Activo = reader.GetSafeBoolean("activo")
                },
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            if (adjunto == null || !adjunto.Activo)
            {
                return NotFound(ApiResponse.ErrorResult("Documento PDF no encontrado."));
            }

            await _sp.ExecuteNonQueryAsync(
                "dbo.usp_Adjuntos_EliminarLogico",
                new SqlParameter("@Id", SqlDbType.Int) { Value = id }
            );

            return Ok(ApiResponse.SuccessResult($"Documento '{adjunto.NombreOriginal}' eliminado exitosamente."));
        }
    }
}
