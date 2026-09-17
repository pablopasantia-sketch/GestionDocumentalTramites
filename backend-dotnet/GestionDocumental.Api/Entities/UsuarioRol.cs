using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("usuario_roles")]
    public class UsuarioRol
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("usuario_id")]
        public int UsuarioId { get; set; }

        [Column("rol_id")]
        public int RolId { get; set; }

        [Column("ubicacion_org_id")]
        public int UbicacionOrgId { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("nivel_acceso")]
        public string NivelAcceso { get; set; } = "CONTROL_TOTAL";

        [Column("fecha_expiracion")]
        public DateTime? FechaExpiracion { get; set; }

        [Column("es_principal")]
        public bool EsPrincipal { get; set; } = false;

        [Column("activo")]
        public bool Activo { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        [ForeignKey("UsuarioId")]
        public virtual Usuario Usuario { get; set; } = null!;

        [ForeignKey("RolId")]
        public virtual Rol Rol { get; set; } = null!;

        [ForeignKey("UbicacionOrgId")]
        public virtual UbicacionOrg UbicacionOrg { get; set; } = null!;
    }
}
