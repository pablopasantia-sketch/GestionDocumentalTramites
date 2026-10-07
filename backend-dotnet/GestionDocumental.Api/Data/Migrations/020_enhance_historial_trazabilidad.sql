-- =============================================================================
-- MIGRACIÓN 020: MEJORA DE DETALLE HISTÓRICO Y TRAZABILIDAD (RF-08.5 - RF-08.9)
-- Sistema Wayka MVP - Sprint 3 (Trazabilidad, Auditoría y Tiempos del Proceso)
-- Base de datos: DB_TRAMITES_EXTERNOS (Microsoft SQL Server T-SQL)
-- =============================================================================

GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Resultset 1: Datos principales del trámite (con tiempo estimado y datos completos)
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.codigo AS tipo_proceso_codigo,
        tp.nombre AS tipo_proceso_nombre,
        tp.tipo_categoria,
        tp.tiempo_estimado_horas,
        t.estado,
        t.remitente,
        t.institucion_remitente,
        t.cite_externo,
        t.referencia,
        t.prioridad,
        t.nro_hojas,
        t.nro_anexos,
        t.instruccion,
        t.destinatario_nombre,
        t.destinatario_cargo,
        t.destinatario_unidad,
        t.cod_u_destino,
        t.cod_cargo_destino,
        t.ci_empleado_destino,
        t.fecha_creacion,
        t.fecha_conclusion,
        t.fecha_limite_respuesta,
        ISNULL(e.Nombres + ' ' + ISNULL(e.Apellidos, ''), e.login) AS creado_por_usuario,
        uo.nombre AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    INNER JOIN dbo.TEmpleados e       ON e.id  = t.creado_por
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_org_id
    WHERE t.id = @Id AND t.activo = 1;

    -- Resultset 2: Historial completo de movimientos con auditoría y tiempos (RF-08.5, RF-08.7, RF-08.8, RF-08.9)
    SELECT
        m.id,
        m.orden,
        m.actividad_nombre AS actividad,
        m.tipo_movimiento,
        -- Origen
        m.usuario_origen_id,
        ISNULL(uoE.Nombres + ' ' + ISNULL(uoE.Apellidos, ''), uoE.login) AS usuario_origen_nombre,
        ISNULL(uoE.cargo_nombre, cOrig.NombreC) AS usuario_origen_cargo,
        ISNULL(uo.nombre, 'Ventanilla Central') AS unidad_origen,
        -- Destino
        m.usuario_destino_id,
        ISNULL(udE.Nombres + ' ' + ISNULL(udE.Apellidos, ''), udE.login) AS usuario_destino_nombre,
        ISNULL(udE.cargo_nombre, cDest.NombreC) AS usuario_destino_cargo,
        ud.nombre AS unidad_destino,
        -- Estado y contenidos
        m.estado_movimiento AS estado,
        m.proveido,
        m.instruccion,
        m.justificacion_retroceso,
        -- Fechas del ciclo de vida
        m.fecha_envio,
        m.fecha_recepcion,
        ISNULL(m.fecha_recepcion, ISNULL(m.fecha_envio, m.created_at)) AS fecha,
        -- Métricas de tiempo (RF-08.8, RF-08.9)
        m.tiempo_estimado_minutos,
        CASE
            -- Si ya fue enviado o derivado al siguiente paso: diferencia entre recepción y envío
            WHEN m.fecha_recepcion IS NOT NULL AND m.fecha_envio IS NOT NULL AND m.fecha_envio >= m.fecha_recepcion
            THEN DATEDIFF(MINUTE, m.fecha_recepcion, m.fecha_envio)
            -- Si está en atención (recepcionado pero sin despachar aún): diferencia desde recepción hasta ahora
            WHEN m.fecha_recepcion IS NOT NULL AND (m.fecha_envio IS NULL OR m.estado_movimiento IN ('EN_ATENCION', 'ATENDIDO'))
            THEN DATEDIFF(MINUTE, m.fecha_recepcion, GETDATE())
            -- Si fue enviado y aún no recepcionado: diferencia desde envío hasta ahora (tiempo en tránsito)
            WHEN m.fecha_envio IS NOT NULL AND m.fecha_recepcion IS NULL
            THEN DATEDIFF(MINUTE, m.fecha_envio, GETDATE())
            ELSE ISNULL(m.tiempo_transcurrido_minutos, 0)
        END AS tiempo_transcurrido_minutos,
        CASE
            WHEN m.fecha_recepcion IS NOT NULL AND (m.fecha_envio IS NULL OR m.estado_movimiento IN ('EN_ATENCION', 'ATENDIDO'))
            THEN 1
            ELSE 0
        END AS es_hasta_hoy
    FROM dbo.movimientos m
    -- Origen Joins
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN dbo.TEmpleados uoE      ON uoE.id = m.usuario_origen_id
    LEFT JOIN dbo.TCargo cOrig        ON cOrig.CodCargo = uoE.cod_cargo
    -- Destino Joins
    LEFT JOIN dbo.ubicaciones_org ud ON ud.id = m.ubicacion_destino_id
    LEFT JOIN dbo.TEmpleados udE      ON udE.id = m.usuario_destino_id
    LEFT JOIN dbo.TCargo cDest        ON cDest.CodCargo = udE.cod_cargo
    WHERE m.tramite_id = @Id
    ORDER BY m.orden ASC;

    -- Resultset 3: Documentos adjuntos activos
    SELECT
        a.id,
        a.tramite_id,
        a.movimiento_id,
        a.nombre_original,
        a.tamano_bytes,
        a.tipo_mime,
        ISNULL(e.Nombres + ' ' + ISNULL(e.Apellidos, ''), e.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    INNER JOIN dbo.TEmpleados e ON e.id = a.subido_por
    WHERE a.tramite_id = @Id AND a.activo = 1
    ORDER BY a.id DESC;
END;
GO
