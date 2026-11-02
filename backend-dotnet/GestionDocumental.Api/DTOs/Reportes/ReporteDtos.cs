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
}
