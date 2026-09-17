using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("correlativos")]
    public class Correlativo
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tipo_proceso_id")]
        public int? TipoProcesoId { get; set; }

        [Column("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [Column("gestion")]
        public int Gestion { get; set; }

        [Column("ultimo_numero")]
        public int UltimoNumero { get; set; } = 0;

        [Required]
        [MaxLength(100)]
        [Column("formato_patron")]
        public string FormatoPatron { get; set; } = "{CODIGO}-{NUMERO}/{GESTION}";

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        [ForeignKey("TipoProcesoId")]
        public virtual TipoProceso? TipoProceso { get; set; }

        [ForeignKey("UbicacionOrgId")]
        public virtual UbicacionOrg? UbicacionOrg { get; set; }
    }
}
