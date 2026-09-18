using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("TUnidad")]
    public class TUnidad
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Column("CodU")]
        public short CodU { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("NombU")]
        public string NombU { get; set; } = string.Empty;

        [Column("Activo")]
        public bool Activo { get; set; } = true;

        // Relación con cargos de la unidad
        public ICollection<TCargo> Cargos { get; set; } = new List<TCargo>();
    }
}
