-- =============================================================================
-- MIGRACIÓN 021: ALINEACIÓN CMS - INSTRUMENTOS LEGISLATIVOS Y PLAZOS DE COMISIÓN
-- Sistema Wayka - Adenda Operativa Post-Sprint 3 (Concejo Municipal de Sucre - CMS)
-- Base de datos: DB_TRAMITES_EXTERNOS (Microsoft SQL Server T-SQL)
-- =============================================================================

-- 1. Incorporación del campo instrumento_generado en dbo.movimientos
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.movimientos') AND name = 'instrumento_generado'
)
BEGIN
    ALTER TABLE dbo.movimientos ADD instrumento_generado VARCHAR(50) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.check_constraints 
    WHERE object_id = OBJECT_ID(N'dbo.CK_movimientos_instrumento_generado')
)
BEGIN
    ALTER TABLE dbo.movimientos 
    ADD CONSTRAINT CK_movimientos_instrumento_generado 
    CHECK (instrumento_generado IS NULL OR instrumento_generado IN ('PIE', 'PIO', 'MINUTA', 'RESOLUCION', 'NOTA_EXTERNA', 'INFORME'));
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Actualización de dbo.usp_Tramites_Derivar
--    Soporta @InstrumentoGenerado ('PIE', 'PIO', 'MINUTA', 'RESOLUCION', 'NOTA_EXTERNA', 'INFORME')
--    y recálculo dinámico de fecha_limite_respuesta según @DiasPlazo (5 a 15 días reglamentarios de comisión).
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Derivar
    @TramiteId              INT,
    @UsuarioOrigenId        INT,
    @UbicacionOrigenId       INT,
    @CodUDestino            SMALLINT        = NULL,
    @CodCargoDestino        SMALLINT        = NULL,
    @CiEmpleadoDestino      INT             = NULL,
    @DestinatarioNombre     NVARCHAR(150)   = NULL,
    @DestinatarioCargo      NVARCHAR(150)   = NULL,
    @DestinatarioUnidad     NVARCHAR(150)   = NULL,
    @ActividadNombre        VARCHAR(150)    = NULL,
    @Proveido               NVARCHAR(MAX),
    @Instruccion            VARCHAR(255)    = NULL,
    @Prioridad              VARCHAR(20)     = NULL,
    @DiasPlazo              INT             = NULL,
    @EsConclusion           BIT             = 0,
    @OtrosDestinatariosJson NVARCHAR(MAX)   = NULL,
    @InstrumentoGenerado    VARCHAR(50)     = NULL,
    @NuevoMovimientoId      INT             OUTPUT
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
            THROW 50030, 'El trámite indicado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO')
        BEGIN
            THROW 50031, 'El trámite no puede derivarse porque se encuentra en estado Bloqueado, Anulado o Concluido.', 1;
        END

        -- Validar instrumento legislativo generado si fue proporcionado
        IF @InstrumentoGenerado IS NOT NULL AND LTRIM(RTRIM(@InstrumentoGenerado)) <> ''
        BEGIN
            SET @InstrumentoGenerado = UPPER(LTRIM(RTRIM(@InstrumentoGenerado)));
            IF @InstrumentoGenerado NOT IN ('PIE', 'PIO', 'MINUTA', 'RESOLUCION', 'NOTA_EXTERNA', 'INFORME')
            BEGIN
                THROW 50060, 'El instrumento legislativo generado no es válido. Debe ser PIE, PIO, MINUTA, RESOLUCION, NOTA_EXTERNA o INFORME.', 1;
            END
        END
        ELSE
        BEGIN
            SET @InstrumentoGenerado = NULL;
        END

        -- Validar coherencia del plazo dinámico si fue especificado
        IF @DiasPlazo IS NOT NULL AND @DiasPlazo <= 0
        BEGIN
            THROW 50034, 'El plazo en días debe ser un número entero positivo (5 a 15 días reglamentarios de comisión).', 1;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1 
        FROM dbo.movimientos 
        WHERE tramite_id = @TramiteId;

        -- 2. Caso Conclusión / Archivado del Trámite (RF-05.7)
        IF @EsConclusion = 1
        BEGIN
            DECLARE @ActividadConc VARCHAR(150) = ISNULL(@ActividadNombre, 'Conclusión y Archivado de Trámite');

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
                'CONCLUSION',
                @ActividadConc,
                @UsuarioOrigenId,
                @UbicacionOrigenId,
                @UsuarioOrigenId,
                @UbicacionOrigenId,
                'CONCLUIDO',
                @Proveido,
                ISNULL(@Instruccion, 'Trámite Concluido y Archivado'),
                @InstrumentoGenerado,
                @Ahora,
                @Ahora,
                0,
                @Ahora
            );

            SET @NuevoMovimientoId = SCOPE_IDENTITY();

            UPDATE dbo.tramites
            SET estado              = 'CONCLUIDO',
                fecha_conclusion    = @Ahora,
                updated_at          = @Ahora
            WHERE id = @TramiteId;

            COMMIT TRANSACTION;
            RETURN;
        END

        -- 3. Caso Derivación Libre a Destinatario Institucional
        IF @CodUDestino IS NULL AND @DestinatarioUnidad IS NULL
        BEGIN
            THROW 50032, 'Debe especificar la Unidad Institucional de destino para la derivación.', 1;
        END

        -- Resolver ID de ubicación orgánica a partir de codU
        DECLARE @UbicacionDestinoId INT = NULL;
        IF @CodUDestino IS NOT NULL
        BEGIN
            SELECT TOP 1 @UbicacionDestinoId = id 
            FROM dbo.ubicaciones_org 
            WHERE codU = @CodUDestino;

            IF @UbicacionDestinoId IS NULL
            BEGIN
                SELECT TOP 1 @UbicacionDestinoId = id 
                FROM dbo.ubicaciones_org 
                WHERE id = @CodUDestino;
            END
        END

        IF @UbicacionDestinoId IS NULL
        BEGIN
            -- Fallback si no está mapeado: usar la primera unidad activa
            SELECT TOP 1 @UbicacionDestinoId = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        -- Resolver ID de funcionario a partir del CI del empleado
        DECLARE @UsuarioDestinoId INT = NULL;
        IF @CiEmpleadoDestino IS NOT NULL
        BEGIN
            SELECT TOP 1 @UsuarioDestinoId = id 
            FROM dbo.TEmpleados 
            WHERE CI = @CiEmpleadoDestino;
        END

        -- Resolver nombres para visualización institucional si no vinieron explícitos
        DECLARE @NomUnidad NVARCHAR(150) = @DestinatarioUnidad;
        IF @NomUnidad IS NULL AND @CodUDestino IS NOT NULL
        BEGIN
            SELECT @NomUnidad = NombU FROM dbo.TUnidad WHERE CodU = @CodUDestino;
        END

        DECLARE @NomCargo NVARCHAR(150) = @DestinatarioCargo;
        IF @NomCargo IS NULL AND @CodCargoDestino IS NOT NULL
        BEGIN
            SELECT @NomCargo = NombreC FROM dbo.TCargo WHERE CodCargo = @CodCargoDestino;
        END

        DECLARE @NomDest NVARCHAR(150) = @DestinatarioNombre;
        IF @NomDest IS NULL AND @CiEmpleadoDestino IS NOT NULL
        BEGIN
            SELECT @NomDest = LTRIM(RTRIM(Nombres + ' ' + ISNULL(Apellidos, '')))
            FROM dbo.TEmpleados
            WHERE CI = @CiEmpleadoDestino;
        END

        DECLARE @ActividadDeriv VARCHAR(150) = ISNULL(@ActividadNombre, 'Derivación a ' + ISNULL(@NomUnidad, 'Unidad de Destino'));

        -- 4. Registrar Movimiento de Derivación (Salida de la mesa actual hacia el nuevo destino)
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
            'DERIVACION',
            @ActividadDeriv,
            @UsuarioOrigenId,
            @UbicacionOrigenId,
            @UsuarioDestinoId,
            @UbicacionDestinoId,
            'POR_RECIBIR',
            @Proveido,
            @Instruccion,
            @InstrumentoGenerado,
            @Ahora,
            NULL,
            CASE WHEN @DiasPlazo IS NOT NULL AND @DiasPlazo > 0 THEN @DiasPlazo * 24 * 60 ELSE 0 END,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        -- 5. Actualizar Trámite al nuevo custodio y estado POR_RECIBIR
        -- Recálculo dinámico de fecha límite si se especificó plazo de comisión
        DECLARE @NuevaFechaLimite DATE = NULL;
        IF @DiasPlazo IS NOT NULL AND @DiasPlazo > 0
        BEGIN
            SET @NuevaFechaLimite = CAST(DATEADD(DAY, @DiasPlazo, @Ahora) AS DATE);
        END

        UPDATE dbo.tramites
        SET estado                  = 'POR_RECIBIR',
            usuario_actual_id       = @UsuarioDestinoId,
            ubicacion_actual_id     = @UbicacionDestinoId,
            cod_u_destino           = @CodUDestino,
            cod_cargo_destino       = @CodCargoDestino,
            ci_empleado_destino     = @CiEmpleadoDestino,
            destinatario_nombre     = @NomDest,
            destinatario_cargo      = @NomCargo,
            destinatario_unidad     = @NomUnidad,
            prioridad               = ISNULL(@Prioridad, prioridad),
            instruccion             = ISNULL(@Instruccion, instruccion),
            fecha_limite_respuesta  = ISNULL(@NuevaFechaLimite, fecha_limite_respuesta),
            otros_destinatarios_json = @OtrosDestinatariosJson,
            updated_at              = @Ahora
        WHERE id = @TramiteId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Actualización de dbo.usp_Tramites_MarcarAtendido
--    Soporta persistencia y validación de @InstrumentoGenerado
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_MarcarAtendido
    @TramiteId              INT,
    @UsuarioId              INT,
    @UbicacionOrgId         INT,
    @Proveido               NVARCHAR(MAX),
    @ActividadNombre        VARCHAR(150)    = NULL,
    @InstrumentoGenerado    VARCHAR(50)     = NULL,
    @NuevoMovimientoId      INT             OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar existencia y estado del trámite
        DECLARE @EstadoActual VARCHAR(30), @Correlativo VARCHAR(50), @UsuarioActualId INT, @UbicacionActualId INT;
        SELECT 
            @EstadoActual = estado, 
            @Correlativo = numero_correlativo,
            @UsuarioActualId = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50050, 'El trámite indicado no existe o se encuentra inactivo.', 1;
        END

        IF @EstadoActual IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO')
        BEGIN
            THROW 50051, 'El trámite se encuentra en estado Concluido, Anulado o Bloqueado y no puede ser modificado.', 1;
        END

        IF @EstadoActual = 'POR_RECIBIR'
        BEGIN
            THROW 50052, 'El trámite se encuentra pendiente de recepción. Debe recepcionarlo primero antes de concluir su atención.', 1;
        END

        IF @Proveido IS NULL OR LTRIM(RTRIM(@Proveido)) = ''
        BEGIN
            THROW 50053, 'Debe ingresar una nota de informe, dictamen técnico o proveído de atención (mínimo 3 caracteres).', 1;
        END

        -- Validar instrumento legislativo generado si fue proporcionado
        IF @InstrumentoGenerado IS NOT NULL AND LTRIM(RTRIM(@InstrumentoGenerado)) <> ''
        BEGIN
            SET @InstrumentoGenerado = UPPER(LTRIM(RTRIM(@InstrumentoGenerado)));
            IF @InstrumentoGenerado NOT IN ('PIE', 'PIO', 'MINUTA', 'RESOLUCION', 'NOTA_EXTERNA', 'INFORME')
            BEGIN
                THROW 50060, 'El instrumento legislativo generado no es válido. Debe ser PIE, PIO, MINUTA, RESOLUCION, NOTA_EXTERNA o INFORME.', 1;
            END
        END
        ELSE
        BEGIN
            SET @InstrumentoGenerado = NULL;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();

        -- 2. Actualizar estado del trámite a ATENDIDO (listo para despachar)
        UPDATE dbo.tramites
        SET estado              = 'ATENDIDO',
            usuario_actual_id   = @UsuarioId,
            ubicacion_actual_id = @UbicacionOrgId,
            updated_at          = @Ahora
        WHERE id = @TramiteId;

        -- 3. Actualizar o registrar en movimientos
        DECLARE @UltimoMovId INT, @UltimoOrden INT, @UltimoEstadoMov VARCHAR(30);
        SELECT TOP 1 
            @UltimoMovId = id,
            @UltimoOrden = orden,
            @UltimoEstadoMov = estado_movimiento
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId
        ORDER BY orden DESC, id DESC;

        -- Si el último movimiento está activo en la misma oficina, actualizarlo a ATENDIDO
        IF @UltimoMovId IS NOT NULL AND @UltimoEstadoMov IN ('EN_ATENCION', 'RECIBIDO')
        BEGIN
            UPDATE dbo.movimientos
            SET estado_movimiento       = 'ATENDIDO',
                proveido                = CASE 
                                            WHEN proveido IS NOT NULL AND LTRIM(RTRIM(proveido)) <> '' 
                                            THEN proveido + CHAR(13) + CHAR(10) + 'Atención concluida: ' + @Proveido
                                            ELSE @Proveido 
                                          END,
                actividad_nombre        = ISNULL(@ActividadNombre, actividad_nombre),
                instrumento_generado    = ISNULL(@InstrumentoGenerado, instrumento_generado)
            WHERE id = @UltimoMovId;

            SET @NuevoMovimientoId = @UltimoMovId;
        END
        ELSE
        BEGIN
            -- Insertar nuevo movimiento interno tipo ATENCION / EVALUACION
            DECLARE @NomActividad VARCHAR(150) = ISNULL(@ActividadNombre, 'Informe y atención técnica concluida');

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
                created_at
            ) VALUES (
                @TramiteId,
                ISNULL(@UltimoOrden, 0) + 1,
                'EVALUACION',
                @NomActividad,
                @UsuarioId,
                @UbicacionOrgId,
                @UsuarioId,
                @UbicacionOrgId,
                'ATENDIDO',
                @Proveido,
                'Listo para despacho institucional',
                @InstrumentoGenerado,
                NULL,
                @Ahora,
                @Ahora
            );

            SET @NuevoMovimientoId = SCOPE_IDENTITY();
        END

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
--    Proyecta m.instrumento_generado en el Resultset 2 (Movimientos Timeline)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Resultset 1: Datos principales del trámite
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

    -- Resultset 2: Historial completo de movimientos con instrumento generado y auditoría
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
        m.instrumento_generado,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Actualización de dbo.usp_Escritorio_ListarBandeja
--    Proyecta ult_instrumento_generado en la vista agregada de bandejas
-- ─────────────────────────────────────────────────────────────────────────────
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
            ultMov.actividad_nombre     AS actividad_actual,
            ultMov.fecha_envio          AS ult_fecha_envio,
            ultMov.fecha_recepcion      AS ult_fecha_recepcion,
            ultMov.proveido             AS ult_proveido,
            ultMov.instrumento_generado AS ult_instrumento_generado,
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
                m.proveido,
                m.instrumento_generado
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
        b.ult_fecha_envio              AS fecha_envio,
        b.ult_fecha_recepcion          AS fecha_recepcion,
        b.fecha_limite_respuesta,
        b.es_vencido,
        b.dias_restantes,
        b.nro_adjuntos,
        b.ult_proveido                 AS ultimo_proveido,
        b.ult_instrumento_generado     AS ultimo_instrumento_generado,
        b.bandeja_tipo
    FROM BandejaBase b
    WHERE
        -- Filtro por Bandeja seleccionada
        (
            (@Bandeja = 'RECIBIDOS' AND b.es_mi_recibido = 1)
            OR
            (@Bandeja = 'DESPACHADOS' AND b.es_mi_despachado = 1)
            OR
            (@Bandeja = 'TODOS' AND (b.es_mi_recibido = 1 OR b.es_mi_despachado = 1 OR @VerGlobal = 1))
        )
        -- Filtro por Tipo / Categoría
        AND (@Categoria IS NULL OR b.tipo_categoria = @Categoria)
        -- Filtro por Estado
        AND (@Estado IS NULL OR b.estado = @Estado)
        -- Filtro de alertas por vencimiento
        AND (@SoloVencidos = 0 OR b.es_vencido = 1)
        -- Búsqueda textual
        AND (
            @Search IS NULL 
            OR b.numero_correlativo LIKE '%' + @Search + '%'
            OR b.referencia LIKE '%' + @Search + '%'
            OR b.remitente LIKE '%' + @Search + '%'
            OR ISNULL(b.cite_externo, '') LIKE '%' + @Search + '%'
        )
    ORDER BY 
        CASE WHEN @Bandeja = 'DESPACHADOS' THEN ISNULL(b.ult_fecha_envio, b.fecha_creacion)
             ELSE ISNULL(b.ult_fecha_recepcion, ISNULL(b.ult_fecha_envio, b.fecha_creacion))
        END DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END;
GO
