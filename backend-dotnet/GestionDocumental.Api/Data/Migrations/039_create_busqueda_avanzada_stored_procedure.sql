-- Migración 039: Búsqueda avanzada de trámites por proceso y por estado/fechas
-- =========================================================================================
-- Atiende RF-12.2 y RF-12.4 del Sprint 5:
--   * Buscar por número de proceso/correlativo, tipo de proceso o rango de fechas.
--   * Filtrar por estado y gestión.
--   * Mostrar actividad actual, responsable, ubicación y fecha de ingreso a bandeja.
--
-- Retorna un único conjunto de resultados paginado. La columna total_registros
-- contiene el total de coincidencias antes de aplicar OFFSET/FETCH.
-- =========================================================================================

-- Índice de apoyo para búsquedas por rango de fechas y estado
IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'idx_tramites_fecha_estado_activo'
      AND object_id = OBJECT_ID(N'dbo.tramites')
)
BEGIN
    CREATE INDEX idx_tramites_fecha_estado_activo
        ON dbo.tramites (fecha_creacion DESC, estado, activo);
END
GO

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_BusquedaAvanzada
    @Correlativo    NVARCHAR(50)  = NULL,
    @TipoProcesoId  INT           = NULL,
    @Estado         VARCHAR(30)   = NULL,
    @FechaDesde     DATE          = NULL,
    @FechaHasta     DATE          = NULL,
    @Gestion        INT           = NULL,
    @Search         NVARCHAR(200) = NULL,
    @UbicacionOrgId INT           = NULL,
    @Limit          INT           = 100,
    @Offset         INT           = 0
AS
BEGIN
    SET NOCOUNT ON;

    SET @Correlativo = NULLIF(LTRIM(RTRIM(@Correlativo)), '');
    SET @Search      = NULLIF(LTRIM(RTRIM(@Search)), '');
    SET @Estado      = NULLIF(LTRIM(RTRIM(@Estado)), '');

    IF @Estado = 'TODOS'
        SET @Estado = NULL;

    SET @Limit  = CASE
        WHEN @Limit IS NULL OR @Limit < 1 THEN 100
        WHEN @Limit > 500 THEN 500
        ELSE @Limit
    END;

    SET @Offset = CASE WHEN @Offset IS NULL OR @Offset < 0 THEN 0 ELSE @Offset END;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    ;WITH UltimosMovimientos AS (
        SELECT
            m.tramite_id,
            m.actividad_nombre,
            m.fecha_envio,
            m.fecha_recepcion,
            m.created_at,
            ROW_NUMBER() OVER (
                PARTITION BY m.tramite_id
                ORDER BY m.orden DESC, m.id DESC
            ) AS rn
        FROM dbo.movimientos m
    ),
    Base AS (
        SELECT
            t.id,
            t.numero_correlativo,
            t.gestion,
            t.tipo_proceso_id,
            tp.codigo AS tipo_proceso_codigo,
            tp.nombre AS tipo_proceso_nombre,
            ISNULL(tp.tipo_categoria, t.tipo_corres) AS tipo_categoria,
            t.remitente,
            t.institucion_remitente,
            t.cite_externo,
            t.referencia,
            t.estado,
            t.prioridad,
            t.nro_hojas,
            t.nro_anexos,
            ISNULL(um.actividad_nombre, 'Atención institucional') AS actividad_actual,
            t.usuario_actual_id,
            ISNULL(NULLIF(LTRIM(RTRIM(ua.Nombres + ' ' + ISNULL(ua.Apellidos, ''))), ''), ua.login) AS usuario_actual_nombre,
            ua.login AS usuario_actual_login,
            ua.cargo_nombre AS usuario_actual_cargo,
            t.ubicacion_actual_id,
            uo.nombre AS ubicacion_actual_nombre,
            uo.sigla AS ubicacion_actual_sigla,
            t.fecha_creacion,
            CAST(COALESCE(
                um.fecha_recepcion,
                um.fecha_envio,
                um.created_at,
                t.updated_at,
                t.fecha_creacion
            ) AS DATETIME2) AS fecha_ingreso_bandeja,
            t.fecha_limite_respuesta,
            CASE
                WHEN t.fecha_limite_respuesta IS NOT NULL
                 AND t.fecha_limite_respuesta < @Hoy
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO')
                THEN 1 ELSE 0
            END AS es_vencido,
            (SELECT COUNT(1) FROM dbo.adjuntos a WHERE a.tramite_id = t.id AND a.activo = 1) AS nro_adjuntos
        FROM dbo.tramites t
        INNER JOIN dbo.tipos_proceso tp ON tp.id = t.tipo_proceso_id
        LEFT JOIN dbo.TEmpleados ua ON ua.id = t.usuario_actual_id
        LEFT JOIN dbo.ubicaciones_org uo ON uo.id = t.ubicacion_actual_id
        LEFT JOIN UltimosMovimientos um ON um.tramite_id = t.id AND um.rn = 1
        WHERE t.activo = 1
          AND (@Correlativo IS NULL OR t.numero_correlativo LIKE '%' + @Correlativo + '%')
          AND (@TipoProcesoId IS NULL OR t.tipo_proceso_id = @TipoProcesoId)
          AND (@Estado IS NULL OR t.estado = @Estado)
          AND (@Gestion IS NULL OR t.gestion = @Gestion)
          AND (@FechaDesde IS NULL OR t.fecha_creacion >= CAST(@FechaDesde AS DATETIME2))
          AND (@FechaHasta IS NULL OR t.fecha_creacion < DATEADD(DAY, 1, CAST(@FechaHasta AS DATETIME2)))
          AND (@Search IS NULL OR (
              t.numero_correlativo LIKE '%' + @Search + '%' OR
              t.remitente LIKE '%' + @Search + '%' OR
              t.referencia LIKE '%' + @Search + '%' OR
              t.cite_externo LIKE '%' + @Search + '%' OR
              t.institucion_remitente LIKE '%' + @Search + '%' OR
              tp.nombre LIKE '%' + @Search + '%'
          ))
          AND (@UbicacionOrgId IS NULL OR
               t.ubicacion_actual_id = @UbicacionOrgId OR
               t.ubicacion_org_id = @UbicacionOrgId)
    )
    SELECT
        b.id,
        b.numero_correlativo,
        b.gestion,
        b.tipo_proceso_id,
        b.tipo_proceso_codigo,
        b.tipo_proceso_nombre,
        b.tipo_categoria,
        b.remitente,
        b.institucion_remitente,
        b.cite_externo,
        b.referencia,
        b.estado,
        b.prioridad,
        b.nro_hojas,
        b.nro_anexos,
        b.actividad_actual,
        b.usuario_actual_id,
        b.usuario_actual_nombre,
        b.usuario_actual_login,
        b.usuario_actual_cargo,
        b.ubicacion_actual_id,
        b.ubicacion_actual_nombre,
        b.ubicacion_actual_sigla,
        b.fecha_creacion,
        b.fecha_ingreso_bandeja,
        b.fecha_limite_respuesta,
        CASE
            WHEN DATEDIFF(DAY, CAST(b.fecha_ingreso_bandeja AS DATE), @Hoy) < 0 THEN 0
            ELSE DATEDIFF(DAY, CAST(b.fecha_ingreso_bandeja AS DATE), @Hoy)
        END AS dias_en_bandeja,
        b.es_vencido,
        b.nro_adjuntos,
        COUNT(*) OVER() AS total_registros
    FROM Base b
    ORDER BY b.fecha_creacion DESC, b.id DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END
GO
