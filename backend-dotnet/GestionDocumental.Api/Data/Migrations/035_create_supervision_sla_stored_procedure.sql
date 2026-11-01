-- Migración 035: Stored Procedure para Supervisión Integral de Wayka y Tiempos SLA (Sprint 4)
-- =========================================================================================
-- Retorna 3 conjuntos de resultados:
-- 1. Métricas Globales de SLA y Eficiencia Operativa
-- 2. Top 20 Trámites Críticos / Con Atraso o Prioridad Urgente en Curso
-- 3. Distribución y Cumplimiento de SLA agrupado por Tipo de Proceso
-- =========================================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Supervision_ObtenerMetricasSLA
    @Gestion INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @AnioActual INT = ISNULL(@Gestion, YEAR(GETDATE()));

    -- -------------------------------------------------------------
    -- RS1: MÉTRICAS GLOBALES DE SLA Y TIEMPOS OPERATIVOS
    -- -------------------------------------------------------------
    ;WITH BaseMetrics AS (
        SELECT
            t.id,
            t.estado,
            t.prioridad,
            t.fecha_creacion,
            t.fecha_conclusion,
            t.fecha_limite_respuesta,
            CASE 
                WHEN t.fecha_limite_respuesta IS NOT NULL 
                 AND t.fecha_limite_respuesta < @Hoy 
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO') 
                THEN 1 ELSE 0 
            END AS es_vencido,
            CASE 
                WHEN t.fecha_limite_respuesta IS NOT NULL 
                 AND t.fecha_limite_respuesta >= @Hoy 
                 AND DATEDIFF(day, @Hoy, t.fecha_limite_respuesta) <= 2
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO') 
                THEN 1 ELSE 0 
            END AS es_por_vencer,
            CASE 
                WHEN t.prioridad IN ('URGENTE', 'ALTA')
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO')
                THEN 1 ELSE 0
            END AS es_urgente
        FROM dbo.tramites t
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @AnioActual)
    )
    SELECT
        @AnioActual AS gestion,
        COUNT(1) AS total_tramites,
        COUNT(CASE WHEN estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS total_activos,
        COUNT(CASE WHEN estado = 'CONCLUIDO' THEN 1 END) AS total_concluidos,
        COUNT(CASE WHEN estado = 'ANULADO' THEN 1 END) AS total_anulados,
        COUNT(CASE WHEN estado = 'BLOQUEADO' THEN 1 END) AS total_bloqueados,
        
        -- Alertas SLA
        COUNT(CASE WHEN es_vencido = 1 THEN 1 END) AS total_vencidos,
        COUNT(CASE WHEN es_por_vencer = 1 THEN 1 END) AS total_por_vencer,
        COUNT(CASE WHEN es_urgente = 1 THEN 1 END) AS total_urgentes,
        COUNT(CASE WHEN fecha_limite_respuesta IS NOT NULL AND estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS con_plazo_activos,
        
        -- Porcentaje de Cumplimiento SLA (sobre trámites con plazo evaluado)
        CAST(
            CASE 
                WHEN COUNT(CASE WHEN fecha_limite_respuesta IS NOT NULL AND estado NOT IN ('ANULADO') THEN 1 END) = 0 THEN 100.0
                ELSE ROUND(
                    (COUNT(CASE WHEN fecha_limite_respuesta IS NOT NULL AND estado NOT IN ('ANULADO') AND es_vencido = 0 THEN 1 END) * 100.0) 
                    / COUNT(CASE WHEN fecha_limite_respuesta IS NOT NULL AND estado NOT IN ('ANULADO') THEN 1 END), 
                    1
                )
            END AS DECIMAL(5,1)
        ) AS porcentaje_cumplimiento_sla,

        -- Tiempo promedio de conclusión en horas para trámites concluidos
        CAST(
            ISNULL(
                ROUND(
                    AVG(
                        CASE 
                            WHEN estado = 'CONCLUIDO' AND fecha_conclusion IS NOT NULL AND fecha_conclusion >= fecha_creacion
                            THEN CAST(DATEDIFF(minute, fecha_creacion, fecha_conclusion) AS FLOAT) / 60.0
                            ELSE NULL 
                        END
                    ), 1
                ), 
                0.0
            ) AS DECIMAL(6,1)
        ) AS promedio_horas_atencion,

        -- Máximo días de atraso registrado
        ISNULL(
            MAX(
                CASE 
                    WHEN es_vencido = 1 
                    THEN DATEDIFF(day, fecha_limite_respuesta, @Hoy) 
                    ELSE 0 
                END
            ), 0
        ) AS max_dias_atraso,

        -- Distribución operativa
        COUNT(CASE WHEN estado IN ('EN_TRANSITO', 'POR_RECIBIR') THEN 1 END) AS en_transito,
        COUNT(CASE WHEN estado IN ('EN_ATENCION', 'RECIBIDO', 'CREADO') THEN 1 END) AS en_atencion,
        COUNT(CASE WHEN estado = 'ATENDIDO' THEN 1 END) AS atendidos_pendiente_cierre,
        GETDATE() AS fecha_calculo
    FROM BaseMetrics;

    -- -------------------------------------------------------------
    -- RS2: TOP 20 TRÁMITES CRÍTICOS / CON ATRASO O URGENTES
    -- -------------------------------------------------------------
    SELECT TOP 20
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.estado,
        t.prioridad,
        t.tipo_proceso_id,
        tp.nombre AS tipo_proceso_nombre,
        tp.codigo AS tipo_proceso_codigo,
        t.remitente,
        t.referencia,
        t.fecha_creacion,
        t.fecha_limite_respuesta,
        ISNULL(uo.nombre, 'Sin Asignar') AS ubicacion_actual,
        ISNULL(u.login, 'Sin Asignar') AS usuario_actual_login,
        CASE 
            WHEN t.fecha_limite_respuesta IS NOT NULL AND t.fecha_limite_respuesta < @Hoy 
            THEN DATEDIFF(day, t.fecha_limite_respuesta, @Hoy)
            ELSE 0 
        END AS dias_atraso,
        CASE 
            WHEN t.fecha_limite_respuesta IS NOT NULL AND t.fecha_limite_respuesta < @Hoy THEN 'VENCIDO'
            WHEN t.fecha_limite_respuesta IS NOT NULL AND DATEDIFF(day, @Hoy, t.fecha_limite_respuesta) <= 2 THEN 'POR_VENCER'
            WHEN t.prioridad = 'URGENTE' THEN 'URGENTE'
            WHEN t.prioridad = 'ALTA' THEN 'ALTA'
            ELSE 'NORMAL'
        END AS semaforo
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_actual_id
    LEFT JOIN dbo.TEmpleados u        ON u.id  = t.usuario_actual_id
    WHERE t.activo = 1
      AND t.estado NOT IN ('CONCLUIDO', 'ANULADO')
      AND (@Gestion IS NULL OR t.gestion = @AnioActual)
    ORDER BY 
        CASE 
            WHEN t.fecha_limite_respuesta IS NOT NULL AND t.fecha_limite_respuesta < @Hoy THEN 1 
            WHEN t.fecha_limite_respuesta IS NOT NULL AND DATEDIFF(day, @Hoy, t.fecha_limite_respuesta) <= 2 THEN 2
            WHEN t.prioridad = 'URGENTE' THEN 3
            WHEN t.prioridad = 'ALTA' THEN 4
            ELSE 5 
        END ASC,
        CASE 
            WHEN t.fecha_limite_respuesta IS NOT NULL AND t.fecha_limite_respuesta < @Hoy 
            THEN DATEDIFF(day, t.fecha_limite_respuesta, @Hoy) 
            ELSE 0 
        END DESC,
        t.fecha_creacion ASC;

    -- -------------------------------------------------------------
    -- RS3: DISTRIBUCIÓN Y CUMPLIMIENTO POR TIPO DE PROCESO
    -- -------------------------------------------------------------
    SELECT
        tp.id AS tipo_proceso_id,
        tp.nombre AS tipo_proceso_nombre,
        tp.codigo AS tipo_proceso_codigo,
        ISNULL(tp.tiempo_estimado_horas, 48) AS tiempo_estimado_horas,
        COUNT(t.id) AS total,
        COUNT(CASE WHEN t.estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS activos,
        COUNT(CASE WHEN t.estado = 'CONCLUIDO' THEN 1 END) AS concluidos,
        COUNT(CASE WHEN t.fecha_limite_respuesta IS NOT NULL AND t.fecha_limite_respuesta < @Hoy AND t.estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS vencidos,
        COUNT(CASE WHEN t.prioridad IN ('URGENTE', 'ALTA') AND t.estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS urgentes,
        CAST(
            CASE 
                WHEN COUNT(CASE WHEN t.fecha_limite_respuesta IS NOT NULL AND t.estado <> 'ANULADO' THEN 1 END) = 0 THEN 100.0
                ELSE ROUND(
                    (COUNT(CASE WHEN t.fecha_limite_respuesta IS NOT NULL AND t.estado <> 'ANULADO' AND (t.fecha_limite_respuesta >= @Hoy OR t.estado = 'CONCLUIDO') THEN 1 END) * 100.0)
                    / COUNT(CASE WHEN t.fecha_limite_respuesta IS NOT NULL AND t.estado <> 'ANULADO' THEN 1 END),
                    1
                )
            END AS DECIMAL(5,1)
        ) AS porcentaje_cumplimiento
    FROM dbo.tipos_proceso tp
    LEFT JOIN dbo.tramites t ON t.tipo_proceso_id = tp.id 
                            AND t.activo = 1 
                            AND (@Gestion IS NULL OR t.gestion = @AnioActual)
    WHERE tp.activo = 1
    GROUP BY tp.id, tp.nombre, tp.codigo, tp.tiempo_estimado_horas
    ORDER BY total DESC, tp.nombre ASC;
END;
GO
