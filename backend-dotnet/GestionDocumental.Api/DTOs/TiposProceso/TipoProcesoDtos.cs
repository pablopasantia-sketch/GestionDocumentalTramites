using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.TiposProceso
{
    public class TipoProcesoDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("codigo")]
        public string Codigo { get; set; } = string.Empty;

        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }

        [JsonPropertyName("tipo_categoria")]
        public string TipoCategoria { get; set; } = "TRAMITE";

        [JsonPropertyName("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [JsonPropertyName("ubicacion_codigo")]
        public string? UbicacionCodigo { get; set; }

        [JsonPropertyName("ubicacion_nombre")]
        public string? UbicacionNombre { get; set; }

        [JsonPropertyName("ubicacion_sigla")]
        public string? UbicacionSigla { get; set; }

        [JsonPropertyName("correlativo_seq")]
        public int CorrelativoSeq { get; set; }

        [JsonPropertyName("tiempo_estimado_horas")]
        public int TiempoEstimadoHoras { get; set; } = 24;

        [JsonPropertyName("activo")]
        public bool Activo { get; set; }
    }

    public class CreateTipoProcesoDto
    {
        [Required(ErrorMessage = "El código es obligatorio")]
        [MaxLength(20)]
        [JsonPropertyName("codigo")]
        public string Codigo { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre es obligatorio")]
        [MaxLength(150)]
        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }

        [JsonPropertyName("tipo_categoria")]
        public string TipoCategoria { get; set; } = "TRAMITE";

        [JsonPropertyName("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [JsonPropertyName("tiempo_estimado_horas")]
        public int TiempoEstimadoHoras { get; set; } = 24;
    }

    public class UpdateTipoProcesoDto
    {
        [JsonPropertyName("codigo")]
        public string? Codigo { get; set; }

        [JsonPropertyName("nombre")]
        public string? Nombre { get; set; }

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }

        [JsonPropertyName("tipo_categoria")]
        public string? TipoCategoria { get; set; }

        [JsonPropertyName("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [JsonPropertyName("tiempo_estimado_horas")]
        public int? TiempoEstimadoHoras { get; set; }

        [JsonPropertyName("activo")]
        public bool? Activo { get; set; }
    }
}
