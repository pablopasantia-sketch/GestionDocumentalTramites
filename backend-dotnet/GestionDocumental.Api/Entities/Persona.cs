using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("personas")]
    public class Persona
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(100)]
        [Column("nombres")]
        public string Nombres { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("apellido_paterno")]
        public string ApellidoPaterno { get; set; } = string.Empty;

        [MaxLength(100)]
        [Column("apellido_materno")]
        public string? ApellidoMaterno { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("ci")]
        public string Ci { get; set; } = string.Empty;

        [Required]
        [MaxLength(5)]
        [Column("ci_expedido")]
        public string CiExpedido { get; set; } = "CH";

        [Required]
        [MaxLength(10)]
        [Column("sexo")]
        public string Sexo { get; set; } = "M";

        [MaxLength(20)]
        [Column("estado_civil")]
        public string? EstadoCivil { get; set; }

        [MaxLength(20)]
        [Column("telefono")]
        public string? Telefono { get; set; }

        [MaxLength(150)]
        [Column("email")]
        public string? Email { get; set; }

        [MaxLength(20)]
        [Column("empresa_telefonica")]
        public string? EmpresaTelefonica { get; set; }

        [MaxLength(255)]
        [Column("direccion")]
        public string? Direccion { get; set; }

        [Column("activo")]
        public bool Activo { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        public virtual ICollection<Usuario> Usuarios { get; set; } = new List<Usuario>();
    }
}
