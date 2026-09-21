using System;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Adjuntos
{
    public class AdjuntoItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("tramite_id")]
        public int TramiteId { get; set; }

        [JsonPropertyName("movimiento_id")]
        public int? MovimientoId { get; set; }

        [JsonPropertyName("nombre_original")]
        public string NombreOriginal { get; set; } = string.Empty;

        [JsonPropertyName("tamano_bytes")]
        public long TamanoBytes { get; set; }

        [JsonPropertyName("tamano_legible")]
        public string TamanoLegible
        {
            get
            {
                if (TamanoBytes >= 1024 * 1024)
                    return $"{(TamanoBytes / (1024.0 * 1024.0)):F2} MB";
                if (TamanoBytes >= 1024)
                    return $"{(TamanoBytes / 1024.0):F1} KB";
                return $"{TamanoBytes} B";
            }
        }

        [JsonPropertyName("tipo_mime")]
        public string TipoMime { get; set; } = "application/pdf";

        [JsonPropertyName("subido_por_nombre")]
        public string SubidoPorNombre { get; set; } = string.Empty;

        [JsonPropertyName("fecha_subida")]
        public DateTime FechaSubida { get; set; }

        [JsonPropertyName("descargar_url")]
        public string DescargarUrl => $"/api/adjuntos/{Id}/descargar";

        [JsonPropertyName("ver_url")]
        public string VerUrl => $"/api/adjuntos/{Id}/ver";
    }
}
