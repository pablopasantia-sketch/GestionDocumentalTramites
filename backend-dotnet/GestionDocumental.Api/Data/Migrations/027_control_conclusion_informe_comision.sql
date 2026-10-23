-- =============================================================================
-- Migración 027: Control de Conclusión de Informe de Comisión (5 a 15 días)
-- Concejo Municipal de Sucre (CMS)
-- 
-- 1. Asegurar columna fecha_fin_informe en dbo.tramites
-- 2. Stored Procedure dbo.usp_Tramites_ConcluirInformeComision
-- 3. Actualización de dbo.usp_Tramites_ObtenerPorId con fecha_fin_informe y @Id / @TramiteId
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Asegurar columna fecha_fin_informe en dbo.tramites
-- ─────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.tramites') AND name = 'fecha_fin_informe'
)
BEGIN
    ALTER TABLE dbo.tramites
    ADD fecha_fin_informe DATETIME2 NULL;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Stored Procedure: dbo.usp_Tramites_ConcluirInformeComision
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ConcluirInformeComision
    @TramiteId       INT,
    @UsuarioId       INT,
    @Proveido        NVARCHAR(MAX) = NULL,
    @NuevoMovimientoId INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EstadoActual VARCHAR(30),
                @FechaInicio DATETIME2,
                @FechaLimite DATE,
                @UbicacionActualId INT;

        SELECT 
            @EstadoActual      = estado,
            @FechaInicio       = fecha_inicio_informe,
            @FechaLimite       = fecha_limite_respuesta,
            @UbicacionActualId = ubicacion_actual_id
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50004, 'El trámite especificado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO')
        BEGIN
            THROW 50005, 'No se puede concluir el informe en un trámite Anulado, Bloqueado o Concluido.', 1;
        END

        DECLARE @Ahora DATETIME2 = SYSDATETIME();

        -- Si no se había iniciado, se fija fecha de inicio simultánea
        IF @FechaInicio IS NULL
        BEGIN
            SET @FechaInicio = @Ahora;
            UPDATE dbo.tramites
            SET fecha_inicio_informe = @Ahora,
                dias_plazo_informe = ISNULL(dias_plazo_informe, 10)
            WHERE id = @TramiteId;
        END

        -- Verificar si el plazo ya había expirado (fecha_limite_respuesta < Hoy)
        IF @FechaLimite IS NOT NULL AND CAST(@Ahora AS DATE) > @FechaLimite
        BEGIN
            THROW 50006, 'SISTEMA CERRADO: El plazo reglamentario de elaboración de informe ha expirado. Por normativa CMS, no se admiten informes extemporáneos.', 1;
        END

        -- 1. Actualizar fecha_fin_informe en dbo.tramites
        UPDATE dbo.tramites
        SET fecha_fin_informe = @Ahora,
            updated_at        = @Ahora
        WHERE id = @TramiteId;

        -- 2. Determinar siguiente orden de movimiento
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @UbicacionUsuario INT = @UbicacionActualId;
        IF @UbicacionUsuario IS NULL
        BEGIN
            SELECT TOP 1 @UbicacionUsuario = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        -- 3. Registrar movimiento de conclusión de informe
        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(@Proveido, 'Informe técnico de comisión concluido satisfactoriamente. Trámite habilitado para su tratamiento en Sesión del Pleno Camaral.');
        DECLARE @NomActividad VARCHAR(150) = 'Conclusión de Informe de Comisión CMS';

        INSERT INTO dbo.movimientos (
            tramite_id,
            orden,
            tipo_movimiento,
            actividad_nombre,
            usuario_origen_id,
            ubicacion_origen_id,
            usuario_destino_id,
            ubicacion_destino_id,
            estado_movimiento,
            proveido,
            instruccion,
            created_at
        ) VALUES (
            @TramiteId,
            @NextOrden,
            'FIN_INFORME',
            @NomActividad,
            @UsuarioId,
            @UbicacionUsuario,
            @UsuarioId,
            @UbicacionUsuario,
            @EstadoActual,
            @DetalleMov,
            'HABILITADO_PLENO',
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Actualización de dbo.usp_Tramites_ObtenerPorId
--    Devuelve fecha_inicio_informe, dias_plazo_informe y fecha_fin_informe
--    Acepta tanto @Id como @TramiteId
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT = NULL,
    @TramiteId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @Id = ISNULL(@Id, @TramiteId);

    IF @Id IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.tramites WHERE id = @Id AND activo = 1)
    BEGIN
        THROW 50004, 'El trámite solicitado no existe o fue dado de baja.', 1;
    END

    -- Resultset 1: Datos principales del trámite (alineado al Concejo Municipal de Sucre)
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.codigo AS tipo_proceso_codigo,
        tp.nombre AS tipo_proceso_nombre,
        tp.tipo_categoria,
        ISNULL(t.tipo_corres, 'EXTERNA') AS tipo_corres,
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
        t.fecha_inicio_informe,
        t.dias_plazo_informe,
        t.fecha_fin_informe,
        ISNULL(e.Nombres + ' ' + ISNULL(e.Apellidos, ''), e.login) AS creado_por_usuario,
        uo.nombre AS unidad_origen,
        -- Atributos del Circuito Plenario y Firmas Duales CMS
        t.sesion_pleno_nro,
        t.sesion_pleno_fecha,
        t.sesion_pleno_resultado,
        t.firma_presidencia,
        t.firma_presidencia_fecha,
        t.firma_presidencia_usuario,
        t.firma_secretaria,
        t.firma_secretaria_fecha,
        t.firma_secretaria_usuario,
        t.despacho_final_fecha,
        t.despacho_final_cite,
        t.despacho_final_destinatario
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    INNER JOIN dbo.TEmpleados e       ON e.id  = t.creado_por
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_org_id
    WHERE t.id = @Id AND t.activo = 1;

    -- Resultset 2: Historial completo de movimientos con instrumentos generados y fecha_limite_respuesta
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
        ISNULL(ud.nombre, 'Unidad de Destino') AS unidad_destino,
        -- Estado e Instrucciones
        m.estado_movimiento AS estado,
        m.proveido,
        m.instruccion,
        m.justificacion_retroceso,
        m.instrumento_generado,
        ISNULL(m.instrumentos_generados, m.instrumento_generado) AS instrumentos_generados,
        m.fecha_limite_respuesta,
        -- Fechas del ciclo de vida
        m.fecha_envio,
        m.fecha_recepcion,
        ISNULL(m.fecha_recepcion, ISNULL(m.fecha_envio, m.created_at)) AS fecha,
        -- Métricas de tiempo (RF-08.8, RF-08.9)
        m.tiempo_estimado_minutos,
        CASE
            WHEN m.fecha_recepcion IS NOT NULL AND m.fecha_envio IS NOT NULL AND m.fecha_envio >= m.fecha_recepcion
            THEN DATEDIFF(MINUTE, m.fecha_recepcion, m.fecha_envio)
            WHEN m.fecha_recepcion IS NOT NULL AND (m.fecha_envio IS NULL OR m.estado_movimiento IN ('EN_ATENCION', 'ATENDIDO'))
            THEN DATEDIFF(MINUTE, m.fecha_recepcion, GETDATE())
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
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id   = m.ubicacion_origen_id
    LEFT JOIN dbo.TEmpleados uoE      ON uoE.id  = m.usuario_origen_id
    LEFT JOIN dbo.TCargo cOrig        ON cOrig.CodCargo = uoE.cod_cargo
    LEFT JOIN dbo.ubicaciones_org ud  ON ud.id   = m.ubicacion_destino_id
    LEFT JOIN dbo.TEmpleados udE      ON udE.id  = m.usuario_destino_id
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
