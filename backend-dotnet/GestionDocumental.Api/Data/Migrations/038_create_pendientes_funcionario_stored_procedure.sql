-- Migración 038: Stored Procedure para Pendientes por Funcionario (RF-12.7 / Sprint 5)
-- =========================================================================================
-- Reporte del escritorio virtual de un funcionario:
--   * Trámites activos asignados a su usuario (usuario_actual_id).
--   * Excluye estados cerrados: CONCLUIDO y ANULADO.
--   * Resumen semanal por estado: anterior / esta semana / hoy, tomando como
--     referencia la fecha en que el trámite ingresó a su bandeja actual
--     (último movimiento de recepción o envío).
--
-- Retorna 3 conjuntos de resultados:
--   1. Cabecera del funcionario y totales operativos.
--   2. Resumen semanal por estado.
--   3. Detalle de los trámites pendientes.
-- =========================================================================================

-- Índice de apoyo para consultas por funcionario y estado
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'idx_tramites_usuario_estado'
      AND object_id = OBJECT_ID(N'dbo.tramites')
)
BEGIN
    CREATE INDEX idx_tramites_usuario_estado
        ON dbo.tramites (usuario_actual_id, estado, activo);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Reportes_PendientesPorFuncionario
    @FuncionarioId INT,
    @Gestion       INT  = NULL,
    @FechaCorte    DATE = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @FechaCorte = ISNULL(@FechaCorte, CAST(GETDATE() AS DATE));

    -- Lunes de la semana de corte (1900-01-01 fue lunes)
    DECLARE @InicioSemana DATE = DATEADD(DAY, -((DATEDIFF(DAY, 0, @FechaCorte)) % 7), @FechaCorte);

    -- -----------------------------------------------------------------
    -- Base de trámites pendientes del funcionario
    -- -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#Pendientes') IS NOT NULL DROP TABLE #Pendientes;

    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        tp.codigo AS tipo_proceso_codigo,
        tp.nombre AS tipo_proceso_nombre,
        t.remitente,
        t.institucion_remitente,
        t.cite_externo,
        t.referencia,
        t.estado,
        t.prioridad,
        t.fecha_creacion,
        t.fecha_limite_respuesta,
        t.ubicacion_actual_id,
        uo.nombre AS ubicacion_actual_nombre,
        ISNULL(ult.actividad_nombre, 'Atención institucional') AS actividad_actual,
        CAST(COALESCE(
            ult.fecha_recepcion,
            ult.fecha_envio,
            ult.created_at,
            t.updated_at,
            t.fecha_creacion
        ) AS DATE) AS fecha_ingreso_bandeja,
        CASE
            WHEN t.fecha_limite_respuesta IS NOT NULL
             AND t.fecha_limite_respuesta < @FechaCorte
            THEN 1 ELSE 0
        END AS es_vencido
    INTO #Pendientes
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp ON tp.id = t.tipo_proceso_id
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = t.ubicacion_actual_id
    OUTER APPLY (
        SELECT TOP 1
            m.actividad_nombre,
            m.fecha_envio,
            m.fecha_recepcion,
            m.created_at
        FROM dbo.movimientos m
        WHERE m.tramite_id = t.id
        ORDER BY m.orden DESC, m.id DESC
    ) ult
    WHERE t.activo = 1
      AND t.usuario_actual_id = @FuncionarioId
      AND t.estado NOT IN ('CONCLUIDO', 'ANULADO')
      AND (@Gestion IS NULL OR t.gestion = @Gestion)
      AND t.fecha_creacion < DATEADD(DAY, 1, CAST(@FechaCorte AS DATETIME2));

    -- =================================================================
    -- RS1: CABECERA DEL FUNCIONARIO Y TOTALES OPERATIVOS
    -- =================================================================
    SELECT
        e.id AS funcionario_id,
        e.Nombres + ' ' + e.Apellidos AS funcionario_nombre,
        ISNULL(e.cargo_nombre, c.NombreC) AS cargo,
        un.NombU AS unidad_nombre,
        ubi.ubicacion_org_id,
        ubi.ubicacion_nombre,
        ubi.ubicacion_sigla,
        @Gestion AS gestion,
        @FechaCorte AS fecha_corte,
        COUNT(p.id) AS pendientes,
        COUNT(CASE WHEN p.estado IN ('EN_TRANSITO', 'POR_RECIBIR') THEN 1 END) AS en_movimiento,
        COUNT(CASE WHEN p.estado IN ('EN_ATENCION', 'CREADO', 'RECIBIDO') THEN 1 END) AS en_atencion,
        COUNT(CASE WHEN p.estado = 'ATENDIDO' THEN 1 END) AS atendidos,
        COUNT(CASE WHEN p.estado = 'BLOQUEADO' THEN 1 END) AS bloqueados,
        COUNT(CASE WHEN p.es_vencido = 1 THEN 1 END) AS vencidos,
        GETDATE() AS fecha_calculo
    FROM dbo.TEmpleados e
    LEFT JOIN dbo.TUnidad un ON un.CodU = e.cod_u
    LEFT JOIN dbo.TCargo c ON c.CodCargo = e.cod_cargo
    OUTER APPLY (
        SELECT TOP 1
            ur.ubicacion_org_id,
            uo.nombre AS ubicacion_nombre,
            uo.sigla AS ubicacion_sigla
        FROM dbo.usuario_roles ur
        INNER JOIN dbo.ubicaciones_org uo ON uo.id = ur.ubicacion_org_id
        WHERE ur.usuario_id = e.id
          AND ur.activo = 1
        ORDER BY ur.es_principal DESC, ur.id ASC
    ) ubi
    LEFT JOIN #Pendientes p ON 1 = 1
    WHERE e.id = @FuncionarioId
    GROUP BY
        e.id,
        e.Nombres,
        e.Apellidos,
        e.cargo_nombre,
        c.NombreC,
        un.NombU,
        ubi.ubicacion_org_id,
        ubi.ubicacion_nombre,
        ubi.ubicacion_sigla;

    -- =================================================================
    -- RS2: RESUMEN SEMANAL POR ESTADO
    -- =================================================================
    SELECT
        p.estado,
        COUNT(CASE WHEN p.fecha_ingreso_bandeja < @InicioSemana THEN 1 END) AS anterior,
        COUNT(CASE WHEN p.fecha_ingreso_bandeja >= @InicioSemana
                    AND p.fecha_ingreso_bandeja < @FechaCorte THEN 1 END) AS semana_actual,
        COUNT(CASE WHEN p.fecha_ingreso_bandeja >= @FechaCorte THEN 1 END) AS hoy,
        COUNT(1) AS total
    FROM #Pendientes p
    GROUP BY p.estado
    ORDER BY
        CASE p.estado
            WHEN 'POR_RECIBIR' THEN 1
            WHEN 'EN_TRANSITO' THEN 2
            WHEN 'CREADO'      THEN 3
            WHEN 'RECIBIDO'    THEN 4
            WHEN 'EN_ATENCION' THEN 5
            WHEN 'ATENDIDO'    THEN 6
            WHEN 'BLOQUEADO'   THEN 7
            ELSE 8
        END,
        p.estado;

    -- =================================================================
    -- RS3: DETALLE DE TRÁMITES PENDIENTES
    -- =================================================================
    SELECT
        p.id,
        p.numero_correlativo,
        p.gestion,
        p.tipo_proceso_codigo,
        p.tipo_proceso_nombre,
        p.remitente,
        p.institucion_remitente,
        p.cite_externo,
        p.referencia,
        p.estado,
        p.prioridad,
        p.actividad_actual,
        p.ubicacion_actual_id,
        p.ubicacion_actual_nombre,
        p.fecha_creacion,
        CAST(p.fecha_ingreso_bandeja AS DATETIME2) AS fecha_ingreso_bandeja,
        p.fecha_limite_respuesta,
        DATEDIFF(DAY, p.fecha_ingreso_bandeja, @FechaCorte) AS dias_en_bandeja,
        p.es_vencido
    FROM #Pendientes p
    ORDER BY
        p.es_vencido DESC,
        CASE p.prioridad WHEN 'URGENTE' THEN 1 WHEN 'ALTA' THEN 2 ELSE 3 END,
        p.fecha_ingreso_bandeja ASC,
        p.id ASC;

    -- Limpieza
    DROP TABLE #Pendientes;
END
GO
