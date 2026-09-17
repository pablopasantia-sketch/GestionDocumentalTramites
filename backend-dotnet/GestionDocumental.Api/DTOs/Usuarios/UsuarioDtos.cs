using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Usuarios
{
    public class UsuarioListItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("persona_id")]
        public int PersonaId { get; set; }

        [JsonPropertyName("login")]
        public string Login { get; set; } = string.Empty;

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }

        [JsonPropertyName("activo")]
        public bool Activo { get; set; }

        [JsonPropertyName("nombres")]
        public string Nombres { get; set; } = string.Empty;

        [JsonPropertyName("apellido_paterno")]
        public string ApellidoPaterno { get; set; } = string.Empty;

        [JsonPropertyName("apellido_materno")]
        public string? ApellidoMaterno { get; set; }

        [JsonPropertyName("ci")]
        public string Ci { get; set; } = string.Empty;

        [JsonPropertyName("ci_expedido")]
        public string CiExpedido { get; set; } = "CH";

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("roles_resumen")]
        public string RolesResumen { get; set; } = string.Empty;
    }

    public class CreateUsuarioDto
    {
        [Required(ErrorMessage = "La persona_id es obligatoria")]
        [JsonPropertyName("persona_id")]
        public int PersonaId { get; set; }

        [Required(ErrorMessage = "El login es obligatorio")]
        [MaxLength(50)]
        [JsonPropertyName("login")]
        public string Login { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria")]
        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }
    }

    public class UpdateUsuarioDto
    {
        [JsonPropertyName("persona_id")]
        public int? PersonaId { get; set; }

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }

        [JsonPropertyName("activo")]
        public bool? Activo { get; set; }
    }

    public class ResetPasswordDto
    {
        [Required(ErrorMessage = "La nueva contraseña es requerida")]
        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        [JsonPropertyName("newPassword")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
