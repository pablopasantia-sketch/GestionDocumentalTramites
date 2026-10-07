-- =============================================================================
-- MIGRACIÓN 016: PROCEDIMIENTOS ALMACENADOS PARA ESCRITORIO VIRTUAL Y BANDEJAS
-- Sistema Wayka MVP - Sprint 3 (Flujo Directo de Trabajo)
-- Base de datos: DB_TRAMITES_EXTERNOS (Microsoft SQL Server T-SQL)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. dbo.usp_Escritorio_ListarBandeja: Consulta unificada de bandejas
--    (Recibidos/Pendientes, Despachados/Enviados, Supervisión Global)
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Escritorio_ListarBandeja
    @UsuarioId      INT,
    @UbicacionOrgId INT           = NULL,
    @Bandeja        VARCHAR(30)   = 'RECIBIDOS', -- 'RECIBIDOS' | 'DESPACHADOS' | 'TODOS'
    @Categoria      VARCHAR(30)   = NULL,        -- 'TODOS' | 'CORRESPONDENCIA' | 'TRAMITE'
    @Estado         VARCHAR(30)   = NULL,        -- 'TODOS' | 'POR_RECIBIR' | 'EN_ATENCION' | 'ATENDIDO' | 'CONCLUIDO' | etc.
    @Search         NVARCHAR(100) = NULL,
    @Gestion        INT           = NULL,
    @SoloVencidos   BIT           = 0,
    @VerGlobal      BIT           = 0,           -- 1 = Ver todo sin restricción de oficina (Admin)
    @Limit          INT           = 50,
    @Offset         INT           = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @AnioActual INT = ISNULL(@Gestion, YEAR(GETDATE()));

    ;WITH BandejaBase AS (
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
            t.prioridad,
            t.nro_hojas,
            t.nro_anexos,
            t.estado,
            t.destinatario_nombre,
            t.destinatario_cargo,
            t.destinatario_unidad,
            t.usuario_actual_id,
            ISNULL(uAct.Nombres + ' ' + ISNULL(uAct.Apellidos, ''), uAct.login) AS usuario_actual_nombre,
            t.ubicacion_actual_id,
            uoAct.nombre AS ubicacion_actual_nombre,
            t.fecha_creacion,
            t.fecha_limite_respuesta,
            CASE 
                WHEN t.fecha_limite_respuesta IS NOT NULL 
                 AND t.fecha_limite_respuesta < @Hoy 
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO') 
                THEN 1 ELSE 0 
            END AS es_vencido,
            CASE 
                WHEN t.fecha_limite_respuesta IS NOT NULL 
                THEN DATEDIFF(DAY, @Hoy, t.fecha_limite_respuesta) 
                ELSE NULL 
            END AS dias_restantes,
            (SELECT COUNT(1) FROM dbo.adjuntos a WHERE a.tramite_id = t.id AND a.activo = 1) AS nro_adjuntos,
            -- Datos del último movimiento
            ultMov.actividad_nombre AS actividad_actual,
            ultMov.fecha_envio      AS ult_fecha_envio,
            ultMov.fecha_recepcion  AS ult_fecha_recepcion,
            ultMov.proveido         AS ult_proveido,
            -- Pertenencia a bandeja
            CASE
                WHEN @VerGlobal = 1 THEN 'SUPERVISION'
                WHEN (t.usuario_actual_id = @UsuarioId 
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId)
                      OR (t.ubicacion_actual_id = @UbicacionOrgId AND t.estado = 'POR_RECIBIR'))
                THEN 'RECIBIDO'
                ELSE 'DESPACHADO'
            END AS bandeja_tipo,
            -- Banderas de correspondencia para filtrado
            CASE 
                WHEN (t.usuario_actual_id = @UsuarioId 
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId)
                      OR (t.ubicacion_actual_id = @UbicacionOrgId AND t.estado = 'POR_RECIBIR'))
                THEN 1 ELSE 0 
            END AS es_mi_recibido,
            CASE 
                WHEN (t.creado_por = @UsuarioId 
                      OR t.ubicacion_org_id = @UbicacionOrgId 
                      OR EXISTS (SELECT 1 FROM dbo.movimientos m WHERE m.tramite_id = t.id AND (m.usuario_origen_id = @UsuarioId OR m.ubicacion_origen_id = @UbicacionOrgId)))
                 AND (t.usuario_actual_id <> @UsuarioId OR t.ubicacion_actual_id <> @UbicacionOrgId OR t.estado IN ('EN_TRANSITO', 'POR_RECIBIR', 'CONCLUIDO'))
                THEN 1 ELSE 0 
            END AS es_mi_despachado
        FROM dbo.tramites t
        INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
        LEFT JOIN dbo.TEmpleados uAct     ON uAct.id = t.usuario_actual_id
        LEFT JOIN dbo.ubicaciones_org uoAct ON uoAct.id = t.ubicacion_actual_id
        OUTER APPLY (
            SELECT TOP 1 
                m.actividad_nombre,
                m.fecha_envio,
                m.fecha_recepcion,
                m.proveido
            FROM dbo.movimientos m
            WHERE m.tramite_id = t.id
            ORDER BY m.orden DESC, m.id DESC
        ) ultMov
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @AnioActual)
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
        b.prioridad,
        b.nro_hojas,
        b.nro_anexos,
        b.estado,
        ISNULL(b.actividad_actual, 'Atención institucional') AS actividad_actual,
        b.destinatario_nombre,
        b.destinatario_cargo,
        b.destinatario_unidad,
        b.usuario_actual_id,
        b.usuario_actual_nombre,
        b.ubicacion_actual_id,
        b.ubicacion_actual_nombre,
        b.fecha_creacion,
        b.ult_fecha_envio     AS fecha_envio,
        b.ult_fecha_recepcion AS fecha_recepcion,
        b.fecha_limite_respuesta,
        b.es_vencido,
        b.dias_restantes,
        b.nro_adjuntos,
        b.ult_proveido        AS ultimo_proveido,
        b.bandeja_tipo
    FROM BandejaBase b
    WHERE
        -- Filtro por Bandeja seleccionada
        (
            (@VerGlobal = 1)
            OR (@Bandeja = 'TODOS' AND (b.es_mi_recibido = 1 OR b.es_mi_despachado = 1))
            OR (@Bandeja = 'RECIBIDOS' AND b.es_mi_recibido = 1)
            OR (@Bandeja = 'DESPACHADOS' AND b.es_mi_despachado = 1)
        )
        -- Filtro por Categoría
        AND (
            @Categoria IS NULL 
            OR @Categoria = 'TODOS' 
            OR b.tipo_categoria = @Categoria
        )
        -- Filtro por Estado
        AND (
            @Estado IS NULL 
            OR @Estado = 'TODOS' 
            OR b.estado = @Estado
        )
        -- Filtro por SLA / Vencidos
        AND (
            @SoloVencidos = 0 
            OR b.es_vencido = 1
        )
        -- Filtro por Búsqueda rápida
        AND (
            @Search IS NULL 
            OR @Search = ''
            OR b.numero_correlativo LIKE '%' + @Search + '%'
            OR b.remitente          LIKE '%' + @Search + '%'
            OR b.referencia         LIKE '%' + @Search + '%'
            OR b.cite_externo       LIKE '%' + @Search + '%'
            OR b.tipo_proceso_nombre LIKE '%' + @Search + '%'
            OR b.destinatario_nombre LIKE '%' + @Search + '%'
        )
    ORDER BY
        b.es_vencido DESC,
        CASE b.prioridad WHEN 'URGENTE' THEN 1 WHEN 'ALTA' THEN 2 ELSE 3 END ASC,
        b.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. dbo.usp_Escritorio_ObtenerResumen: Métricas y conteos rápidos (KPIs)
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Escritorio_ObtenerResumen
    @UsuarioId      INT,
    @UbicacionOrgId INT = NULL,
    @Gestion        INT = NULL,
    @VerGlobal      BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @AnioActual INT = ISNULL(@Gestion, YEAR(GETDATE()));

    ;WITH BaseCalculo AS (
        SELECT
            t.id,
            t.estado,
            t.prioridad,
            CASE 
                WHEN t.fecha_limite_respuesta IS NOT NULL 
                 AND t.fecha_limite_respuesta < @Hoy 
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO') 
                THEN 1 ELSE 0 
            END AS es_vencido,
            CASE 
                WHEN @VerGlobal = 1 THEN 1
                WHEN (t.usuario_actual_id = @UsuarioId 
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId)
                      OR (t.ubicacion_actual_id = @UbicacionOrgId AND t.estado = 'POR_RECIBIR'))
                THEN 1 ELSE 0 
            END AS es_recibido,
            CASE 
                WHEN (t.creado_por = @UsuarioId 
                      OR t.ubicacion_org_id = @UbicacionOrgId 
                      OR EXISTS (SELECT 1 FROM dbo.movimientos m WHERE m.tramite_id = t.id AND (m.usuario_origen_id = @UsuarioId OR m.ubicacion_origen_id = @UbicacionOrgId)))
                 AND (t.usuario_actual_id <> @UsuarioId OR t.ubicacion_actual_id <> @UbicacionOrgId OR t.estado IN ('EN_TRANSITO', 'POR_RECIBIR', 'CONCLUIDO'))
                THEN 1 ELSE 0 
            END AS es_despachado
        FROM dbo.tramites t
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @AnioActual)
    )
    SELECT
        @AnioActual AS gestion,
        -- Métricas de bandeja Recibidos / Pendientes
        COUNT(CASE WHEN es_recibido = 1 AND estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS total_bandeja,
        COUNT(CASE WHEN es_recibido = 1 AND estado IN ('POR_RECIBIR', 'EN_TRANSITO') THEN 1 END) AS por_recibir,
        COUNT(CASE WHEN es_recibido = 1 AND estado IN ('EN_ATENCION', 'CREADO', 'RECIBIDO') THEN 1 END) AS en_atencion,
        COUNT(CASE WHEN es_recibido = 1 AND estado = 'ATENDIDO' THEN 1 END) AS atendidos,
        
        -- Métricas de bandeja Despachados
        COUNT(CASE WHEN es_despachado = 1 THEN 1 END) AS total_despachados,
        COUNT(CASE WHEN es_despachado = 1 AND estado IN ('POR_RECIBIR', 'EN_TRANSITO') THEN 1 END) AS despachados_sin_confirmar,
        COUNT(CASE WHEN es_despachado = 1 AND estado IN ('EN_ATENCION', 'RECIBIDO', 'ATENDIDO', 'CONCLUIDO') THEN 1 END) AS despachados_confirmados,
        
        -- Alertas críticas
        COUNT(CASE WHEN es_recibido = 1 AND es_vencido = 1 THEN 1 END) AS vencidos,
        COUNT(CASE WHEN es_recibido = 1 AND prioridad IN ('URGENTE', 'ALTA') AND estado NOT IN ('CONCLUIDO', 'ANULADO') THEN 1 END) AS urgentes
    FROM BaseCalculo;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. dbo.usp_Tramites_Recepcionar: Confirmar recepción de un trámite despachado
--    Transición: POR_RECIBIR / EN_TRANSITO -> EN_ATENCION
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Recepcionar
    @TramiteId      INT,
    @UsuarioId      INT,
    @UbicacionOrgId INT,
    @Proveido       NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar existencia y estado del trámite
        DECLARE @EstadoActual VARCHAR(30), @Correlativo VARCHAR(50);
        SELECT @EstadoActual = estado, @Correlativo = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50020, 'El trámite indicado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual NOT IN ('POR_RECIBIR', 'EN_TRANSITO', 'CREADO')
        BEGIN
            THROW 50021, 'El trámite no se encuentra en estado pendiente de recepción (POR_RECIBIR / EN_TRANSITO).', 1;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();

        -- 2. Actualizar estado del trámite a EN_ATENCION
        UPDATE dbo.tramites
        SET estado              = 'EN_ATENCION',
            usuario_actual_id   = @UsuarioId,
            ubicacion_actual_id = @UbicacionOrgId,
            updated_at          = @Ahora
        WHERE id = @TramiteId;

        -- 3. Actualizar último movimiento registrando la recepción
        DECLARE @UltimoMovId INT;
        SELECT TOP 1 @UltimoMovId = id
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId
        ORDER BY orden DESC, id DESC;

        IF @UltimoMovId IS NOT NULL
        BEGIN
            UPDATE dbo.movimientos
            SET fecha_recepcion     = @Ahora,
                usuario_destino_id  = @UsuarioId,
                ubicacion_destino_id = @UbicacionOrgId,
                estado_movimiento   = 'EN_ATENCION',
                proveido            = CASE 
                                        WHEN @Proveido IS NOT NULL AND LTRIM(RTRIM(@Proveido)) <> '' 
                                        THEN ISNULL(proveido + CHAR(13) + CHAR(10), '') + 'Recepción confirmada: ' + @Proveido
                                        ELSE proveido 
                                      END
            WHERE id = @UltimoMovId;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
