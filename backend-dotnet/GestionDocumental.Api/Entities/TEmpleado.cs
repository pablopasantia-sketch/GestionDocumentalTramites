using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GestionDocumental.Api.Entities
{
    [Table("TEmpleados")]
    public class TEmpleado
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.None)]
        [Column("CI")]
        public int CI { get; set; }

        [Required]
        [MaxLength(50)]
        [Column("Apellidos")]
        public string Apellidos { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("Nombres")]
        public string Nombres { get; set; } = string.Empty;

        [Required]
        [MaxLength(50)]
        [Column("Direccion")]
        public string Direccion { get; set; } = string.Empty;

        [Column("Cel")]
        public int Cel { get; set; }

        [MaxLength(50)]
        [Column("Email")]
        public string? Email { get; set; }

        [Column("Activo")]
        public bool Activo { get; set; } = true;
    }
}
