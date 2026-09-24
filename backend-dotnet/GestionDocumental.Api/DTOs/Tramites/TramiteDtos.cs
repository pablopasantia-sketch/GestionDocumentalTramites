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

        [JsonPropertyName("nro_adjuntos")]
        public int NroAdjuntos { get; set; }
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

    public class CreateTramiteExternoDto
    {
        [Required(ErrorMessage = "El tipo de proceso externo es obligatorio")]
        [JsonPropertyName("tipo_proceso_id")]
        public int TipoProcesoId { get; set; }

        [Required(ErrorMessage = "El nombre o entidad del remitente es obligatorio")]
        [MaxLength(200, ErrorMessage = "El remitente no puede exceder 200 caracteres")]
        [JsonPropertyName("remitente")]
        public string Remitente { get; set; } = string.Empty;

        [MaxLength(200, ErrorMessage = "La institución remitente no puede exceder 200 caracteres")]
        [JsonPropertyName("institucion_remitente")]
        public string? InstitucionRemitente { get; set; }

        [MaxLength(100, ErrorMessage = "El CITE externo no puede exceder 100 caracteres")]
        [JsonPropertyName("cite_externo")]
        public string? CiteExterno { get; set; }

        [Required(ErrorMessage = "La referencia o síntesis es obligatoria")]
        [JsonPropertyName("referencia")]
        public string Referencia { get; set; } = string.Empty;

        [JsonPropertyName("prioridad")]
        public string Prioridad { get; set; } = "NORMAL";

        [Range(1, 10000, ErrorMessage = "El número de hojas debe ser al menos 1")]
        [JsonPropertyName("nro_hojas")]
        public int NroHojas { get; set; } = 1;

        [Range(0, 10000, ErrorMessage = "El número de anexos debe ser 0 o mayor")]
        [JsonPropertyName("nro_anexos")]
        public int NroAnexos { get; set; } = 0;

        [MaxLength(255)]
        [JsonPropertyName("instruccion")]
        public string? Instruccion { get; set; }

        [JsonPropertyName("proveido_inicial")]
        public string? ProveidoInicial { get; set; }

        // Destinatario Institucional (DB_TRAMITES_EXTERNOS / TUnidad, TCargo, TEmpleados)
        [JsonPropertyName("cod_u_destino")]
        public short? CodUDestino { get; set; }

        [JsonPropertyName("cod_cargo_destino")]
        public short? CodCargoDestino { get; set; }

        [JsonPropertyName("ci_empleado_destino")]
        public int? CiEmpleadoDestino { get; set; }

        [JsonPropertyName("destinatario_nombre")]
        public string? DestinatarioNombre { get; set; }

        [JsonPropertyName("destinatario_cargo")]
        public string? DestinatarioCargo { get; set; }

        [JsonPropertyName("destinatario_unidad")]
        public string? DestinatarioUnidad { get; set; }

        [JsonPropertyName("primer_destinatario_id")]
        public int? PrimerDestinatarioId { get; set; }
    }

    public class NextCorrelativoPreviewDto
    {
        [JsonPropertyName("numero_correlativo")]
        public string NumeroCorrelativo { get; set; } = string.Empty;

        [JsonPropertyName("gestion")]
        public int Gestion { get; set; }

        [JsonPropertyName("codigo_tipo")]
        public string CodigoTipo { get; set; } = string.Empty;

        [JsonPropertyName("nombre_tipo")]
        public string NombreTipo { get; set; } = string.Empty;

        [JsonPropertyName("tiempo_estimado_horas")]
        public int TiempoEstimadoHoras { get; set; }
    }

    public class TramiteDetalleCompletoDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("numero_correlativo")]
        public string NumeroCorrelativo { get; set; } = string.Empty;

        [JsonPropertyName("gestion")]
        public int Gestion { get; set; }

        [JsonPropertyName("tipo_proceso_id")]
        public int TipoProcesoId { get; set; }

        [JsonPropertyName("tipo_proceso_codigo")]
        public string TipoProcesoCodigo { get; set; } = string.Empty;

        [JsonPropertyName("tipo_proceso_nombre")]
        public string TipoProcesoNombre { get; set; } = string.Empty;

        [JsonPropertyName("tipo_categoria")]
        public string TipoCategoria { get; set; } = string.Empty;

        [JsonPropertyName("estado")]
        public string Estado { get; set; } = string.Empty;

        [JsonPropertyName("remitente")]
        public string Remitente { get; set; } = string.Empty;

        [JsonPropertyName("institucion_remitente")]
        public string? InstitucionRemitente { get; set; }

        [JsonPropertyName("cite_externo")]
        public string? CiteExterno { get; set; }

        [JsonPropertyName("referencia")]
        public string Referencia { get; set; } = string.Empty;

        [JsonPropertyName("prioridad")]
        public string Prioridad { get; set; } = string.Empty;

        [JsonPropertyName("nro_hojas")]
        public int NroHojas { get; set; }

        [JsonPropertyName("nro_anexos")]
        public int NroAnexos { get; set; }

        [JsonPropertyName("instruccion")]
        public string? Instruccion { get; set; }

        [JsonPropertyName("destinatario_nombre")]
        public string? DestinatarioNombre { get; set; }

        [JsonPropertyName("destinatario_cargo")]
        public string? DestinatarioCargo { get; set; }

        [JsonPropertyName("destinatario_unidad")]
        public string? DestinatarioUnidad { get; set; }

        [JsonPropertyName("cod_u_destino")]
        public short? CodUDestino { get; set; }

        [JsonPropertyName("cod_cargo_destino")]
        public short? CodCargoDestino { get; set; }

        [JsonPropertyName("ci_empleado_destino")]
        public int? CiEmpleadoDestino { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [JsonPropertyName("fecha_limite_respuesta")]
        public DateTime? FechaLimiteRespuesta { get; set; }

        [JsonPropertyName("creado_por_usuario")]
        public string CreadoPorUsuario { get; set; } = string.Empty;

        [JsonPropertyName("unidad_origen")]
        public string UnidadOrigen { get; set; } = string.Empty;

        [JsonPropertyName("historial")]
        public List<MovimientoTimelineDto> Historial { get; set; } = new();

        [JsonPropertyName("adjuntos")]
        public List<GestionDocumental.Api.DTOs.Adjuntos.AdjuntoItemDto> Adjuntos { get; set; } = new();
    }
}
