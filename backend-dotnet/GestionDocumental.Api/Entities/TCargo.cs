using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("TCargo")]
    public class TCargo
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Column("CodCargo")]
        public short CodCargo { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("NombreC")]
        public string NombreC { get; set; } = string.Empty;

        [Column("CodU")]
        public short CodU { get; set; }

        [ForeignKey(nameof(CodU))]
        public TUnidad? Unidad { get; set; }
    }
}
