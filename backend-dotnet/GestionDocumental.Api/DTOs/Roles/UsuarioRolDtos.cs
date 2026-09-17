using System;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Roles
{
    public class AssignRoleDto
    {
        [Required]
        [JsonPropertyName("usuario_id")]
        public int UsuarioId { get; set; }

        [Required]
        [JsonPropertyName("rol_id")]
        public int RolId { get; set; }

        [Required]
        [JsonPropertyName("ubicacion_org_id")]
        public int UbicacionOrgId { get; set; }

        [JsonPropertyName("nivel_acceso")]
        public string NivelAcceso { get; set; } = "CONTROL_TOTAL";

        [JsonPropertyName("fecha_expiracion")]
        public DateTime? FechaExpiracion { get; set; }

        [JsonPropertyName("es_principal")]
        public bool EsPrincipal { get; set; } = false;
    }

    public class UsuarioRolItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("usuario_id")]
        public int UsuarioId { get; set; }

        [JsonPropertyName("rol_id")]
        public int RolId { get; set; }

        [JsonPropertyName("rol_codigo")]
        public string RolCodigo { get; set; } = string.Empty;

        [JsonPropertyName("rol_nombre")]
        public string RolNombre { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_org_id")]
        public int UbicacionOrgId { get; set; }

        [JsonPropertyName("ubicacion_codigo")]
        public string UbicacionCodigo { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_nombre")]
        public string UbicacionNombre { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_sigla")]
        public string? UbicacionSigla { get; set; }

        [JsonPropertyName("nivel_acceso")]
        public string NivelAcceso { get; set; } = string.Empty;

        [JsonPropertyName("fecha_expiracion")]
        public DateTime? FechaExpiracion { get; set; }

        [JsonPropertyName("es_principal")]
        public bool EsPrincipal { get; set; }

        [JsonPropertyName("activo")]
        public bool Activo { get; set; }
    }
}
