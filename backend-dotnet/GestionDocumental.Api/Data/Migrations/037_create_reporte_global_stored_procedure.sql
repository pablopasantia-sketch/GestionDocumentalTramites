-- Migración 037: Stored Procedure para el Reporte Global de Trámites (RF-12.1 / Sprint 5)
-- =========================================================================================
-- Reporte por rango de fechas con filtro de gestión y alcance por oficina:
--   * Iniciados  : trámites con fecha_creacion dentro del rango.
--   * Movidos    : trámites distintos con al menos un movimiento de flujo dentro del rango.
--   * Concluidos : trámites con fecha_conclusion dentro del rango.
--
-- Retorna 3 conjuntos de resultados:
--   1. Totales globales del período.
--   2. Desglose por tipo de proceso.
--   3. Serie diaria (iniciados / movidos / concluidos).
--
-- Seguridad (§5.3):
--   @UbicacionOrgId = NULL  -> alcance global (solo perfiles autorizados).
--   @UbicacionOrgId = valor -> filtro por oficina orgánica del usuario.
-- =========================================================================================

-- Índice de apoyo para el filtro por fecha de conclusión (no existía en la migración 008)
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'idx_tramites_fecha_conclusion'
      AND object_id = OBJECT_ID(N'dbo.tramites')
)
BEGIN
    CREATE INDEX idx_tramites_fecha_conclusion ON dbo.tramites (fecha_conclusion);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Reportes_Global
    @FechaDesde     DATE = NULL,
    @FechaHasta     DATE = NULL,
    @Gestion        INT  = NULL,
    @UbicacionOrgId INT  = NULL
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @AnioActual INT = ISNULL(@Gestion, YEAR(@Hoy));
    DECLARE @Desde DATE = ISNULL(@FechaDesde, DATEFROMPARTS(@AnioActual, 1, 1));
    DECLARE @Hasta DATE = ISNULL(@FechaHasta, @Hoy);

    -- Normalizar un rango invertido para que el SP nunca falle por fechas
    IF @Desde > @Hasta
    BEGIN
        DECLARE @FechaTmp DATE = @Desde;
        SET @Desde = @Hasta;
        SET @Hasta = @FechaTmp;
    END

    -- Límite superior exclusivo: incluye todo el día @Hasta
    DECLARE @HastaExclusivo DATETIME2 = DATEADD(DAY, 1, CAST(@Hasta AS DATETIME2));

    -- -----------------------------------------------------------------
    -- Base de trámites dentro del alcance (gestión + oficina)
    -- -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#Alcance') IS NOT NULL DROP TABLE #Alcance;

    CREATE TABLE #Alcance (
        id              INT PRIMARY KEY,
        tipo_proceso_id INT NOT NULL,
        fecha_creacion  DATETIME2 NOT NULL,
        fecha_conclusion DATETIME2 NULL
    );

    INSERT INTO #Alcance (id, tipo_proceso_id, fecha_creacion, fecha_conclusion)
    SELECT
        t.id,
        t.tipo_proceso_id,
        t.fecha_creacion,
        t.fecha_conclusion
    FROM dbo.tramites t
    WHERE t.activo = 1
      AND (@Gestion IS NULL OR t.gestion = @Gestion)
      AND (
            @UbicacionOrgId IS NULL
            OR t.ubicacion_org_id = @UbicacionOrgId
            OR t.ubicacion_actual_id = @UbicacionOrgId
            OR EXISTS (
                SELECT 1
                FROM dbo.movimientos mx
                WHERE mx.tramite_id = t.id
                  AND (
                        mx.ubicacion_origen_id = @UbicacionOrgId
                        OR mx.ubicacion_destino_id = @UbicacionOrgId
                  )
            )
      );

    -- -----------------------------------------------------------------
    -- Iniciados: creados dentro del rango
    -- -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#Iniciados') IS NOT NULL DROP TABLE #Iniciados;

    SELECT id, tipo_proceso_id
    INTO #Iniciados
    FROM #Alcance
    WHERE fecha_creacion >= CAST(@Desde AS DATETIME2)
      AND fecha_creacion < @HastaExclusivo;

    -- -----------------------------------------------------------------
    -- Concluidos: fecha de conclusión dentro del rango
    -- -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#Concluidos') IS NOT NULL DROP TABLE #Concluidos;

    SELECT id, tipo_proceso_id
    INTO #Concluidos
    FROM #Alcance
    WHERE fecha_conclusion IS NOT NULL
      AND fecha_conclusion >= CAST(@Desde AS DATETIME2)
      AND fecha_conclusion < @HastaExclusivo;

    -- -----------------------------------------------------------------
    -- Movidos: trámites distintos con movimientos de flujo en el rango.
    -- Se excluyen movimientos administrativos que no representan
    -- desplazamiento del expediente.
    -- -----------------------------------------------------------------
    IF OBJECT_ID('tempdb..#Movidos') IS NOT NULL DROP TABLE #Movidos;

    SELECT DISTINCT
        m.tramite_id AS id,
        a.tipo_proceso_id
    INTO #Movidos
    FROM dbo.movimientos m
    INNER JOIN #Alcance a ON a.id = m.tramite_id
    WHERE COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) >= CAST(@Desde AS DATETIME2)
      AND COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) < @HastaExclusivo
      AND m.tipo_movimiento NOT IN (
            'INICIO', 'ANULACION', 'CONCLUSION', 'BLOQUEO', 'DESBLOQUEO', 'HABILITACION'
      )
      AND (
            @UbicacionOrgId IS NULL
            OR m.ubicacion_origen_id = @UbicacionOrgId
            OR m.ubicacion_destino_id = @UbicacionOrgId
      );

    -- Cantidad total de movimientos de flujo en el rango
    DECLARE @TotalMovimientos INT = (
        SELECT COUNT(1)
        FROM dbo.movimientos m
        INNER JOIN #Alcance a ON a.id = m.tramite_id
        WHERE COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) >= CAST(@Desde AS DATETIME2)
          AND COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) < @HastaExclusivo
          AND m.tipo_movimiento NOT IN (
                'INICIO', 'ANULACION', 'CONCLUSION', 'BLOQUEO', 'DESBLOQUEO', 'HABILITACION'
          )
          AND (
                @UbicacionOrgId IS NULL
                OR m.ubicacion_origen_id = @UbicacionOrgId
                OR m.ubicacion_destino_id = @UbicacionOrgId
          )
    );

    DECLARE @TotalIniciados INT = (SELECT COUNT(1) FROM #Iniciados);
    DECLARE @TotalMovidos INT = (SELECT COUNT(1) FROM #Movidos);
    DECLARE @TotalConcluidos INT = (SELECT COUNT(1) FROM #Concluidos);

    -- =================================================================
    -- RS1: TOTALES GLOBALES DEL PERÍODO
    -- =================================================================
    SELECT
        @Gestion AS gestion,
        @Desde AS fecha_desde,
        @Hasta AS fecha_hasta,
        @TotalIniciados AS iniciados,
        @TotalMovidos AS movidos,
        @TotalMovimientos AS movimientos,
        @TotalConcluidos AS concluidos,
        CASE
            WHEN @TotalIniciados = 0 THEN CAST(0.00 AS DECIMAL(10, 2))
            ELSE CAST((@TotalConcluidos * 100.0) / @TotalIniciados AS DECIMAL(10, 2))
        END AS porcentaje_concluidos,
        ISNULL((
            SELECT CAST(AVG(CAST(DATEDIFF(DAY, a.fecha_creacion, a.fecha_conclusion) AS DECIMAL(10, 2))) AS DECIMAL(10, 2))
            FROM #Alcance a
            WHERE a.fecha_conclusion IS NOT NULL
              AND a.fecha_conclusion >= CAST(@Desde AS DATETIME2)
              AND a.fecha_conclusion < @HastaExclusivo
              AND a.fecha_conclusion >= a.fecha_creacion
        ), CAST(0.00 AS DECIMAL(10, 2))) AS promedio_dias_conclusion;

    -- =================================================================
    -- RS2: DESGLOSE POR TIPO DE PROCESO
    -- =================================================================
    ;WITH Base AS (
        SELECT tipo_proceso_id, 1 AS iniciado, 0 AS movido, 0 AS concluido FROM #Iniciados
        UNION ALL
        SELECT tipo_proceso_id, 0, 1, 0 FROM #Movidos
        UNION ALL
        SELECT tipo_proceso_id, 0, 0, 1 FROM #Concluidos
    )
    SELECT
        tp.id AS tipo_proceso_id,
        tp.codigo AS tipo_proceso_codigo,
        tp.nombre AS tipo_proceso_nombre,
        SUM(b.iniciado) AS iniciados,
        SUM(b.movido) AS movidos,
        SUM(b.concluido) AS concluidos
    FROM Base b
    INNER JOIN dbo.tipos_proceso tp ON tp.id = b.tipo_proceso_id
    GROUP BY tp.id, tp.codigo, tp.nombre
    ORDER BY SUM(b.iniciado) DESC, SUM(b.movido) DESC, tp.nombre;

    -- =================================================================
    -- RS3: SERIE DIARIA (iniciados / movidos / concluidos)
    -- =================================================================
    IF OBJECT_ID('tempdb..#IniciadosDia') IS NOT NULL DROP TABLE #IniciadosDia;

    SELECT
        CAST(a.fecha_creacion AS DATE) AS fecha,
        COUNT(1) AS total
    INTO #IniciadosDia
    FROM #Alcance a
    WHERE a.fecha_creacion >= CAST(@Desde AS DATETIME2)
      AND a.fecha_creacion < @HastaExclusivo
    GROUP BY CAST(a.fecha_creacion AS DATE);

    IF OBJECT_ID('tempdb..#ConcluidosDia') IS NOT NULL DROP TABLE #ConcluidosDia;

    SELECT
        CAST(a.fecha_conclusion AS DATE) AS fecha,
        COUNT(1) AS total
    INTO #ConcluidosDia
    FROM #Alcance a
    WHERE a.fecha_conclusion IS NOT NULL
      AND a.fecha_conclusion >= CAST(@Desde AS DATETIME2)
      AND a.fecha_conclusion < @HastaExclusivo
    GROUP BY CAST(a.fecha_conclusion AS DATE);

    IF OBJECT_ID('tempdb..#MovidosDia') IS NOT NULL DROP TABLE #MovidosDia;

    SELECT
        CAST(COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) AS DATE) AS fecha,
        COUNT(DISTINCT m.tramite_id) AS total
    INTO #MovidosDia
    FROM dbo.movimientos m
    INNER JOIN #Alcance a ON a.id = m.tramite_id
    WHERE COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) >= CAST(@Desde AS DATETIME2)
      AND COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) < @HastaExclusivo
      AND m.tipo_movimiento NOT IN (
            'INICIO', 'ANULACION', 'CONCLUSION', 'BLOQUEO', 'DESBLOQUEO', 'HABILITACION'
      )
      AND (
            @UbicacionOrgId IS NULL
            OR m.ubicacion_origen_id = @UbicacionOrgId
            OR m.ubicacion_destino_id = @UbicacionOrgId
      )
    GROUP BY CAST(COALESCE(m.fecha_envio, m.fecha_recepcion, m.created_at) AS DATE);

    ;WITH Dias AS (
        SELECT @Desde AS fecha
        UNION ALL
        SELECT DATEADD(DAY, 1, fecha)
        FROM Dias
        WHERE fecha < @Hasta
    )
    SELECT
        d.fecha,
        ISNULL(i.total, 0) AS iniciados,
        ISNULL(mv.total, 0) AS movidos,
        ISNULL(c.total, 0) AS concluidos
    FROM Dias d
    LEFT JOIN #IniciadosDia i  ON i.fecha  = d.fecha
    LEFT JOIN #MovidosDia  mv  ON mv.fecha = d.fecha
    LEFT JOIN #ConcluidosDia c ON c.fecha  = d.fecha
    ORDER BY d.fecha
    OPTION (MAXRECURSION 0);

    -- Limpieza de tablas temporales
    DROP TABLE #IniciadosDia;
    DROP TABLE #ConcluidosDia;
    DROP TABLE #MovidosDia;
    DROP TABLE #Iniciados;
    DROP TABLE #Concluidos;
    DROP TABLE #Movidos;
    DROP TABLE #Alcance;
END
GO
