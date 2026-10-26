-- =============================================================================
-- Migration 030: Fix default instrumento_generado in usp_Tramites_RegistrarAprobacionPleno
-- Avoids violating CK_movimientos_instrumento_generado ('PIE','PIO','MINUTA','RESOLUCION','NOTA_EXTERNA','INFORME')
-- =============================================================================

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

        -- Usar 'RESOLUCION' como fallback reglamentario compatible con CK_movimientos_instrumento_generado
        DECLARE @InstrumentoValido VARCHAR(50) = ISNULL(NULLIF(@InstrumentoGenerado, ''), 'RESOLUCION');

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
