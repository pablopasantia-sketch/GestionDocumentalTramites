using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Personas
{
    public class PersonaDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

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

        [JsonPropertyName("sexo")]
        public string Sexo { get; set; } = "M";

        [JsonPropertyName("estado_civil")]
        public string? EstadoCivil { get; set; }

        [JsonPropertyName("telefono")]
        public string? Telefono { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("empresa_telefonica")]
        public string? EmpresaTelefonica { get; set; }

        [JsonPropertyName("direccion")]
        public string? Direccion { get; set; }

        [JsonPropertyName("activo")]
        public bool Activo { get; set; }
    }

    public class CreatePersonaDto
    {
        [Required(ErrorMessage = "El nombre es obligatorio")]
        [JsonPropertyName("nombres")]
        public string Nombres { get; set; } = string.Empty;

        [Required(ErrorMessage = "El apellido paterno es obligatorio")]
        [JsonPropertyName("apellido_paterno")]
        public string ApellidoPaterno { get; set; } = string.Empty;

        [JsonPropertyName("apellido_materno")]
        public string? ApellidoMaterno { get; set; }

        [Required(ErrorMessage = "El CI es obligatorio")]
        [JsonPropertyName("ci")]
        public string Ci { get; set; } = string.Empty;

        [JsonPropertyName("ci_expedido")]
        public string CiExpedido { get; set; } = "CH";

        [JsonPropertyName("sexo")]
        public string Sexo { get; set; } = "M";

        [JsonPropertyName("estado_civil")]
        public string? EstadoCivil { get; set; }

        [JsonPropertyName("telefono")]
        public string? Telefono { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("empresa_telefonica")]
        public string? EmpresaTelefonica { get; set; }

        [JsonPropertyName("direccion")]
        public string? Direccion { get; set; }
    }

    public class UpdatePersonaDto
    {
        [JsonPropertyName("nombres")]
        public string? Nombres { get; set; }

        [JsonPropertyName("apellido_paterno")]
        public string? ApellidoPaterno { get; set; }

        [JsonPropertyName("apellido_materno")]
        public string? ApellidoMaterno { get; set; }

        [JsonPropertyName("ci")]
        public string? Ci { get; set; }

        [JsonPropertyName("ci_expedido")]
        public string? CiExpedido { get; set; }

        [JsonPropertyName("sexo")]
        public string? Sexo { get; set; }

        [JsonPropertyName("estado_civil")]
        public string? EstadoCivil { get; set; }

        [JsonPropertyName("telefono")]
        public string? Telefono { get; set; }

        [JsonPropertyName("email")]
        public string? Email { get; set; }

        [JsonPropertyName("empresa_telefonica")]
        public string? EmpresaTelefonica { get; set; }

        [JsonPropertyName("direccion")]
        public string? Direccion { get; set; }
    }
}
