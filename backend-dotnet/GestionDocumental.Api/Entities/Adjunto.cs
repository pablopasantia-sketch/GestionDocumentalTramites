using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("adjuntos")]
    public class Adjunto
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Column("tramite_id")]
        public int TramiteId { get; set; }

        [Column("movimiento_id")]
        public int? MovimientoId { get; set; }

        [Required]
        [MaxLength(255)]
        [Column("nombre_original")]
        public string NombreOriginal { get; set; } = string.Empty;

        [Required]
        [MaxLength(255)]
        [Column("nombre_almacenado")]
        public string NombreAlmacenado { get; set; } = string.Empty;

        [Required]
        [MaxLength(100)]
        [Column("mime_type")]
        public string MimeType { get; set; } = "application/pdf";

        [Column("tamano_bytes")]
        public long TamanoBytes { get; set; }

        [Required]
        [MaxLength(500)]
        [Column("ruta_archivo")]
        public string RutaArchivo { get; set; } = string.Empty;

        [MaxLength(64)]
        [Column("hash_sha256")]
        public string? HashSha256 { get; set; }

        [Column("subido_por")]
        public int SubidoPor { get; set; }

        [Column("activo")]
        public bool Activo { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Relaciones
        [ForeignKey("TramiteId")]
        public virtual Tramite Tramite { get; set; } = null!;

        [ForeignKey("MovimientoId")]
        public virtual Movimiento? Movimiento { get; set; }

        [ForeignKey("SubidoPor")]
        public virtual Usuario SubidoPorUsuario { get; set; } = null!;
    }
}
