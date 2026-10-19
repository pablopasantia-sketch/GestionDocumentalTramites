-- =============================================================================
-- Migración 026: Control Reglamentario de Plazos de Elaboración de Informes de Comisión (5 a 15 días)
-- Concejo Municipal de Sucre (CMS)
-- 
-- 1. Asegurar columnas fecha_inicio_informe y dias_plazo_informe en dbo.tramites
-- 2. Procedimiento Almacenado: dbo.usp_Tramites_IniciarInformeComision
-- 3. Actualización de dbo.usp_Tramites_RegistrarAprobacionPleno con bloqueo estricto por plazo vencido
-- 4. Actualización de dbo.usp_Tramites_ObtenerPorId con fecha_inicio_informe y dias_plazo_informe
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columnas en dbo.tramites
-- ─────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.tramites') AND name = 'fecha_inicio_informe'
)
BEGIN
    ALTER TABLE dbo.tramites
    ADD fecha_inicio_informe DATETIME2 NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.tramites') AND name = 'dias_plazo_informe'
)
BEGIN
    ALTER TABLE dbo.tramites
    ADD dias_plazo_informe INT NULL;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Procedimiento Almacenado: dbo.usp_Tramites_IniciarInformeComision
--    Registra el inicio formal de la elaboración de informe con plazo de 5 a 15 días.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_IniciarInformeComision
    @TramiteId          INT,
    @UsuarioId          INT,
    @DiasPlazo          INT,
    @Proveido           NVARCHAR(MAX) = NULL,
    @NuevoMovimientoId  INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
    BEGIN
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;
    END

    IF @DiasPlazo IS NULL OR @DiasPlazo < 5 OR @DiasPlazo > 15
    BEGIN
        THROW 50060, 'El plazo reglamentario para la elaboración del informe de comisión debe ser entre 5 y 15 días hábiles.', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validar trámite
        DECLARE @EstadoActual VARCHAR(30), @UbicacionActualId INT, @Correlativo VARCHAR(50);
        SELECT 
            @EstadoActual = estado,
            @UbicacionActualId = ubicacion_actual_id,
            @Correlativo = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50004, 'El trámite especificado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO')
        BEGIN
            THROW 50005, 'No se puede iniciar elaboración de informe en un trámite Anulado, Bloqueado o Concluido.', 1;
        END

        DECLARE @Ahora DATETIME2 = SYSDATETIME();
        DECLARE @FechaLimite DATETIME2 = DATEADD(DAY, @DiasPlazo, @Ahora);

        -- 1. Actualizar dbo.tramites
        UPDATE dbo.tramites
        SET fecha_inicio_informe   = @Ahora,
            dias_plazo_informe     = @DiasPlazo,
            fecha_limite_respuesta = CAST(@FechaLimite AS DATE),
            updated_at             = @Ahora
        WHERE id = @TramiteId;

        -- 2. Siguiente orden de movimiento
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        -- Resolver ubicación orgánica del usuario si no se tiene
        DECLARE @UbicacionUsuario INT = @UbicacionActualId;
        IF @UbicacionUsuario IS NULL
        BEGIN
            SELECT TOP 1 @UbicacionUsuario = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        -- 3. Registrar movimiento de Inicio de Elaboración de Informe
        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(@Proveido, 'Inicio formal de elaboración de informe de comisión. Plazo reglamentario asignado: ' + CAST(@DiasPlazo AS VARCHAR(10)) + ' días.');
        DECLARE @NomActividad VARCHAR(150) = 'Inicio Elaboración de Informe (' + CAST(@DiasPlazo AS VARCHAR(10)) + ' días CMS)';

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
            instrumento_generado,
            instrumentos_generados,
            fecha_limite_respuesta,
            fecha_envio,
            fecha_recepcion,
            tiempo_estimado_minutos,
            created_at
        ) VALUES (
            @TramiteId,
            @NextOrden,
            'INICIO_INFORME',
            @NomActividad,
            @UsuarioId,
            @UbicacionUsuario,
            @UsuarioId,
            @UbicacionUsuario,
            @EstadoActual,
            @DetalleMov,
            'Elaboración y emisión de informe de comisión dentro del plazo perentorio de ' + CAST(@DiasPlazo AS VARCHAR(10)) + ' días.',
            'INFORME',
            'INFORME',
            @FechaLimite,
            @Ahora,
            @Ahora,
            @DiasPlazo * 24 * 60,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Actualización de dbo.usp_Tramites_RegistrarAprobacionPleno
--    Valida que el plazo de elaboración de informe no se encuentre vencido.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_RegistrarAprobacionPleno
    @TramiteId              INT,
    @UsuarioId              INT,
    @SesionPlenoNro         VARCHAR(100),
    @SesionPlenoFecha       DATETIME2 = NULL,
    @SesionPlenoResultado   VARCHAR(100),
    @Proveido               NVARCHAR(MAX) = NULL,
    @InstrumentoGenerado    VARCHAR(50) = NULL,
    @NuevoMovimientoId      INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
    BEGIN
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;
    END

    IF @SesionPlenoNro IS NULL OR LTRIM(RTRIM(@SesionPlenoNro)) = ''
    BEGIN
        THROW 50042, 'Debe especificar el número o denominación de la Sesión del Pleno del CMS (ej: Sesión Ordinaria N° 045/2026).', 1;
    END

    IF @SesionPlenoResultado IS NULL OR LTRIM(RTRIM(@SesionPlenoResultado)) = ''
    BEGIN
        THROW 50043, 'Debe especificar el resultado del tratamiento en el Pleno (ej: Aprobado por Unanimidad, Aprobado por Mayoría).', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Verificar existencia del trámite
        DECLARE @EstadoActual VARCHAR(30), @UbicacionActualId INT, @FechaLimiteRespuesta DATE, @SesionPlenoExistente VARCHAR(100);
        SELECT 
            @EstadoActual = estado,
            @UbicacionActualId = ubicacion_actual_id,
            @FechaLimiteRespuesta = fecha_limite_respuesta,
            @SesionPlenoExistente = sesion_pleno_nro
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50004, 'El trámite especificado no existe o ha sido eliminado.', 1;
        END

        IF @EstadoActual = 'ANULADO'
        BEGIN
            THROW 50005, 'No se puede registrar aprobación plenario en un trámite que se encuentra ANULADO.', 1;
        END

        -- Control estricto de cierre de sistema por vencimiento de plazo reglamentario de 5 a 15 días
        IF @SesionPlenoExistente IS NULL AND @FechaLimiteRespuesta IS NOT NULL AND @FechaLimiteRespuesta < CAST(GETDATE() AS DATE)
        BEGIN
            THROW 50055, 'SISTEMA CERRADO: El plazo reglamentario de 5 a 15 días para la elaboración del informe de comisión ha vencido. Por normativa del Concejo Municipal de Sucre, el sistema se encuentra bloqueado para la recepción o aprobación de informes extemporáneos.', 1;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @FechaSesion DATETIME2 = ISNULL(@SesionPlenoFecha, @Ahora);

        -- Determinar nuevo estado del trámite
        DECLARE @NuevoEstado VARCHAR(30);
        IF @SesionPlenoResultado LIKE '%RECHAZADO%'
            SET @NuevoEstado = 'RECHAZADO_PLENO';
        ELSE
            SET @NuevoEstado = 'APROBADO_PLENO';

        -- 1. Actualizar dbo.tramites
        UPDATE dbo.tramites
        SET sesion_pleno_nro       = @SesionPlenoNro,
            sesion_pleno_fecha     = @FechaSesion,
            sesion_pleno_resultado = @SesionPlenoResultado,
            estado                 = @NuevoEstado,
            updated_at             = @Ahora
        WHERE id = @TramiteId;

        -- 2. Calcular siguiente orden
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        -- Resolver ubicación orgánica del usuario si no se tiene
        DECLARE @UbicacionUsuario INT = @UbicacionActualId;
        IF @UbicacionUsuario IS NULL
        BEGIN
            SELECT TOP 1 @UbicacionUsuario = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        -- 3. Registrar movimiento en dbo.movimientos
        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(@Proveido, 'Sometido a consideración y resolución en Sesión del Pleno Camaral del CMS. Resultado: ' + @SesionPlenoResultado);
        DECLARE @NomActividad VARCHAR(150) = 'Aprobación en Sesión del Pleno del CMS (' + @SesionPlenoNro + ')';

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
            instrumento_generado,
            fecha_envio,
            fecha_recepcion,
            tiempo_estimado_minutos,
            created_at
        ) VALUES (
            @TramiteId,
            @NextOrden,
            'APROBACION_PLENO',
            @NomActividad,
            @UsuarioId,
            @UbicacionUsuario,
            @UsuarioId,
            @UbicacionUsuario,
            @NuevoEstado,
            @DetalleMov,
            'Sesión plenaria completada reglamentariamente con resultado: ' + @SesionPlenoResultado,
            ISNULL(@InstrumentoGenerado, 'RESOLUCION_AUTONOMICAMUNICIPAL'),
            @Ahora,
            @Ahora,
            0,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Actualización de dbo.usp_Tramites_ObtenerPorId
--    Devuelve fecha_inicio_informe y dias_plazo_informe en Resultset 1
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

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
