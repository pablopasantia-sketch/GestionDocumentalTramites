-- =============================================================================
-- 048_fix_bandeja_recibidos_excluir_concluidos.sql
-- Corrige la bandeja de Recibidos del Escritorio Virtual (RF-10 / Despacho Final).
--
-- Motivo: en la migración 041, `es_mi_recibido` solo validaba custodia, mientras
-- que `puede_operar` además excluía los estados concluyentes. Tras el Despacho
-- Final el trámite queda con usuario_actual_id = NULL, ubicacion_actual_id = 4
-- y estado = 'CONCLUIDO': se cumple la custodia y, por tanto, seguía apareciendo
-- en Recibidos sin ninguna acción ejecutable.
--
-- Solución: alinear `es_mi_recibido` (y `es_recibido` del resumen) con la misma
-- lista de estados concluyentes que ya usa `puede_operar`. Como `es_mi_despachado`
-- incluye explícitamente 'CONCLUIDO', el expediente pasa a la bandeja de
-- Despachados en lugar de desaparecer del escritorio.
--
-- `bandeja_tipo` se deriva de `es_mi_recibido`, por lo que también deja de
-- etiquetarse como 'RECIBIDO'. El resto de la consulta queda intacto.
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. usp_Escritorio_ListarBandeja
--    (copia íntegra de 041; único cambio: filtro de estado en es_mi_recibido)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Escritorio_ListarBandeja
    @UsuarioId      INT,
    @UbicacionOrgId INT           = NULL,
    @Bandeja        VARCHAR(30)   = 'RECIBIDOS',
    @Categoria      VARCHAR(30)   = NULL,
    @Estado         VARCHAR(30)   = NULL,
    @Search         NVARCHAR(100) = NULL,
    @Gestion        INT           = NULL,
    @SoloVencidos   BIT           = 0,
    @VerGlobal      BIT           = 0,
    @Limit          INT           = 50,
    @Offset         INT           = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    ;WITH UltimosMovimientos AS (
        SELECT
            m.tramite_id, m.id, m.actividad_nombre, m.fecha_envio, m.fecha_recepcion,
            m.proveido, m.instrumento_generado, m.orden,
            ROW_NUMBER() OVER (PARTITION BY m.tramite_id ORDER BY m.orden DESC, m.id DESC) AS rn
        FROM dbo.movimientos m
    ),
    BandejaBase AS (
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
            t.paso_actual,
            t.destinatario_nombre,
            t.destinatario_cargo,
            t.destinatario_unidad,
            t.usuario_actual_id,
            ISNULL(uAct.Nombres + ' ' + ISNULL(uAct.Apellidos, ''), uAct.login) AS usuario_actual_nombre,
            t.ubicacion_actual_id,
            uoAct.codU   AS cod_u_actual,
            uoAct.nombre AS ubicacion_actual_nombre,
            uoAct.sigla  AS ubicacion_actual_sigla,
            t.fecha_creacion,
            t.fecha_limite_respuesta,
            t.fecha_fin_informe,
            CASE
                WHEN t.fecha_limite_respuesta IS NOT NULL
                 AND t.fecha_limite_respuesta < @Hoy
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS es_vencido,
            CASE
                WHEN t.fecha_limite_respuesta IS NOT NULL
                THEN DATEDIFF(DAY, @Hoy, t.fecha_limite_respuesta)
                ELSE NULL
            END AS dias_restantes,
            (SELECT COUNT(1) FROM dbo.adjuntos a WHERE a.tramite_id = t.id AND a.activo = 1) AS nro_adjuntos,
            ultMov.actividad_nombre     AS actividad_actual,
            ultMov.fecha_envio          AS ult_fecha_envio,
            ultMov.fecha_recepcion      AS ult_fecha_recepcion,
            ultMov.proveido             AS ult_proveido,
            ultMov.instrumento_generado AS ult_instrumento_generado,
            t.sesion_pleno_nro,
            t.sesion_pleno_resultado,
            t.firma_presidencia,
            t.firma_secretaria,
            t.despacho_final_cite,
            -- Custodia estricta + estados operativos (AQUÍ ESTABA EL BUG)
            CASE
                WHEN (t.usuario_actual_id = @UsuarioId
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS es_mi_recibido,
            CASE
                WHEN (t.usuario_actual_id = @UsuarioId
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS puede_operar,
            CASE
                WHEN (t.creado_por = @UsuarioId
                      OR t.ubicacion_org_id = @UbicacionOrgId
                      OR EXISTS (SELECT 1 FROM dbo.movimientos m WHERE m.tramite_id = t.id AND (m.usuario_origen_id = @UsuarioId OR m.ubicacion_origen_id = @UbicacionOrgId)))
                 AND (t.usuario_actual_id <> @UsuarioId
                      OR t.ubicacion_actual_id <> @UbicacionOrgId
                      OR t.estado IN ('EN_TRANSITO', 'POR_RECIBIR', 'CONCLUIDO', 'RECHAZADO_PLENO'))
                THEN 1 ELSE 0
            END AS es_mi_despachado
        FROM dbo.tramites t
        INNER JOIN dbo.tipos_proceso tp     ON tp.id = t.tipo_proceso_id
        LEFT JOIN dbo.TEmpleados uAct       ON uAct.id = t.usuario_actual_id
        LEFT JOIN dbo.ubicaciones_org uoAct ON uoAct.id = t.ubicacion_actual_id
        LEFT JOIN UltimosMovimientos ultMov ON ultMov.tramite_id = t.id AND ultMov.rn = 1
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @Gestion)
    )
    SELECT
        b.id, b.numero_correlativo, b.gestion, b.tipo_proceso_id,
        b.tipo_proceso_codigo, b.tipo_proceso_nombre, b.tipo_categoria,
        b.remitente, b.institucion_remitente, b.cite_externo, b.referencia,
        b.prioridad, b.nro_hojas, b.nro_anexos, b.estado, b.paso_actual,
        b.actividad_actual, b.destinatario_nombre, b.destinatario_cargo, b.destinatario_unidad,
        b.usuario_actual_id, b.usuario_actual_nombre,
        b.ubicacion_actual_id, b.cod_u_actual, b.ubicacion_actual_nombre, b.ubicacion_actual_sigla,
        b.fecha_creacion, b.ult_fecha_envio AS fecha_envio, b.ult_fecha_recepcion AS fecha_recepcion,
        b.fecha_limite_respuesta, b.fecha_fin_informe,
        b.es_vencido, b.dias_restantes, b.nro_adjuntos,
        b.ult_proveido AS ultimo_proveido, b.ult_instrumento_generado AS ultimo_instrumento_generado,
        b.sesion_pleno_nro, b.sesion_pleno_resultado,
        b.firma_presidencia, b.firma_secretaria, b.despacho_final_cite,
        b.puede_operar,
        CASE WHEN b.es_mi_recibido = 1 THEN 'RECIBIDO' ELSE 'DESPACHADO' END AS bandeja_tipo
    FROM BandejaBase b
    WHERE
        (
            (@VerGlobal = 1)
            OR (@Bandeja = 'RECIBIDOS' AND b.es_mi_recibido = 1)
            OR (@Bandeja = 'DESPACHADOS' AND b.es_mi_despachado = 1)
            OR (@Bandeja = 'TODOS' AND (b.es_mi_recibido = 1 OR b.es_mi_despachado = 1 OR @VerGlobal = 1))
        )
        AND (@Categoria IS NULL OR b.tipo_categoria = @Categoria)
        AND (@Estado IS NULL OR b.estado = @Estado)
        AND (@SoloVencidos = 0 OR b.es_vencido = 1)
        AND (
            @Search IS NULL
            OR b.numero_correlativo LIKE '%' + @Search + '%'
            OR b.referencia LIKE '%' + @Search + '%'
            OR b.remitente LIKE '%' + @Search + '%'
            OR ISNULL(b.cite_externo, '') LIKE '%' + @Search + '%'
            OR ISNULL(b.sesion_pleno_nro, '') LIKE '%' + @Search + '%'
            OR ISNULL(b.despacho_final_cite, '') LIKE '%' + @Search + '%'
        )
    ORDER BY
        b.es_vencido DESC,
        CASE b.prioridad WHEN 'URGENTE' THEN 1 WHEN 'ALTA' THEN 2 ELSE 3 END ASC,
        b.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. usp_Escritorio_ObtenerResumen
--    (copia íntegra de 041; único cambio: filtro de estado en es_recibido)
--    La rama @VerGlobal = 1 se conserva: los contadores globales ya filtran
--    por estado por su cuenta.
-- ─────────────────────────────────────────────────────────────────────────────
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
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS es_vencido,
            CASE
                WHEN @VerGlobal = 1 THEN 1
                WHEN (t.usuario_actual_id = @UsuarioId
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS es_recibido,
            CASE
                WHEN (t.creado_por = @UsuarioId
                      OR t.ubicacion_org_id = @UbicacionOrgId
                      OR EXISTS (SELECT 1 FROM dbo.movimientos m WHERE m.tramite_id = t.id AND (m.usuario_origen_id = @UsuarioId OR m.ubicacion_origen_id = @UbicacionOrgId)))
                 AND (t.usuario_actual_id <> @UsuarioId
                      OR t.ubicacion_actual_id <> @UbicacionOrgId
                      OR t.estado IN ('EN_TRANSITO', 'POR_RECIBIR', 'CONCLUIDO', 'RECHAZADO_PLENO'))
                THEN 1 ELSE 0
            END AS es_despachado
        FROM dbo.tramites t
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @AnioActual)
    )
    SELECT
        @AnioActual AS gestion,
        COUNT(CASE WHEN es_recibido = 1 AND estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO') THEN 1 END) AS total_bandeja,
        COUNT(CASE WHEN es_recibido = 1 AND estado IN ('POR_RECIBIR', 'EN_TRANSITO') THEN 1 END) AS por_recibir,
        COUNT(CASE WHEN es_recibido = 1 AND estado IN ('EN_ATENCION', 'CREADO', 'RECIBIDO', 'ATENDIDO') THEN 1 END) AS en_atencion,
        COUNT(CASE WHEN es_recibido = 1 AND estado = 'ATENDIDO' THEN 1 END) AS atendidos,
        COUNT(CASE WHEN es_despachado = 1 THEN 1 END) AS total_despachados,
        COUNT(CASE WHEN es_despachado = 1 AND estado IN ('POR_RECIBIR', 'EN_TRANSITO') THEN 1 END) AS despachados_sin_confirmar,
        COUNT(CASE WHEN es_despachado = 1 AND estado IN ('EN_ATENCION', 'RECIBIDO', 'ATENDIDO', 'CONCLUIDO', 'APROBADO_PLENO') THEN 1 END) AS despachados_confirmados,
        COUNT(CASE WHEN es_recibido = 1 AND es_vencido = 1 THEN 1 END) AS vencidos,
        COUNT(CASE WHEN es_recibido = 1 AND prioridad IN ('URGENTE', 'ALTA') AND estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO') THEN 1 END) AS urgentes
    FROM BaseCalculo;
END;
GO
