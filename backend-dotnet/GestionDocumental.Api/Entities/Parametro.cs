using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("parametros")]
    public class Parametro
    {
        [Key]
        [Column("id")]
        public int Id { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("clave")]
        public string Clave { get; set; } = string.Empty;

        [Required]
        [Column("valor")]
        public string Valor { get; set; } = string.Empty;

        [Required]
        [MaxLength(20)]
        [Column("tipo_dato")]
        public string TipoDato { get; set; } = "STRING";

        [MaxLength(255)]
        [Column("descripcion")]
        public string? Descripcion { get; set; }

        [Column("editable")]
        public bool Editable { get; set; } = true;

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
