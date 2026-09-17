using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("tipos_proceso")]
    public class TipoProceso
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

        [Column("descripcion")]
        public string? Descripcion { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("tipo_categoria")]
        public string TipoCategoria { get; set; } = "TRAMITE"; // TRAMITE o CORRESPONDENCIA

        [Column("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [Column("correlativo_seq")]
        public int CorrelativoSeq { get; set; } = 0;

        [Column("tiempo_estimado_horas")]
        public int TiempoEstimadoHoras { get; set; } = 24;

        [Column("activo")]
        public bool Activo { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        [ForeignKey("UbicacionOrgId")]
        public virtual UbicacionOrg? UbicacionOrg { get; set; }

        public virtual ICollection<Tramite> Tramites { get; set; } = new List<Tramite>();
    }
}
