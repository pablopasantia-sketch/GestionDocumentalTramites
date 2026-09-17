using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("tramites")]
    public class Tramite
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("numero_correlativo")]
        public string NumeroCorrelativo { get; set; } = string.Empty;

        [Column("gestion")]
        public int Gestion { get; set; }

        [Column("tipo_proceso_id")]
        public int TipoProcesoId { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("estado")]
        public string Estado { get; set; } = "EN_ATENCION";

        [Required]
        [MaxLength(200)]
        [Column("remitente")]
        public string Remitente { get; set; } = string.Empty;

        [Required]
        [Column("referencia")]
        public string Referencia { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("tipo_corres")]
        public string TipoCorres { get; set; } = "INTERNO";

        [Column("nro_hojas")]
        public int NroHojas { get; set; } = 1;

        [Column("nro_anexos")]
        public int NroAnexos { get; set; } = 0;

        [MaxLength(255)]
        [Column("instruccion")]
        public string? Instruccion { get; set; }

        [Required]
        [MaxLength(20)]
        [Column("prioridad")]
        public string Prioridad { get; set; } = "NORMAL";

        [Column("primer_destinatario_id")]
        public int? PrimerDestinatarioId { get; set; }

        [Column("otros_destinatarios_json", TypeName = "json")]
        public string? OtrosDestinatariosJson { get; set; }

        [Column("fecha_creacion")]
        public DateTime FechaCreacion { get; set; } = DateTime.UtcNow;

        [Column("fecha_conclusion")]
        public DateTime? FechaConclusion { get; set; }

        [Column("fecha_limite_respuesta")]
        public DateTime? FechaLimiteRespuesta { get; set; }

        [Column("creado_por")]
        public int CreadoPor { get; set; }

        [Column("ubicacion_org_id")]
        public int UbicacionOrgId { get; set; }

        [Column("usuario_actual_id")]
        public int? UsuarioActualId { get; set; }

        [Column("ubicacion_actual_id")]
        public int? UbicacionActualId { get; set; }

        [Column("motivo_bloqueo")]
        public string? MotivoBloqueo { get; set; }

        [Column("motivo_anulacion")]
        public string? MotivoAnulacion { get; set; }

        [Column("activo")]
        public bool Activo { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        [ForeignKey("TipoProcesoId")]
        public virtual TipoProceso TipoProceso { get; set; } = null!;

        [ForeignKey("CreadoPor")]
        public virtual Usuario CreadoPorUsuario { get; set; } = null!;

        [ForeignKey("UbicacionOrgId")]
        public virtual UbicacionOrg UbicacionOrg { get; set; } = null!;

        [ForeignKey("UsuarioActualId")]
        public virtual Usuario? UsuarioActual { get; set; }

        [ForeignKey("UbicacionActualId")]
        public virtual UbicacionOrg? UbicacionActual { get; set; }

        [ForeignKey("PrimerDestinatarioId")]
        public virtual Usuario? PrimerDestinatario { get; set; }

        public virtual ICollection<Movimiento> Movimientos { get; set; } = new List<Movimiento>();
        public virtual ICollection<Adjunto> Adjuntos { get; set; } = new List<Adjunto>();
    }
}
