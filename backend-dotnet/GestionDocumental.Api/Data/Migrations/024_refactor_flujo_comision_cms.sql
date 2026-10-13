-- =============================================================================
-- Migración 024: Refactorización Flujo de Comisión CMS y Alcance Estricto Trámites Externos
-- Concejo Municipal de Sucre (CMS)
-- 
-- 1. Limpieza de Catálogo de Procesos (eliminación/desactivación de notas internas)
-- 2. Aseguramiento de columnas instrumentos_generados y fecha_limite_respuesta en dbo.movimientos
-- 3. Actualización de dbo.usp_Tramites_Derivar y dbo.usp_Tramites_MarcarAtendido con soporte
--    para @DiasPlazo, @InstrumentosGenerados y cálculo dinámico de fecha_limite_respuesta
-- 4. Actualización de dbo.usp_Tramites_ObtenerPorId
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Asegurar columnas en dbo.movimientos
-- ─────────────────────────────────────────────────────────────────────────────
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.movimientos') AND name = 'instrumentos_generados'
)
BEGIN
    ALTER TABLE dbo.movimientos
    ADD instrumentos_generados VARCHAR(250) NULL;
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('dbo.movimientos') AND name = 'fecha_limite_respuesta'
)
BEGIN
    ALTER TABLE dbo.movimientos
    ADD fecha_limite_respuesta DATETIME2 NULL;
END
GO

-- Migrar datos históricos existentes
UPDATE dbo.movimientos
SET instrumentos_generados = instrumento_generado
WHERE instrumentos_generados IS NULL AND instrumento_generado IS NOT NULL;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Limpieza de Catálogo: Eliminar/Desactivar Notas Internas
--    Solo quedan activos los Trámites Externos oficiales del CMS (CM, CDE1, CDE2, CDH1)
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE dbo.tipos_proceso
SET activo = 0
WHERE codigo IN ('CORR-INT', 'INT-NOT', 'NI')
   OR tipo_categoria IN ('INTERNA', 'NOTA_INTERNA')
   OR nombre LIKE '%Interna%';
GO

-- Asegurar los 4 tipos de trámites externos autorizados para el MVP del CMS
MERGE dbo.tipos_proceso AS target
USING (
    VALUES 
        ('CM',   'Correspondencia Municipal Externa', 'CORRESPONDENCIA', 24, 1),
        ('CDE1', 'Contratos Institucionales',        'CORRESPONDENCIA', 48, 1),
        ('CDE2', 'Convenios Interinstitucionales',   'CORRESPONDENCIA', 72, 1),
        ('CDH1', 'Condecoraciones y Distinciones',   'CORRESPONDENCIA', 96, 1)
) AS source (codigo, nombre, tipo_categoria, tiempo_estimado_horas, activo)
ON target.codigo = source.codigo
WHEN MATCHED THEN
    UPDATE SET 
        target.nombre = source.nombre,
        target.tipo_categoria = source.tipo_categoria,
        target.tiempo_estimado_horas = source.tiempo_estimado_horas,
        target.activo = source.activo
WHEN NOT MATCHED THEN
    INSERT (codigo, nombre, tipo_categoria, tiempo_estimado_horas, activo, created_at)
    VALUES (source.codigo, source.nombre, source.tipo_categoria, source.tiempo_estimado_horas, source.activo, GETDATE());
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Stored Procedure: dbo.usp_Tramites_Derivar
--    Soporta @DiasPlazo, @InstrumentoGenerado, @InstrumentosGenerados
--    Calcula automáticamente fecha_limite_respuesta = DATEADD(DAY, @DiasPlazo, SYSDATETIME())
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
    @InstrumentosGenerados  VARCHAR(250)    = NULL,
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

        -- Sincronizar instrumentos generados
        IF @InstrumentosGenerados IS NULL AND @InstrumentoGenerado IS NOT NULL
        BEGIN
            SET @InstrumentosGenerados = @InstrumentoGenerado;
        END
        ELSE IF @InstrumentoGenerado IS NULL AND @InstrumentosGenerados IS NOT NULL
        BEGIN
            SET @InstrumentoGenerado = LEFT(LTRIM(RTRIM(@InstrumentosGenerados)), 50);
        END

        -- Validar coherencia del plazo dinámico si fue especificado
        IF @DiasPlazo IS NOT NULL AND @DiasPlazo <= 0
        BEGIN
            THROW 50034, 'El plazo en días debe ser un número entero positivo (5 a 15 días reglamentarios de comisión).', 1;
        END

        DECLARE @Ahora DATETIME2 = SYSDATETIME();
        DECLARE @FechaLimiteRespuesta DATETIME2 = NULL;
        IF @DiasPlazo IS NOT NULL AND @DiasPlazo > 0
        BEGIN
            SET @FechaLimiteRespuesta = DATEADD(DAY, @DiasPlazo, @Ahora);
        END

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
                instrumentos_generados,
                fecha_limite_respuesta,
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
                @InstrumentosGenerados,
                NULL,
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

        -- 4. Registrar Movimiento de Derivación
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
            @InstrumentosGenerados,
            @FechaLimiteRespuesta,
            @Ahora,
            NULL,
            CASE WHEN @DiasPlazo IS NOT NULL AND @DiasPlazo > 0 THEN @DiasPlazo * 24 * 60 ELSE 0 END,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        -- 5. Actualizar Trámite al nuevo custodio y estado POR_RECIBIR
        UPDATE dbo.tramites
        SET estado                  = 'POR_RECIBIR',
            usuario_actual_id       = @UsuarioDestinoId,
            ubicacion_actual_id     = @UbicacionDestinoId,
            prioridad               = ISNULL(@Prioridad, prioridad),
            instruccion             = ISNULL(@Instruccion, instruccion),
            fecha_limite_respuesta  = ISNULL(CAST(@FechaLimiteRespuesta AS DATE), fecha_limite_respuesta),
            updated_at              = @Ahora
        WHERE id = @TramiteId;

        -- 6. Procesar destinatarios adicionales (Con Copia) si existen
        IF @OtrosDestinatariosJson IS NOT NULL AND ISJSON(@OtrosDestinatariosJson) = 1
        BEGIN
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
            )
            SELECT 
                @TramiteId,
                @NextOrden + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
                'COPIA_INFORMATIVA',
                'Copia a: ' + ISNULL(j.unidad, 'Unidad'),
                @UsuarioOrigenId,
                @UbicacionOrigenId,
                NULL,
                ISNULL(u.id, @UbicacionOrigenId),
                'COPIA',
                @Proveido,
                'Para su conocimiento y fines correspondientes (COPIA)',
                @InstrumentoGenerado,
                @InstrumentosGenerados,
                @FechaLimiteRespuesta,
                @Ahora,
                NULL,
                0,
                @Ahora
            FROM OPENJSON(@OtrosDestinatariosJson) WITH (
                nombre  NVARCHAR(150) '$.nombre',
                cargo   NVARCHAR(150) '$.cargo',
                unidad  NVARCHAR(150) '$.unidad',
                cod_u   SMALLINT      '$.cod_u',
                ci      INT           '$.ci'
            ) j
            LEFT JOIN dbo.ubicaciones_org u ON u.codU = j.cod_u;
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
-- 4. Stored Procedure: dbo.usp_Tramites_MarcarAtendido
--    Soporta @DiasPlazo, @InstrumentoGenerado, @InstrumentosGenerados
--    Calcula automáticamente fecha_limite_respuesta = DATEADD(DAY, @DiasPlazo, SYSDATETIME())
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_MarcarAtendido
    @TramiteId              INT,
    @UsuarioId              INT,
    @UbicacionOrgId         INT,
    @Proveido               NVARCHAR(MAX),
    @ActividadNombre        VARCHAR(150)    = NULL,
    @InstrumentoGenerado    VARCHAR(50)     = NULL,
    @InstrumentosGenerados  VARCHAR(250)    = NULL,
    @DiasPlazo              INT             = NULL,
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

        -- Sincronizar instrumentos generados
        IF @InstrumentosGenerados IS NULL AND @InstrumentoGenerado IS NOT NULL
        BEGIN
            SET @InstrumentosGenerados = @InstrumentoGenerado;
        END
        ELSE IF @InstrumentoGenerado IS NULL AND @InstrumentosGenerados IS NOT NULL
        BEGIN
            SET @InstrumentoGenerado = LEFT(LTRIM(RTRIM(@InstrumentosGenerados)), 50);
        END

        -- Validar coherencia del plazo si vino
        IF @DiasPlazo IS NOT NULL AND @DiasPlazo <= 0
        BEGIN
            THROW 50054, 'El plazo en días debe ser un número entero positivo (5 a 15 días reglamentarios de comisión).', 1;
        END

        DECLARE @Ahora DATETIME2 = SYSDATETIME();
        DECLARE @FechaLimiteRespuesta DATETIME2 = NULL;
        IF @DiasPlazo IS NOT NULL AND @DiasPlazo > 0
        BEGIN
            SET @FechaLimiteRespuesta = DATEADD(DAY, @DiasPlazo, @Ahora);
        END

        -- 2. Actualizar estado del trámite a ATENDIDO (listo para despachar)
        UPDATE dbo.tramites
        SET estado                  = 'ATENDIDO',
            usuario_actual_id       = @UsuarioId,
            ubicacion_actual_id     = @UbicacionOrgId,
            fecha_limite_respuesta  = ISNULL(CAST(@FechaLimiteRespuesta AS DATE), fecha_limite_respuesta),
            updated_at              = @Ahora
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
                instrumento_generado    = ISNULL(@InstrumentoGenerado, instrumento_generado),
                instrumentos_generados  = ISNULL(@InstrumentosGenerados, instrumentos_generados),
                fecha_limite_respuesta  = ISNULL(@FechaLimiteRespuesta, fecha_limite_respuesta)
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
                instrumentos_generados,
                fecha_limite_respuesta,
                fecha_envio,
                fecha_recepcion,
                tiempo_estimado_minutos,
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
                @InstrumentosGenerados,
                @FechaLimiteRespuesta,
                NULL,
                @Ahora,
                CASE WHEN @DiasPlazo IS NOT NULL AND @DiasPlazo > 0 THEN @DiasPlazo * 24 * 60 ELSE 0 END,
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
-- 5. Stored Procedure: dbo.usp_Tramites_ObtenerPorId
--    Proyecta instrumentos_generados y fecha_limite_respuesta en Resultset 2
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
