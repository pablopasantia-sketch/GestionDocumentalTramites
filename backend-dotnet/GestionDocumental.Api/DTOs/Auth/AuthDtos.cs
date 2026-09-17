using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Auth
{
    public class LoginRequest
    {
        [Required(ErrorMessage = "El nombre de usuario es obligatorio")]
        [JsonPropertyName("login")]
        public string Login { get; set; } = string.Empty;

        [Required(ErrorMessage = "La contraseña es obligatoria")]
        [JsonPropertyName("password")]
        public string Password { get; set; } = string.Empty;

        [JsonPropertyName("rolId")]
        public int? RolId { get; set; }

        [JsonPropertyName("ubicacionOrgId")]
        public int? UbicacionOrgId { get; set; }
    }

    public class ChangePasswordRequest
    {
        [Required(ErrorMessage = "La contraseña actual es requerida")]
        [JsonPropertyName("currentPassword")]
        public string CurrentPassword { get; set; } = string.Empty;

        [Required(ErrorMessage = "La nueva contraseña es requerida")]
        [MinLength(6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres")]
        [JsonPropertyName("newPassword")]
        public string NewPassword { get; set; } = string.Empty;

        [JsonPropertyName("confirmPassword")]
        public string? ConfirmPassword { get; set; }
    }

    public class SwitchRoleRequest
    {
        [Required(ErrorMessage = "El rol_id es obligatorio")]
        [JsonPropertyName("rolId")]
        public int RolId { get; set; }

        [Required(ErrorMessage = "La ubicacion_org_id es obligatoria")]
        [JsonPropertyName("ubicacionOrgId")]
        public int UbicacionOrgId { get; set; }
    }

    public class AuthResponse
    {
        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;

        [JsonPropertyName("user")]
        public UserDto User { get; set; } = null!;
    }

    public class SwitchRoleResponse
    {
        [JsonPropertyName("token")]
        public string Token { get; set; } = string.Empty;

        [JsonPropertyName("activeRole")]
        public ActiveRoleDto ActiveRole { get; set; } = null!;
    }

    public class UserDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("persona_id")]
        public int PersonaId { get; set; }

        [JsonPropertyName("nombres")]
        public string Nombres { get; set; } = string.Empty;

        [JsonPropertyName("apellidos")]
        public string Apellidos { get; set; } = string.Empty;

        [JsonPropertyName("ci")]
        public string Ci { get; set; } = string.Empty;

        [JsonPropertyName("login")]
        public string Login { get; set; } = string.Empty;

        [JsonPropertyName("username")]
        public string Username { get; set; } = string.Empty;

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }

        [JsonPropertyName("roles")]
        public List<RoleAssignmentDto> Roles { get; set; } = new();

        [JsonPropertyName("activeRole")]
        public ActiveRoleDto? ActiveRole { get; set; }
    }

    public class RoleAssignmentDto
    {
        [JsonPropertyName("rol_id")]
        public int RolId { get; set; }

        [JsonPropertyName("rol_codigo")]
        public string RolCodigo { get; set; } = string.Empty;

        [JsonPropertyName("rol_nombre")]
        public string RolNombre { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_org_id")]
        public int UbicacionOrgId { get; set; }

        [JsonPropertyName("ubicacion_nombre")]
        public string UbicacionNombre { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_sigla")]
        public string? UbicacionSigla { get; set; }

        [JsonPropertyName("es_principal")]
        public bool EsPrincipal { get; set; }

        [JsonPropertyName("nivel_acceso")]
        public string NivelAcceso { get; set; } = "CONTROL_TOTAL";
    }

    public class ActiveRoleDto
    {
        [JsonPropertyName("rol_id")]
        public int RolId { get; set; }

        [JsonPropertyName("rol_codigo")]
        public string RolCodigo { get; set; } = string.Empty;

        [JsonPropertyName("rol_nombre")]
        public string RolNombre { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_org_id")]
        public int UbicacionOrgId { get; set; }

        [JsonPropertyName("ubicacion_nombre")]
        public string UbicacionNombre { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_sigla")]
        public string? UbicacionSigla { get; set; }

        [JsonPropertyName("nivel_acceso")]
        public string NivelAcceso { get; set; } = "CONTROL_TOTAL";
    }
}
