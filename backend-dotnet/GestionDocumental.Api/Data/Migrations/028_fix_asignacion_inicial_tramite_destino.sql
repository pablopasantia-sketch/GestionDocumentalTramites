-- =============================================================================
-- MIGRACIÓN 028: CORRECCIÓN DE ASIGNACIÓN Y CUSTODIA INICIAL DE TRÁMITES CMS
-- Corrige usp_Tramites_Crear para que el trámite emitido se asigne inmediatamente
-- al destinatario institucional (usuario_actual_id = destinatario, ubicacion_actual_id = ubi_destino)
-- en estado 'POR_RECIBIR', y no se retenga en la bandeja del usuario creador (Ventanilla/Admin).
-- =============================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Crear
    @TipoProcesoId        INT,
    @Remitente            VARCHAR(200),
    @InstitucionRemitente NVARCHAR(200) = NULL,
    @CiteExterno          VARCHAR(100)  = NULL,
    @Referencia           NVARCHAR(MAX),
    @Prioridad            VARCHAR(20)   = 'NORMAL',
    @NroHojas             INT           = 1,
    @NroAnexos            INT           = 0,
    @Instruccion          VARCHAR(255)  = NULL,
    @ProveidoInicial      NVARCHAR(MAX) = NULL,
    @CodUDestino          SMALLINT      = NULL,
    @CodCargoDestino      SMALLINT      = NULL,
    @CiEmpleadoDestino    INT           = NULL,
    @DestinatarioNombre   NVARCHAR(150) = NULL,
    @DestinatarioCargo    NVARCHAR(150) = NULL,
    @DestinatarioUnidad   NVARCHAR(150) = NULL,
    @PrimerDestinatarioId INT           = NULL,
    @TipoCorres           VARCHAR(20)   = 'EXTERNA',
    @UserId               INT,
    @UbicacionId          INT,
    @NuevoTramiteId       INT           OUTPUT,
    @NumeroCorrelativo    VARCHAR(50)   OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Validar Tipo de Trámite Externo
        DECLARE @CodigoTipo VARCHAR(20), @HorasSLA INT;
        SELECT @CodigoTipo = codigo, @HorasSLA = tiempo_estimado_horas
        FROM dbo.tipos_proceso
        WHERE id = @TipoProcesoId AND activo = 1;

        IF @CodigoTipo IS NULL
        BEGIN
            THROW 50013, 'El tipo de trámite seleccionado no existe o está inactivo.', 1;
        END

        -- Normalizar Tipo de Correspondencia (Bifurcación CMS: EXTERNA vs INTERNA)
        DECLARE @TipoCorresNorm VARCHAR(20) = 'EXTERNA';
        IF @TipoCorres IS NOT NULL AND LTRIM(RTRIM(@TipoCorres)) <> ''
        BEGIN
            SET @TipoCorresNorm = UPPER(LTRIM(RTRIM(@TipoCorres)));
            IF @TipoCorresNorm NOT IN ('EXTERNA', 'INTERNA', 'CORRESPONDENCIA')
            BEGIN
                SET @TipoCorresNorm = 'EXTERNA';
            END
        END

        -- 2. Asignar Correlativo Atómico Anual
        DECLARE @Year INT = YEAR(GETDATE());
        DECLARE @NextNum INT;

        IF EXISTS (SELECT 1 FROM dbo.correlativos WHERE tipo_proceso_id = @TipoProcesoId AND gestion = @Year)
        BEGIN
            UPDATE dbo.correlativos
            SET ultimo_numero = ultimo_numero + 1,
                updated_at    = GETDATE()
            WHERE tipo_proceso_id = @TipoProcesoId AND gestion = @Year;

            SELECT @NextNum = ultimo_numero FROM dbo.correlativos
            WHERE tipo_proceso_id = @TipoProcesoId AND gestion = @Year;
        END
        ELSE
        BEGIN
            SET @NextNum = 1;
            INSERT INTO dbo.correlativos (tipo_proceso_id, ubicacion_org_id, gestion, ultimo_numero, formato_patron, created_at, updated_at)
            VALUES (@TipoProcesoId, @UbicacionId, @Year, 1, '{CODIGO}-{NUMERO}/{GESTION}', GETDATE(), GETDATE());
        END

        SET @NumeroCorrelativo = @CodigoTipo + '-' + CAST(@NextNum AS VARCHAR) + '/' + CAST(@Year AS VARCHAR);

        -- 3. Calcular Fecha Límite según SLA
        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @FechaLimite DATE = CAST(DATEADD(HOUR, @HorasSLA, @Ahora) AS DATE);

        -- Resolver ID de ubicación orgánica a partir de codU
        DECLARE @UbicacionDestinoId INT = NULL;
        IF @CodUDestino IS NOT NULL
        BEGIN
            SELECT TOP 1 @UbicacionDestinoId = id FROM dbo.ubicaciones_org WHERE codU = @CodUDestino;
            IF @UbicacionDestinoId IS NULL
                SELECT TOP 1 @UbicacionDestinoId = id FROM dbo.ubicaciones_org WHERE id = @CodUDestino;
        END

        -- Resolver ID de funcionario destino a partir del CI del empleado
        DECLARE @UsuarioDestinoId INT = NULL;
        IF @CiEmpleadoDestino IS NOT NULL
        BEGIN
            SELECT TOP 1 @UsuarioDestinoId = id FROM dbo.TEmpleados WHERE CI = @CiEmpleadoDestino;
        END

        -- Si no vino por CI pero vino @PrimerDestinatarioId
        IF @UsuarioDestinoId IS NULL AND @PrimerDestinatarioId IS NOT NULL
        BEGIN
            SET @UsuarioDestinoId = @PrimerDestinatarioId;
        END

        -- Si aún no tenemos ubicación destino pero tenemos usuario destino
        IF @UbicacionDestinoId IS NULL AND @UsuarioDestinoId IS NOT NULL
        BEGIN
            SELECT TOP 1 @UbicacionDestinoId = uo.id 
            FROM dbo.TEmpleados e
            INNER JOIN dbo.ubicaciones_org uo ON uo.codU = e.cod_u
            WHERE e.id = @UsuarioDestinoId;
        END

        -- Si no se definió ubicación destino, asignar la ubicación del emisor
        IF @UbicacionDestinoId IS NULL
        BEGIN
            SET @UbicacionDestinoId = @UbicacionId;
        END

        -- Determinación de custodia y estado inicial del expediente:
        -- Si hay destinatario (funcionario o unidad destino diferente del emisor),
        -- el trámite se despacha hacia el destinatario en estado 'POR_RECIBIR'.
        DECLARE @UsuarioAsignadoId INT = ISNULL(@UsuarioDestinoId, @UserId);
        DECLARE @UbicacionAsignadaId INT = @UbicacionDestinoId;
        DECLARE @EstadoInicial VARCHAR(30) = CASE 
            WHEN @UsuarioDestinoId IS NOT NULL OR @UbicacionDestinoId <> @UbicacionId THEN 'POR_RECIBIR'
            ELSE 'CREADO'
        END;

        -- 4. Insertar Trámite con asignación al destinatario correspondiente
        INSERT INTO dbo.tramites (
            numero_correlativo, gestion, tipo_proceso_id, estado,
            remitente, institucion_remitente, cite_externo, referencia,
            tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
            cod_u_destino, cod_cargo_destino, ci_empleado_destino,
            destinatario_nombre, destinatario_cargo, destinatario_unidad,
            primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
            creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
            activo, created_at, updated_at
        ) VALUES (
            @NumeroCorrelativo, @Year, @TipoProcesoId, @EstadoInicial,
            @Remitente, @InstitucionRemitente, @CiteExterno, @Referencia,
            @TipoCorresNorm, @NroHojas, @NroAnexos, @Instruccion, @Prioridad,
            @CodUDestino, @CodCargoDestino, @CiEmpleadoDestino,
            @DestinatarioNombre, @DestinatarioCargo, @DestinatarioUnidad,
            ISNULL(@PrimerDestinatarioId, @UsuarioDestinoId), @Ahora, @FechaLimite,
            @UserId, @UbicacionId, @UsuarioAsignadoId, @UbicacionAsignadaId,
            1, @Ahora, @Ahora
        );

        SET @NuevoTramiteId = SCOPE_IDENTITY();

        -- 5. Insertar Movimiento Inicial (Orden 1)
        DECLARE @NomActividad VARCHAR(150) = CASE 
            WHEN @TipoCorresNorm = 'EXTERNA' THEN 'Recepción Ventanilla'
            WHEN @TipoCorresNorm = 'INTERNA' THEN 'Recepción Ventanilla'
            ELSE 'Recepción en Ventanilla Única'
        END;

        DECLARE @Prov VARCHAR(MAX) = ISNULL(@ProveidoInicial, 'Recepción y apertura de Hoja de Ruta ' + @TipoCorresNorm + ' ' + @NumeroCorrelativo);

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento,
            proveido, instruccion, tiempo_estimado_minutos,
            fecha_envio, fecha_recepcion, created_at
        ) VALUES (
            @NuevoTramiteId, 1, 'INICIO', @NomActividad,
            @UserId, @UbicacionId,
            @UsuarioDestinoId, @UbicacionDestinoId,
            @EstadoInicial,
            @Prov, @Instruccion, @HorasSLA * 60,
            @Ahora, 
            CASE WHEN @EstadoInicial = 'POR_RECIBIR' THEN NULL ELSE @Ahora END, 
            @Ahora
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
