using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("ubicaciones_org")]
    public class UbicacionOrg
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("codigo")]
        public string Codigo { get; set; } = string.Empty;

        [Required]
        [MaxLength(150)]
        [Column("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [MaxLength(30)]
        [Column("sigla")]
        public string? Sigla { get; set; }

        [Column("padre_id")]
        public int? PadreId { get; set; }

        [Column("nivel")]
        public int Nivel { get; set; } = 1;

        [MaxLength(255)]
        [Column("descripcion")]
        public string? Descripcion { get; set; }

        [Column("activo")]
        public bool Activo { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Jerarquía recursiva
        [ForeignKey("PadreId")]
        public virtual UbicacionOrg? Padre { get; set; }

        public virtual ICollection<UbicacionOrg> Hijos { get; set; } = new List<UbicacionOrg>();
        public virtual ICollection<UsuarioRol> UsuarioRoles { get; set; } = new List<UsuarioRol>();
    }
}
