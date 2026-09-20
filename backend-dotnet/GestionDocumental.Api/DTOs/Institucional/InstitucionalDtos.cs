using System.ComponentModel.DataAnnotations;

namespace GestionDocumental.Api.DTOs.Institucional
{
    public class CrearUnidadDto
    {
        public short? CodU { get; set; }

        [Required(ErrorMessage = "El nombre de la unidad es obligatorio")]
        [StringLength(50, ErrorMessage = "El nombre no puede exceder los 50 caracteres")]
        public string NombU { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;
    }

    public class ActualizarUnidadDto
    {
        [Required(ErrorMessage = "El nombre de la unidad es obligatorio")]
        [StringLength(50, ErrorMessage = "El nombre no puede exceder los 50 caracteres")]
        public string NombU { get; set; } = string.Empty;

        public bool Activo { get; set; } = true;
    }

    public class CrearCargoDto
    {
        public short? CodCargo { get; set; }

        [Required(ErrorMessage = "El nombre del cargo es obligatorio")]
        [StringLength(50, ErrorMessage = "El nombre del cargo no puede exceder los 50 caracteres")]
        public string NombreC { get; set; } = string.Empty;

        [Required(ErrorMessage = "El código de unidad es obligatorio")]
        public short CodU { get; set; }
    }

    public class ActualizarCargoDto
    {
        [Required(ErrorMessage = "El nombre del cargo es obligatorio")]
        [StringLength(50, ErrorMessage = "El nombre del cargo no puede exceder los 50 caracteres")]
        public string NombreC { get; set; } = string.Empty;

        [Required(ErrorMessage = "El código de unidad es obligatorio")]
        public short CodU { get; set; }
    }
}
