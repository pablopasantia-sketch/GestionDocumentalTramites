-- Migración 017: Stored Procedures para Derivación Libre (Avanzar) y Conclusión de Trámites
-- DB_TRAMITES_EXTERNOS T-SQL - Sprint 3 (RF-03.9, RF-04.5, RF-05.1, RF-05.6, RF-05.7, RF-06.1)

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_Derivar: Realiza la derivación libre / avance institucional del trámite
-- a una nueva unidad, cargo y funcionario, o concluye/archiva el proceso.
-- ─────────────────────────────────────────────────────────────────────────────
GO
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
                fecha_envio,
                fecha_recepcion,
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
                @Ahora,
                @Ahora,
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
            fecha_envio,
            fecha_recepcion,
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
            @Ahora,
            NULL,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        -- 5. Actualizar Trámite al nuevo custodio y estado POR_RECIBIR
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
