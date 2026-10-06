using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using GestionDocumental.Api.DTOs.Roles;

namespace GestionDocumental.Api.DTOs.Usuarios
{
    public class UsuarioListItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("persona_id")]
        public int PersonaId { get; set; }

        [JsonPropertyName("login")]
        public string? Login { get; set; }

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

        [JsonPropertyName("cel")]
        public string? Cel { get; set; }

        [JsonPropertyName("direccion")]
        public string? Direccion { get; set; }

        [JsonPropertyName("cod_u")]
        public short? CodU { get; set; }

        [JsonPropertyName("unidad_nombre")]
        public string? UnidadNombre { get; set; }

        [JsonPropertyName("cod_cargo")]
        public short? CodCargo { get; set; }

        [JsonPropertyName("cargo_oficial")]
        public string? CargoOficial { get; set; }

        [JsonPropertyName("roles_resumen")]
        public string RolesResumen { get; set; } = string.Empty;

        [JsonPropertyName("roles")]
        public List<UsuarioRolItemDto> Roles { get; set; } = new();
    }

    public class CreateUsuarioDto
    {
        [JsonPropertyName("persona_id")]
        public int? PersonaId { get; set; }

        [JsonPropertyName("ci")]
        public int? Ci { get; set; }

        [JsonPropertyName("nombres")]
        public string? Nombres { get; set; }

        [JsonPropertyName("apellidos")]
        public string? Apellidos { get; set; }

        [JsonPropertyName("cel")]
        public int? Cel { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("direccion")]
        public string? Direccion { get; set; }

        [JsonPropertyName("cod_u")]
        public short? CodU { get; set; }

        [JsonPropertyName("cod_cargo")]
        public short? CodCargo { get; set; }

        [MaxLength(50)]
        [JsonPropertyName("login")]
        public string? Login { get; set; }

        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }

        [JsonPropertyName("roles_ids")]
        public List<int>? RolesIds { get; set; }
    }

    public class UpdateUsuarioDto
    {
        [JsonPropertyName("persona_id")]
        public int? PersonaId { get; set; }

        [JsonPropertyName("ci")]
        public int? Ci { get; set; }

        [JsonPropertyName("nombres")]
        public string? Nombres { get; set; }

        [JsonPropertyName("apellidos")]
        public string? Apellidos { get; set; }

        [JsonPropertyName("cel")]
        public int? Cel { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("direccion")]
        public string? Direccion { get; set; }

        [JsonPropertyName("cod_u")]
        public short? CodU { get; set; }

        [JsonPropertyName("cod_cargo")]
        public short? CodCargo { get; set; }

        [MaxLength(50)]
        [JsonPropertyName("login")]
        public string? Login { get; set; }

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }

        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        [JsonPropertyName("password")]
        public string? Password { get; set; }

        [JsonPropertyName("activo")]
        public bool? Activo { get; set; }

        [JsonPropertyName("roles_ids")]
        public List<int>? RolesIds { get; set; }
    }

    public class ResetPasswordDto
    {
        [Required(ErrorMessage = "La nueva contraseña es requerida")]
        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        [JsonPropertyName("newPassword")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
