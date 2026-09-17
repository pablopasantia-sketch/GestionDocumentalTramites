using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Tramites
{
    public class TramiteConsultaPublicaDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("numero_correlativo")]
        public string NumeroCorrelativo { get; set; } = string.Empty;

        [JsonPropertyName("gestion")]
        public int Gestion { get; set; }

        [JsonPropertyName("tipo_proceso")]
        public string TipoProceso { get; set; } = string.Empty;

        [JsonPropertyName("tipo_categoria")]
        public string TipoCategoria { get; set; } = string.Empty;

        [JsonPropertyName("referencia")]
        public string Referencia { get; set; } = string.Empty;

        [JsonPropertyName("remitente")]
        public string Remitente { get; set; } = string.Empty;

        [JsonPropertyName("estado")]
        public string Estado { get; set; } = string.Empty;

        [JsonPropertyName("prioridad")]
        public string Prioridad { get; set; } = string.Empty;

        [JsonPropertyName("nro_hojas")]
        public int NroHojas { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [JsonPropertyName("fecha_conclusion")]
        public DateTime? FechaConclusion { get; set; }

        [JsonPropertyName("ubicacion_actual")]
        public string UbicacionActual { get; set; } = string.Empty;

        [JsonPropertyName("unidad_origen")]
        public string UnidadOrigen { get; set; } = string.Empty;

        [JsonPropertyName("historial")]
        public List<MovimientoTimelineDto> Historial { get; set; } = new();
    }

    public class MovimientoTimelineDto
    {
        [JsonPropertyName("orden")]
        public int Orden { get; set; }

        [JsonPropertyName("actividad")]
        public string Actividad { get; set; } = string.Empty;

        [JsonPropertyName("tipo_movimiento")]
        public string TipoMovimiento { get; set; } = string.Empty;

        [JsonPropertyName("unidad_origen")]
        public string UnidadOrigen { get; set; } = string.Empty;

        [JsonPropertyName("unidad_destino")]
        public string? UnidadDestino { get; set; }

        [JsonPropertyName("estado")]
        public string Estado { get; set; } = string.Empty;

        [JsonPropertyName("proveido")]
        public string? Proveido { get; set; }

        [JsonPropertyName("fecha")]
        public DateTime Fecha { get; set; }
    }

    public class TramiteListItemDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("numero_correlativo")]
        public string NumeroCorrelativo { get; set; } = string.Empty;

        [JsonPropertyName("gestion")]
        public int Gestion { get; set; }

        [JsonPropertyName("tipo_proceso_id")]
        public int TipoProcesoId { get; set; }

        [JsonPropertyName("tipo_proceso_nombre")]
        public string TipoProcesoNombre { get; set; } = string.Empty;

        [JsonPropertyName("tipo_corres")]
        public string TipoCorres { get; set; } = string.Empty;

        [JsonPropertyName("remitente")]
        public string Remitente { get; set; } = string.Empty;

        [JsonPropertyName("referencia")]
        public string Referencia { get; set; } = string.Empty;

        [JsonPropertyName("prioridad")]
        public string Prioridad { get; set; } = string.Empty;

        [JsonPropertyName("nro_hojas")]
        public int NroHojas { get; set; }

        [JsonPropertyName("estado")]
        public string Estado { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_actual_nombre")]
        public string? UbicacionActualNombre { get; set; }

        [JsonPropertyName("usuario_actual_login")]
        public string? UsuarioActualLogin { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }
    }

    public class TramiteStatsDto
    {
        [JsonPropertyName("gestion")]
        public int Gestion { get; set; }

        [JsonPropertyName("total")]
        public int Total { get; set; }

        [JsonPropertyName("creados")]
        public int Creados { get; set; }

        [JsonPropertyName("en_atencion")]
        public int EnAtencion { get; set; }

        [JsonPropertyName("en_transito")]
        public int EnTransito { get; set; }

        [JsonPropertyName("recibidos")]
        public int Recibidos { get; set; }

        [JsonPropertyName("bloqueados")]
        public int Bloqueados { get; set; }

        [JsonPropertyName("concluidos")]
        public int Concluidos { get; set; }

        [JsonPropertyName("anulados")]
        public int Anulados { get; set; }
    }

    public class AnularTramiteDto
    {
        [Required(ErrorMessage = "El motivo de anulación es obligatorio")]
        [MinLength(5, ErrorMessage = "El motivo debe contener al menos 5 caracteres")]
        [JsonPropertyName("motivo")]
        public string Motivo { get; set; } = string.Empty;
    }
}
