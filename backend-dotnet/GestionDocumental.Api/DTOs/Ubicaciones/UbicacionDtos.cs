using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Ubicaciones
{
    public class UbicacionDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("codigo")]
        public string Codigo { get; set; } = string.Empty;

        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [JsonPropertyName("sigla")]
        public string? Sigla { get; set; }

        [JsonPropertyName("padre_id")]
        public int? PadreId { get; set; }

        [JsonPropertyName("padre_nombre")]
        public string? PadreNombre { get; set; }

        [JsonPropertyName("padre_sigla")]
        public string? PadreSigla { get; set; }

        [JsonPropertyName("nivel")]
        public int Nivel { get; set; } = 1;

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }

        [JsonPropertyName("activo")]
        public bool Activo { get; set; }

        [JsonPropertyName("total_usuarios")]
        public int TotalUsuarios { get; set; }
    }

    public class UbicacionArbolNodeDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("codigo")]
        public string Codigo { get; set; } = string.Empty;

        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [JsonPropertyName("sigla")]
        public string? Sigla { get; set; }

        [JsonPropertyName("padre_id")]
        public int? PadreId { get; set; }

        [JsonPropertyName("nivel")]
        public int Nivel { get; set; }

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }

        [JsonPropertyName("hijos")]
        public List<UbicacionArbolNodeDto> Hijos { get; set; } = new();
    }

    public class CreateUbicacionDto
    {
        [Required(ErrorMessage = "El código es obligatorio")]
        [MaxLength(20)]
        [JsonPropertyName("codigo")]
        public string Codigo { get; set; } = string.Empty;

        [Required(ErrorMessage = "El nombre es obligatorio")]
        [MaxLength(150)]
        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [JsonPropertyName("sigla")]
        public string? Sigla { get; set; }

        [JsonPropertyName("padre_id")]
        public int? PadreId { get; set; }

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }
    }

    public class UpdateUbicacionDto
    {
        [JsonPropertyName("codigo")]
        public string? Codigo { get; set; }

        [JsonPropertyName("nombre")]
        public string? Nombre { get; set; }

        [JsonPropertyName("sigla")]
        public string? Sigla { get; set; }

        [JsonPropertyName("padre_id")]
        public int? PadreId { get; set; }

        [JsonPropertyName("descripcion")]
        public string? Descripcion { get; set; }

        [JsonPropertyName("activo")]
        public bool? Activo { get; set; }
    }
}
