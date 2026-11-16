-- =============================================================================
-- 044_require_informe_concluido_derivacion.sql
-- Endurece la derivación comisión -> Asesoría General del Pleno (unidad 12):
--   * Exige que el informe de comisión esté concluido (fecha_fin_informe NOT NULL).
--   * Mantiene la exigencia de instrumentos generados y del PDF del informe.
--   * Elimina la marcación automática de fecha_fin_informe al derivar.
-- Esto alinea el backend con la UI, que solo habilita "Derivar" tras concluir
-- la tarea de la comisión (modal Atender / Informe).
-- =============================================================================

CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Derivar
    @TramiteId              INT,
    @UsuarioOrigenId        INT,
    @UbicacionOrigenId      INT,
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

        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @Correlativo VARCHAR(50),
                @FechaFinInforme DATETIME2,
                @SesionPlenoNro VARCHAR(100),
                @FirmaPresidencia BIT,
                @FirmaSecretaria BIT;

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @Correlativo       = numero_correlativo,
            @FechaFinInforme   = fecha_fin_informe,
            @SesionPlenoNro    = sesion_pleno_nro,
            @FirmaPresidencia  = ISNULL(firma_presidencia, 0),
            @FirmaSecretaria   = ISNULL(firma_secretaria, 0)
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50030, 'El trámite indicado no existe o se encuentra inactivo.', 1;

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO', 'RECHAZADO_PLENO')
            THROW 50031, 'El trámite no puede derivarse porque se encuentra Anulado, Bloqueado, Concluido o Rechazado.', 1;

        IF @EsConclusion = 1
            THROW 50032, 'La conclusión libre está deshabilitada. El circuito externo solo concluye mediante Despacho Final de Secretaría General.', 1;

        IF @PasoActual = 7 OR @UbicacionActualId = 4
            THROW 50033, 'El expediente se encuentra en Secretaría General. Debe registrarse la firma de Secretaría y efectuar el Despacho Final.', 1;

        IF @EstadoActual = 'POR_RECIBIR'
            THROW 50034, 'El trámite está pendiente de recepción. Debe confirmar su recepción antes de derivarlo.', 1;

        -- Custodia estricta
        IF NOT (
            (@UsuarioActualId IS NOT NULL AND @UsuarioActualId = @UsuarioOrigenId)
            OR (@UsuarioActualId IS NULL AND @UbicacionActualId = @UbicacionOrigenId)
        )
            THROW 50035, 'No tiene custodia del trámite. Solo el funcionario asignado o la unidad titular puede derivarlo.', 1;

        IF @UbicacionActualId IS NULL
            THROW 50036, 'El trámite no tiene una unidad de custodia válida.', 1;

        DECLARE @CodCargoOrigen INT;
        SELECT @CodCargoOrigen = cod_cargo FROM dbo.TEmpleados WHERE id = @UsuarioOrigenId;

        IF @PasoActual = 2 AND @CodCargoOrigen <> 1
            THROW 50036, 'Solo el Presidente del Concejo Municipal puede derivar el expediente a las comisiones.', 1;

        IF @PasoActual = 4 AND @CodCargoOrigen <> 23
            THROW 50036, 'Solo el Asesor General del Pleno puede remitir el expediente al Pleno del Concejo.', 1;

        IF @PasoActual = 6 AND @CodCargoOrigen <> 1
            THROW 50036, 'Solo el Presidente del Concejo Municipal puede remitir el expediente a Secretaría General.', 1;

        IF @Proveido IS NULL OR LTRIM(RTRIM(@Proveido)) = ''
            THROW 50037, 'Debe ingresar el proveído o instrucción de derivación.', 1;

        -- Resolver unidad destino (sin fallbacks)
        DECLARE @UbicacionDestinoId INT = NULL;
        DECLARE @CodUDestinoNorm SMALLINT = NULL;

        IF @CodUDestino IS NOT NULL
        BEGIN
            SELECT TOP 1
                @UbicacionDestinoId = id,
                @CodUDestinoNorm    = codU
            FROM dbo.ubicaciones_org
            WHERE codU = @CodUDestino AND activo = 1;
        END

        IF @UbicacionDestinoId IS NULL
            THROW 50038, 'Debe especificar una unidad institucional de destino válida.', 1;

        -- Resolver funcionario destino por CI
        DECLARE @UsuarioDestinoId INT = NULL;
        IF @CiEmpleadoDestino IS NOT NULL
        BEGIN
            SELECT TOP 1 @UsuarioDestinoId = id
            FROM dbo.TEmpleados
            WHERE CI = @CiEmpleadoDestino AND Activo = 1;
        END

        IF @UsuarioDestinoId IS NOT NULL AND NOT EXISTS (
            SELECT 1 FROM dbo.TEmpleados
            WHERE id = @UsuarioDestinoId AND cod_u = @CodUDestinoNorm AND Activo = 1
        )
            THROW 50039, 'El funcionario seleccionado no pertenece a la unidad de destino.', 1;

        -- ─────────────────────────────────────────────────────────────────────
        -- Validación de la matriz de transiciones
        -- ─────────────────────────────────────────────────────────────────────
        DECLARE @NuevoPaso INT = NULL;
        DECLARE @FechaLimiteRespuesta DATETIME2 = NULL;

        -- Paso 2: Presidencia -> Comisiones (6..11)
        IF @PasoActual = 2 AND @UbicacionActualId = 1
           AND @UbicacionDestinoId BETWEEN 6 AND 11
        BEGIN
            IF @DiasPlazo IS NOT NULL AND @DiasPlazo NOT IN (5, 10, 15)
                THROW 50041, 'El plazo reglamentario de la comisión debe ser de 5, 10 o 15 días hábiles.', 1;

            SET @NuevoPaso = 3;
            SET @FechaLimiteRespuesta = dbo.fn_SumarDiasHabiles(SYSDATETIME(), ISNULL(@DiasPlazo, 10));
        END

        -- Paso 3: Comisión -> misma comisión (asesor) o AGP (unidad 12)
        ELSE IF @PasoActual = 3 AND @UbicacionActualId BETWEEN 6 AND 11
        BEGIN
            IF @UbicacionDestinoId = @UbicacionActualId
            BEGIN
                IF @UsuarioDestinoId IS NULL
                    THROW 50040, 'Debe seleccionar el asesor específico de la misma comisión al que se subasigna el expediente.', 1;

                IF @DiasPlazo IS NULL OR @DiasPlazo < 5 OR @DiasPlazo > 15
                    THROW 50041, 'El plazo reglamentario de la comisión debe ser de 5, 10 o 15 días hábiles.', 1;

                SET @NuevoPaso = 3;
                SET @FechaLimiteRespuesta = dbo.fn_SumarDiasHabiles(SYSDATETIME(), @DiasPlazo);
            END
            ELSE IF @UbicacionDestinoId = 12
            BEGIN
                IF @FechaFinInforme IS NULL
                    THROW 50048, 'Debe concluir la elaboración del informe de comisión antes de remitir a Asesoría General del Pleno.', 1;

                IF @InstrumentosGenerados IS NULL OR LTRIM(RTRIM(@InstrumentosGenerados)) = ''
                    THROW 50042, 'Para remitir a Asesoría General del Pleno debe registrar los instrumentos generados por la comisión.', 1;

                IF NOT EXISTS (SELECT 1 FROM dbo.adjuntos WHERE tramite_id = @TramiteId AND activo = 1)
                    THROW 50043, 'Para remitir a Asesoría General del Pleno debe cargar el informe de comisión en formato PDF.', 1;

                SET @NuevoPaso = 4;
            END
            ELSE
            BEGIN
                THROW 50044, 'Desde una comisión solo se puede subasignar al asesor de la misma comisión o remitir a Asesoría General del Pleno (unidad 12).', 1;
            END
        END

        -- Paso 4: Asesoría General del Pleno -> Pleno
        ELSE IF @PasoActual = 4 AND @UbicacionActualId = 12 AND @UbicacionDestinoId = 2
        BEGIN
            SET @NuevoPaso = 5;
        END

        -- Paso 5: Pleno -> Presidencia (con sesión ya registrada)
        ELSE IF @PasoActual = 5 AND @UbicacionActualId = 2 AND @UbicacionDestinoId = 1
        BEGIN
            IF @SesionPlenoNro IS NULL OR LTRIM(RTRIM(@SesionPlenoNro)) = ''
                THROW 50045, 'Debe registrar la Sesión del Pleno antes de remitir el expediente a Presidencia.', 1;

            SET @NuevoPaso = 6;
        END

        -- Paso 6: Presidencia -> Secretaría General (con firma de Presidencia)
        ELSE IF @PasoActual = 6 AND @UbicacionActualId = 1 AND @UbicacionDestinoId = 4
        BEGIN
            IF @FirmaPresidencia = 0
                THROW 50046, 'Debe registrar la firma de Presidencia antes de remitir a Secretaría General.', 1;

            SET @NuevoPaso = 7;
        END
        ELSE
        BEGIN
            THROW 50047, 'Transición no permitida por la matriz del circuito externo CMS.', 1;
        END

        -- Instrumentos: sincronizar columnas legadas
        IF @InstrumentosGenerados IS NULL AND @InstrumentoGenerado IS NOT NULL
            SET @InstrumentosGenerados = @InstrumentoGenerado;
        ELSE IF @InstrumentoGenerado IS NULL AND @InstrumentosGenerados IS NOT NULL
            SET @InstrumentoGenerado = LEFT(LTRIM(RTRIM(@InstrumentosGenerados)), 50);

        -- Resolver nombres de destino
        DECLARE @NomUnidad NVARCHAR(150) = @DestinatarioUnidad;
        IF @NomUnidad IS NULL OR LTRIM(RTRIM(@NomUnidad)) = ''
            SELECT @NomUnidad = nombre FROM dbo.ubicaciones_org WHERE id = @UbicacionDestinoId;

        DECLARE @NomCargo NVARCHAR(150) = @DestinatarioCargo;
        IF (@NomCargo IS NULL OR LTRIM(RTRIM(@NomCargo)) = '') AND @CodCargoDestino IS NOT NULL
            SELECT @NomCargo = NombreC FROM dbo.TCargo WHERE CodCargo = @CodCargoDestino;

        DECLARE @NomDest NVARCHAR(150) = @DestinatarioNombre;
        IF @UsuarioDestinoId IS NOT NULL AND (@NomDest IS NULL OR LTRIM(RTRIM(@NomDest)) = '')
            SELECT @NomDest = LTRIM(RTRIM(Nombres + ' ' + ISNULL(Apellidos, '')))
            FROM dbo.TEmpleados WHERE id = @UsuarioDestinoId;

        DECLARE @ActividadDeriv VARCHAR(150) =
            ISNULL(@ActividadNombre, 'Derivación a ' + ISNULL(@NomUnidad, 'Unidad de Destino'));

        DECLARE @Ahora DATETIME2 = SYSDATETIME();
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        -- Movimiento de derivación
        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento, proveido, instruccion,
            instrumento_generado, instrumentos_generados,
            fecha_limite_respuesta, fecha_envio, fecha_recepcion,
            tiempo_estimado_minutos, created_at
        ) VALUES (
            @TramiteId, @NextOrden, 'DERIVACION', @ActividadDeriv,
            @UsuarioOrigenId, @UbicacionActualId,
            @UsuarioDestinoId, @UbicacionDestinoId,
            'POR_RECIBIR', @Proveido, @Instruccion,
            @InstrumentoGenerado, @InstrumentosGenerados,
            @FechaLimiteRespuesta, @Ahora, NULL,
            CASE WHEN @DiasPlazo IS NOT NULL AND @DiasPlazo > 0 THEN @DiasPlazo * 24 * 60 ELSE 0 END,
            @Ahora
        );

        SET @NuevoMovimientoId = SCOPE_IDENTITY();

        -- Actualizar custodia y etapa (correlativo y gestión permanecen invariables)
        UPDATE dbo.tramites
        SET estado                  = 'POR_RECIBIR',
            paso_actual             = @NuevoPaso,
            usuario_actual_id       = @UsuarioDestinoId,
            ubicacion_actual_id     = @UbicacionDestinoId,
            prioridad               = ISNULL(@Prioridad, prioridad),
            instruccion             = ISNULL(@Instruccion, instruccion),
            fecha_limite_respuesta  = @FechaLimiteRespuesta,
            cod_u_destino           = @CodUDestinoNorm,
            cod_cargo_destino       = @CodCargoDestino,
            ci_empleado_destino     = @CiEmpleadoDestino,
            destinatario_nombre     = @NomDest,
            destinatario_cargo      = @NomCargo,
            destinatario_unidad     = @NomUnidad,
            fecha_fin_informe       = fecha_fin_informe,
            updated_at              = @Ahora
        WHERE id = @TramiteId;

        -- Copias informativas (no alteran custodia)
        IF @OtrosDestinatariosJson IS NOT NULL AND ISJSON(@OtrosDestinatariosJson) = 1
        BEGIN
            INSERT INTO dbo.movimientos (
                tramite_id, orden, tipo_movimiento, actividad_nombre,
                usuario_origen_id, ubicacion_origen_id,
                usuario_destino_id, ubicacion_destino_id,
                estado_movimiento, proveido, instruccion,
                instrumento_generado, instrumentos_generados,
                fecha_limite_respuesta, fecha_envio, fecha_recepcion,
                tiempo_estimado_minutos, created_at
            )
            SELECT
                @TramiteId,
                @NextOrden + ROW_NUMBER() OVER (ORDER BY (SELECT NULL)),
                'COPIA_INFORMATIVA',
                'Copia a: ' + ISNULL(j.unidad, 'Unidad'),
                @UsuarioOrigenId,
                @UbicacionActualId,
                NULL,
                u.id,
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
            INNER JOIN dbo.ubicaciones_org u ON u.codU = j.cod_u AND u.activo = 1;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
