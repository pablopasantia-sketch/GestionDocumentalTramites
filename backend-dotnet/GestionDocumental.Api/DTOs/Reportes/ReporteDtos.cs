using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace GestionDocumental.Api.DTOs.Reportes
{
    /// <summary>
    /// Reporte global de trámites por rango de fechas (RF-12.1).
    /// </summary>
    public class ReporteGlobalDto
    {
        [JsonPropertyName("gestion")]
        public int? Gestion { get; set; }

        [JsonPropertyName("fecha_desde")]
        public DateTime FechaDesde { get; set; }

        [JsonPropertyName("fecha_hasta")]
        public DateTime FechaHasta { get; set; }

        /// <summary>
        /// GLOBAL cuando el perfil ve todas las oficinas; OFICINA cuando está filtrado.
        /// </summary>
        [JsonPropertyName("alcance")]
        public string Alcance { get; set; } = "GLOBAL";

        [JsonPropertyName("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [JsonPropertyName("totales")]
        public ReporteGlobalTotalesDto Totales { get; set; } = new();

        [JsonPropertyName("por_tipo")]
        public List<ReporteGlobalTipoDto> PorTipo { get; set; } = new();

        [JsonPropertyName("serie_diaria")]
        public List<ReporteGlobalDiaDto> SerieDiaria { get; set; } = new();
    }

    public class ReporteGlobalTotalesDto
    {
        [JsonPropertyName("iniciados")]
        public int Iniciados { get; set; }

        [JsonPropertyName("movidos")]
        public int Movidos { get; set; }

        /// <summary>
        /// Cantidad total de movimientos de flujo registrados en el rango.
        /// </summary>
        [JsonPropertyName("movimientos")]
        public int Movimientos { get; set; }

        [JsonPropertyName("concluidos")]
        public int Concluidos { get; set; }

        [JsonPropertyName("porcentaje_concluidos")]
        public decimal PorcentajeConcluidos { get; set; }

        [JsonPropertyName("promedio_dias_conclusion")]
        public decimal PromedioDiasConclusion { get; set; }
    }

    public class ReporteGlobalTipoDto
    {
        [JsonPropertyName("tipo_proceso_id")]
        public int TipoProcesoId { get; set; }

        [JsonPropertyName("tipo_proceso_codigo")]
        public string TipoProcesoCodigo { get; set; } = string.Empty;

        [JsonPropertyName("tipo_proceso_nombre")]
        public string TipoProcesoNombre { get; set; } = string.Empty;

        [JsonPropertyName("iniciados")]
        public int Iniciados { get; set; }

        [JsonPropertyName("movidos")]
        public int Movidos { get; set; }

        [JsonPropertyName("concluidos")]
        public int Concluidos { get; set; }
    }

    public class ReporteGlobalDiaDto
    {
        [JsonPropertyName("fecha")]
        public DateTime Fecha { get; set; }

        [JsonPropertyName("iniciados")]
        public int Iniciados { get; set; }

        [JsonPropertyName("movidos")]
        public int Movidos { get; set; }

        [JsonPropertyName("concluidos")]
        public int Concluidos { get; set; }
    }

    /// <summary>
    /// Pendientes del escritorio virtual de un funcionario (RF-12.7).
    /// </summary>
    public class PendientesFuncionarioDto
    {
        [JsonPropertyName("funcionario")]
        public PendientesFuncionarioCabeceraDto Funcionario { get; set; } = new();

        [JsonPropertyName("gestion")]
        public int? Gestion { get; set; }

        [JsonPropertyName("fecha_corte")]
        public DateTime FechaCorte { get; set; }

        [JsonPropertyName("fecha_calculo")]
        public DateTime FechaCalculo { get; set; }

        [JsonPropertyName("totales")]
        public PendientesFuncionarioTotalesDto Totales { get; set; } = new();

        [JsonPropertyName("por_estado")]
        public List<PendientesEstadoSemanalDto> PorEstado { get; set; } = new();

        [JsonPropertyName("detalle")]
        public List<PendienteDetalleDto> Detalle { get; set; } = new();
    }

    public class PendientesFuncionarioCabeceraDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("nombre")]
        public string Nombre { get; set; } = string.Empty;

        [JsonPropertyName("cargo")]
        public string? Cargo { get; set; }

        [JsonPropertyName("unidad_nombre")]
        public string? UnidadNombre { get; set; }

        [JsonPropertyName("ubicacion_org_id")]
        public int? UbicacionOrgId { get; set; }

        [JsonPropertyName("ubicacion_nombre")]
        public string? UbicacionNombre { get; set; }

        [JsonPropertyName("ubicacion_sigla")]
        public string? UbicacionSigla { get; set; }
    }

    public class PendientesFuncionarioTotalesDto
    {
        [JsonPropertyName("pendientes")]
        public int Pendientes { get; set; }

        [JsonPropertyName("en_movimiento")]
        public int EnMovimiento { get; set; }

        [JsonPropertyName("en_atencion")]
        public int EnAtencion { get; set; }

        [JsonPropertyName("atendidos")]
        public int Atendidos { get; set; }

        [JsonPropertyName("bloqueados")]
        public int Bloqueados { get; set; }

        [JsonPropertyName("vencidos")]
        public int Vencidos { get; set; }
    }

    public class PendientesEstadoSemanalDto
    {
        [JsonPropertyName("estado")]
        public string Estado { get; set; } = string.Empty;

        [JsonPropertyName("anterior")]
        public int Anterior { get; set; }

        [JsonPropertyName("semana_actual")]
        public int SemanaActual { get; set; }

        [JsonPropertyName("hoy")]
        public int Hoy { get; set; }

        [JsonPropertyName("total")]
        public int Total { get; set; }
    }

    public class PendienteDetalleDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("numero_correlativo")]
        public string NumeroCorrelativo { get; set; } = string.Empty;

        [JsonPropertyName("gestion")]
        public int Gestion { get; set; }

        [JsonPropertyName("tipo_proceso_codigo")]
        public string TipoProcesoCodigo { get; set; } = string.Empty;

        [JsonPropertyName("tipo_proceso_nombre")]
        public string TipoProcesoNombre { get; set; } = string.Empty;

        [JsonPropertyName("remitente")]
        public string Remitente { get; set; } = string.Empty;

        [JsonPropertyName("institucion_remitente")]
        public string? InstitucionRemitente { get; set; }

        [JsonPropertyName("cite_externo")]
        public string? CiteExterno { get; set; }

        [JsonPropertyName("referencia")]
        public string Referencia { get; set; } = string.Empty;

        [JsonPropertyName("estado")]
        public string Estado { get; set; } = string.Empty;

        [JsonPropertyName("prioridad")]
        public string Prioridad { get; set; } = string.Empty;

        [JsonPropertyName("actividad_actual")]
        public string ActividadActual { get; set; } = string.Empty;

        [JsonPropertyName("ubicacion_actual_id")]
        public int? UbicacionActualId { get; set; }

        [JsonPropertyName("ubicacion_actual_nombre")]
        public string? UbicacionActualNombre { get; set; }

        [JsonPropertyName("fecha_creacion")]
        public DateTime FechaCreacion { get; set; }

        [JsonPropertyName("fecha_ingreso_bandeja")]
        public DateTime FechaIngresoBandeja { get; set; }

        [JsonPropertyName("fecha_limite_respuesta")]
        public DateTime? FechaLimiteRespuesta { get; set; }

        [JsonPropertyName("dias_en_bandeja")]
        public int DiasEnBandeja { get; set; }

        [JsonPropertyName("es_vencido")]
        public bool EsVencido { get; set; }
    }
}
