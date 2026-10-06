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

        [Column("id")]
        public int Id { get; set; }

        [MaxLength(50)]
        [Column("login")]
        public string? Login { get; set; }

        [MaxLength(255)]
        [Column("password_hash")]
        public string? PasswordHash { get; set; }

        [MaxLength(100)]
        [Column("cargo_nombre")]
        public string? CargoNombre { get; set; }

        [MaxLength(255)]
        [Column("avatar_url")]
        public string? AvatarUrl { get; set; }

        [Column("cod_u")]
        public short? CodU { get; set; }

        [Column("cod_cargo")]
        public short? CodCargo { get; set; }

        [Column("created_at")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [Column("updated_at")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}
