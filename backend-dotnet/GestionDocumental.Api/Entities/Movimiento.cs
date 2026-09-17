using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("movimientos")]
    public class Movimiento
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tramite_id")]
        public int TramiteId { get; set; }

        [Column("orden")]
        public int Orden { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("tipo_movimiento")]
        public string TipoMovimiento { get; set; } = "INICIO";

        [Required]
        [MaxLength(150)]
        [Column("actividad_nombre")]
        public string ActividadNombre { get; set; } = "Registro Inicial";

        [Column("usuario_origen_id")]
        public int UsuarioOrigenId { get; set; }

        [Column("ubicacion_origen_id")]
        public int UbicacionOrigenId { get; set; }

        [Column("usuario_destino_id")]
        public int? UsuarioDestinoId { get; set; }

        [Column("ubicacion_destino_id")]
        public int? UbicacionDestinoId { get; set; }

        [Required]
        [MaxLength(30)]
        [Column("estado_movimiento")]
        public string EstadoMovimiento { get; set; } = "EN_ATENCION";

        [Column("proveido")]
        public string? Proveido { get; set; }

        [MaxLength(255)]
        [Column("instruccion")]
        public string? Instruccion { get; set; }

        [Column("justificacion_retroceso")]
        public string? JustificacionRetroceso { get; set; }

        [Column("tiempo_estimado_minutos")]
        public int? TiempoEstimadoMinutos { get; set; }

        [Column("fecha_envio")]
        public DateTime? FechaEnvio { get; set; }

        [Column("fecha_recepcion")]
        public DateTime? FechaRecepcion { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        [ForeignKey("TramiteId")]
        public virtual Tramite Tramite { get; set; } = null!;

        [ForeignKey("UsuarioOrigenId")]
        public virtual Usuario UsuarioOrigen { get; set; } = null!;

        [ForeignKey("UbicacionOrigenId")]
        public virtual UbicacionOrg UbicacionOrigen { get; set; } = null!;

        [ForeignKey("UsuarioDestinoId")]
        public virtual Usuario? UsuarioDestino { get; set; }

        [ForeignKey("UbicacionDestinoId")]
        public virtual UbicacionOrg? UbicacionDestino { get; set; }
    }
}
