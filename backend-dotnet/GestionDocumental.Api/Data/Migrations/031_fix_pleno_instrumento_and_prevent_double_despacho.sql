-- =============================================================================
-- Migration 031: Fix Pleno instrumento_generado (NULL) and prevent duplicate Despacho Final
-- =============================================================================

-- 1. Actualizar dbo.usp_Tramites_RegistrarAprobacionPleno para no forzar instrumento_generado
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

        DECLARE @InstrumentoValido VARCHAR(50) = NULLIF(LTRIM(RTRIM(@InstrumentoGenerado)), '');

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
            @InstrumentoValido,
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

-- 2. Actualizar dbo.usp_Tramites_DespachoFinal para prevenir despachos duplicados
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_DespachoFinal
    @TramiteId              INT,
    @UsuarioId              INT,
    @CiteDespacho           VARCHAR(100),
    @DestinatarioFinal      NVARCHAR(250),
    @Proveido               NVARCHAR(MAX) = NULL,
    @NuevoMovimientoId      INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
    BEGIN
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;
    END

    IF @CiteDespacho IS NULL OR LTRIM(RTRIM(@CiteDespacho)) = ''
    BEGIN
        THROW 50046, 'Debe indicar el CITE o número oficial de oficio saliente del CMS (ej: CMS-DESP-0145/2026).', 1;
    END

    IF @DestinatarioFinal IS NULL OR LTRIM(RTRIM(@DestinatarioFinal)) = ''
    BEGIN
        THROW 50047, 'Debe especificar el destinatario final oficial (ej: Alcalde Municipal Dr. Enrique Leaño Palenque / Institución Solicitante).', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validar estado, despacho previo y firmas duales concurrentes
        DECLARE @EstadoActual VARCHAR(30), 
                @UbicacionActualId INT,
                @DespachoExistente VARCHAR(100),
                @FirmaPresidencia BIT,
                @FirmaSecretaria BIT,
                @FirmaPresidenciaFecha DATETIME2,
                @FirmaSecretariaFecha DATETIME2;

        SELECT 
            @EstadoActual = estado,
            @UbicacionActualId = ubicacion_actual_id,
            @DespachoExistente = despacho_final_cite,
            @FirmaPresidencia = ISNULL(firma_presidencia, 0),
            @FirmaSecretaria = ISNULL(firma_secretaria, 0),
            @FirmaPresidenciaFecha = firma_presidencia_fecha,
            @FirmaSecretariaFecha = firma_secretaria_fecha
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50004, 'El trámite especificado no existe o ha sido eliminado.', 1;
        END

        IF @DespachoExistente IS NOT NULL
        BEGIN
            DECLARE @MsgDespachoPrevio NVARCHAR(300) = 'El trámite ya cuenta con un Despacho Final registrado con CITE ' + @DespachoExistente + '. No se permite un despacho duplicado.';
            THROW 50048, @MsgDespachoPrevio, 1;
        END

        IF @EstadoActual = 'CONCLUIDO'
        BEGIN
            THROW 50048, 'El trámite ya se encuentra formalmente CONCLUIDO y despachado.', 1;
        END

        IF @EstadoActual = 'ANULADO'
        BEGIN
            THROW 50005, 'No se puede despachar un trámite que se encuentra ANULADO.', 1;
        END

        -- VALIDACIÓN REGLAMENTARIA CMS: FIRMAS DUALES OBLIGATORIAS
        IF @FirmaPresidencia = 0 OR @FirmaSecretaria = 0
        BEGIN
            DECLARE @ErrorMsg NVARCHAR(300) = 'No es posible realizar el Despacho Final: Se requiere el registro concurrente de ambas firmas reglamentarias (Presidencia del CMS y Secretaría General del CMS). ' +
                'Estado actual: [Presidencia: ' + CASE WHEN @FirmaPresidencia = 1 THEN 'Firmado' ELSE 'PENDIENTE' END + 
                ', Secretaría General: ' + CASE WHEN @FirmaSecretaria = 1 THEN 'Firmado' ELSE 'PENDIENTE' END + '].';
            THROW 50041, @ErrorMsg, 1;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();

        -- 1. Actualizar dbo.tramites a ATENDIDO (listo para avanzar o archivar)
        UPDATE dbo.tramites
        SET estado                     = 'ATENDIDO',
            despacho_final_fecha       = @Ahora,
            despacho_final_cite        = @CiteDespacho,
            despacho_final_destinatario = @DestinatarioFinal,
            updated_at                 = @Ahora
        WHERE id = @TramiteId;

        -- 2. Calcular siguiente orden
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @UbicacionUsuario INT = @UbicacionActualId;
        IF @UbicacionUsuario IS NULL
        BEGIN
            SELECT TOP 1 @UbicacionUsuario = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        DECLARE @DetalleDespacho NVARCHAR(MAX) = 'Expediente despachado oficialmente bajo CITE ' + @CiteDespacho + 
            ' dirigido a ' + @DestinatarioFinal + '. ' + ISNULL(@Proveido, 'Trámite finalizado y notificado a la autoridad ejecutiva / entidad peticionaria.');

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
            tiempo_estimado_minutos,
            created_at
        ) VALUES (
            @TramiteId,
            @NextOrden,
            'DESPACHO_FINAL',
            'Despacho Final al Ejecutivo Municipal / Institución Externa',
            @UsuarioId,
            @UbicacionUsuario,
            NULL,
            NULL,
            'CONCLUIDO',
            @DetalleDespacho,
            'Despacho finalizado con firmas duales concurrentes completas',
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
