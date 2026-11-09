-- =============================================================================
-- MIGRACIÓN 041: ENDURECIMIENTO DE CUSTODIA Y CIRCUITO DISTRIBUIDO CMS
-- Concejo Municipal de Sucre (CMS)
--
-- 1. Columna dbo.tramites.paso_actual y función de días hábiles.
-- 2. usp_Tramites_Crear: asignación inicial a Presidencia (unidad 1).
-- 3. usp_Tramites_Recepcionar: custodia estricta y toma de custodia por usuario.
-- 4. usp_Tramites_Derivar: matriz cerrada de transiciones, sin fallbacks.
-- 5. usp_Tramites_MarcarAtendido / ConcluirInformeComision: custodia y comisión.
-- 6. usp_Tramites_RegistrarAprobacionPleno: sesión + remisión a Presidencia.
-- 7. usp_Tramites_RegistrarFirmaDual: firma por etapa y sin dbo.usuarios.
-- 8. usp_Tramites_DespachoFinal: CONCLUIDO directo con firmas duales.
-- 9. usp_Escritorio_ListarBandeja / ObtenerResumen: bandeja estricta.
-- 10. usp_Tramites_ObtenerPorId: paso_actual, puede_operar y unidad actual.
-- 11. usp_Usuarios_Autenticar / ObtenerPorId: cod_cargo y cod_u.
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Columna paso_actual
-- ─────────────────────────────────────────────────────────────────────────────
IF COL_LENGTH('dbo.tramites', 'paso_actual') IS NULL
BEGIN
    ALTER TABLE dbo.tramites
    ADD paso_actual INT NOT NULL
        CONSTRAINT df_tramites_paso_actual DEFAULT 1;
END
GO

-- Backfill de trámites históricos (solo los que aún están en el valor por defecto)
UPDATE dbo.tramites
SET paso_actual = CASE
    WHEN estado = 'CONCLUIDO' THEN 8
    WHEN estado = 'RECHAZADO_PLENO' THEN 8
    WHEN ubicacion_actual_id = 4 THEN 7
    WHEN ubicacion_actual_id = 1 AND sesion_pleno_nro IS NOT NULL THEN 6
    WHEN ubicacion_actual_id = 2 THEN 5
    WHEN ubicacion_actual_id = 12 THEN 4
    WHEN ubicacion_actual_id BETWEEN 6 AND 11 THEN 3
    WHEN ubicacion_actual_id = 1 THEN 2
    ELSE 1
END
WHERE activo = 1 AND paso_actual = 1;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Función de días hábiles (lunes a viernes, sin feriados)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER FUNCTION dbo.fn_SumarDiasHabiles
(
    @Fecha DATETIME2,
    @Dias  INT
)
RETURNS DATETIME2
AS
BEGIN
    DECLARE @Resultado DATETIME2 = @Fecha;
    DECLARE @Contador INT = 0;

    IF @Fecha IS NULL OR @Dias IS NULL OR @Dias <= 0
        RETURN @Fecha;

    WHILE @Contador < @Dias
    BEGIN
        SET @Resultado = DATEADD(DAY, 1, @Resultado);

        -- 1900-01-01 fue lunes: 5 = sábado, 6 = domingo
        IF (DATEDIFF(DAY, 0, @Resultado) % 7) NOT IN (5, 6)
        BEGIN
            SET @Contador = @Contador + 1;
        END
    END

    RETURN @Resultado;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. usp_Tramites_Crear: la Hoja de Ruta nace hacia Presidencia (unidad 1)
--    La custodia queda a nivel de unidad (usuario_actual_id = NULL).
-- ─────────────────────────────────────────────────────────────────────────────
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

        -- Normalizar Tipo de Correspondencia
        DECLARE @TipoCorresNorm VARCHAR(20) = 'EXTERNA';
        IF @TipoCorres IS NOT NULL AND LTRIM(RTRIM(@TipoCorres)) <> ''
        BEGIN
            SET @TipoCorresNorm = UPPER(LTRIM(RTRIM(@TipoCorres)));
            IF @TipoCorresNorm NOT IN ('EXTERNA', 'INTERNA', 'CORRESPONDENCIA')
                SET @TipoCorresNorm = 'EXTERNA';
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

            SELECT @NextNum = ultimo_numero
            FROM dbo.correlativos
            WHERE tipo_proceso_id = @TipoProcesoId AND gestion = @Year;
        END
        ELSE
        BEGIN
            SET @NextNum = 1;
            INSERT INTO dbo.correlativos (tipo_proceso_id, ubicacion_org_id, gestion, ultimo_numero, formato_patron, created_at, updated_at)
            VALUES (@TipoProcesoId, @UbicacionId, @Year, 1, '{CODIGO}-{NUMERO}/{GESTION}', GETDATE(), GETDATE());
        END

        SET @NumeroCorrelativo = @CodigoTipo + '-' + CAST(@NextNum AS VARCHAR) + '/' + CAST(@Year AS VARCHAR);

        -- 3. Fecha límite inicial según SLA del tipo de proceso
        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @FechaLimite DATE = CAST(DATEADD(HOUR, ISNULL(@HorasSLA, 48), @Ahora) AS DATE);

        -- 4. Destino institucional único del circuito: Presidencia (unidad 1)
        DECLARE @UbicacionPresidenciaId INT;
        SELECT TOP 1 @UbicacionPresidenciaId = id
        FROM dbo.ubicaciones_org
        WHERE codU = 1 AND activo = 1;

        IF @UbicacionPresidenciaId IS NULL
        BEGIN
            THROW 50014, 'No se encuentra configurada la Presidencia del Concejo Municipal (unidad 1).', 1;
        END

        DECLARE @NomUnidad NVARCHAR(150);
        SELECT @NomUnidad = nombre FROM dbo.ubicaciones_org WHERE id = @UbicacionPresidenciaId;

        DECLARE @NomCargo NVARCHAR(150) = 'Presidente del Concejo Municipal';
        DECLARE @NomDest NVARCHAR(150) = NULL;

        -- 5. Insertar Trámite con custodia a nivel de Presidencia (sin usuario específico)
        INSERT INTO dbo.tramites (
            numero_correlativo, gestion, tipo_proceso_id, estado, paso_actual,
            remitente, institucion_remitente, cite_externo, referencia,
            tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
            cod_u_destino, cod_cargo_destino, ci_empleado_destino,
            destinatario_nombre, destinatario_cargo, destinatario_unidad,
            primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
            creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
            activo, created_at, updated_at
        ) VALUES (
            @NumeroCorrelativo, @Year, @TipoProcesoId, 'POR_RECIBIR', 2,
            @Remitente, @InstitucionRemitente, @CiteExterno, @Referencia,
            @TipoCorresNorm, @NroHojas, @NroAnexos, @Instruccion, @Prioridad,
            1, 1, NULL,
            @NomDest, @NomCargo, @NomUnidad,
            NULL, @Ahora, @FechaLimite,
            @UserId, @UbicacionId, NULL, @UbicacionPresidenciaId,
            1, @Ahora, @Ahora
        );

        SET @NuevoTramiteId = SCOPE_IDENTITY();

        -- 6. Movimiento inicial (Orden 1)
        DECLARE @Prov NVARCHAR(MAX) = ISNULL(
            @ProveidoInicial,
            'Recepción y apertura de Hoja de Ruta ' + @TipoCorresNorm + ' ' + @NumeroCorrelativo +
            '. Remisión reglamentaria a Presidencia del Concejo Municipal.'
        );

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento,
            proveido, instruccion, tiempo_estimado_minutos,
            fecha_envio, fecha_recepcion, created_at
        ) VALUES (
            @NuevoTramiteId, 1, 'INICIO', 'Recepción Ventanilla Única',
            @UserId, @UbicacionId,
            NULL, @UbicacionPresidenciaId,
            'POR_RECIBIR',
            @Prov, @Instruccion, ISNULL(@HorasSLA, 48) * 60,
            @Ahora, NULL, @Ahora
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. usp_Tramites_Recepcionar: custodia estricta y toma de custodia
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Recepcionar
    @TramiteId      INT,
    @UsuarioId      INT,
    @UbicacionOrgId INT,
    @Proveido       NVARCHAR(MAX) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EstadoActual VARCHAR(30),
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @PasoActual INT,
                @Correlativo VARCHAR(50);

        SELECT
            @EstadoActual      = estado,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @PasoActual        = paso_actual,
            @Correlativo       = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50020, 'El trámite indicado no existe o se encuentra inactivo.', 1;

        IF @EstadoActual NOT IN ('POR_RECIBIR', 'EN_TRANSITO', 'CREADO')
            THROW 50021, 'El trámite no se encuentra pendiente de recepción (POR_RECIBIR / EN_TRANSITO / CREADO).', 1;

        -- Custodia: solo el usuario asignado o, si no hay usuario, cualquier funcionario de la unidad
        IF NOT (
            (@UsuarioActualId IS NOT NULL AND @UsuarioActualId = @UsuarioId)
            OR (@UsuarioActualId IS NULL AND @UbicacionActualId = @UbicacionOrgId)
        )
            THROW 50022, 'No tiene custodia del trámite. Solo el funcionario asignado o la unidad titular puede recepcionarlo.', 1;

        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @UbicacionCustodia INT = ISNULL(@UbicacionActualId, @UbicacionOrgId);

        UPDATE dbo.tramites
        SET estado              = 'EN_ATENCION',
            usuario_actual_id   = @UsuarioId,
            ubicacion_actual_id = @UbicacionCustodia,
            updated_at          = @Ahora
        WHERE id = @TramiteId;

        DECLARE @UltimoMovId INT;
        SELECT TOP 1 @UltimoMovId = id
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId
        ORDER BY orden DESC, id DESC;

        IF @UltimoMovId IS NOT NULL
        BEGIN
            UPDATE dbo.movimientos
            SET fecha_recepcion       = @Ahora,
                usuario_destino_id    = @UsuarioId,
                ubicacion_destino_id  = @UbicacionCustodia,
                estado_movimiento     = 'EN_ATENCION',
                proveido              = CASE
                                            WHEN @Proveido IS NOT NULL AND LTRIM(RTRIM(@Proveido)) <> ''
                                            THEN ISNULL(proveido + CHAR(13) + CHAR(10), '') + 'Recepción confirmada: ' + @Proveido
                                            ELSE proveido
                                        END
            WHERE id = @UltimoMovId;
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
-- 5. usp_Tramites_Derivar: matriz cerrada y custodia estricta
--    Paso 2: unidad 1 -> comisiones 6..11
--    Paso 3: comisión -> misma comisión (asesor, plazo 5..15)
--            comisión -> unidad 12 (AGP, informe + instrumentos + PDF)
--    Paso 4: unidad 12 -> unidad 2 (Pleno)
--    Paso 5: unidad 2 -> unidad 1 (requiere sesión registrada)
--    Paso 6: unidad 1 -> unidad 4 (requiere firma de Presidencia)
--    Paso 7: unidad 4 -> solo DespachoFinal
-- ─────────────────────────────────────────────────────────────────────────────
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
                IF @FechaFinInforme IS NULL AND (@InstrumentosGenerados IS NULL OR LTRIM(RTRIM(@InstrumentosGenerados)) = '')
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
            fecha_fin_informe       = CASE
                                        WHEN @PasoActual = 3 AND @NuevoPaso = 4 AND fecha_fin_informe IS NULL
                                        THEN @Ahora
                                        ELSE fecha_fin_informe
                                      END,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. usp_Tramites_MarcarAtendido: solo comisión, custodia y plazo hábil
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

        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @Correlativo VARCHAR(50);

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @Correlativo       = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50050, 'El trámite indicado no existe o se encuentra inactivo.', 1;

        IF @EstadoActual IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO')
            THROW 50051, 'El trámite se encuentra en estado concluyente y no puede ser modificado.', 1;

        IF @EstadoActual = 'POR_RECIBIR'
            THROW 50052, 'El trámite se encuentra pendiente de recepción. Debe recepcionarlo primero.', 1;

        IF @PasoActual <> 3 OR @UbicacionActualId NOT BETWEEN 6 AND 11
            THROW 50053, 'La atención técnica de comisión solo procede en la etapa de comisión (paso 3).', 1;

        IF NOT (
            (@UsuarioActualId IS NOT NULL AND @UsuarioActualId = @UsuarioId)
            OR (@UsuarioActualId IS NULL AND @UbicacionActualId = @UbicacionOrgId)
        )
            THROW 50054, 'No tiene custodia del trámite para registrar su atención.', 1;

        IF @Proveido IS NULL OR LTRIM(RTRIM(@Proveido)) = ''
            THROW 50055, 'Debe ingresar una nota de informe, dictamen técnico o proveído de atención.', 1;

        IF @DiasPlazo IS NOT NULL AND (@DiasPlazo < 5 OR @DiasPlazo > 15)
            THROW 50056, 'El plazo reglamentario de la comisión debe ser de 5, 10 o 15 días hábiles.', 1;

        IF @InstrumentosGenerados IS NULL AND @InstrumentoGenerado IS NOT NULL
            SET @InstrumentosGenerados = @InstrumentoGenerado;
        ELSE IF @InstrumentoGenerado IS NULL AND @InstrumentosGenerados IS NOT NULL
            SET @InstrumentoGenerado = LEFT(LTRIM(RTRIM(@InstrumentosGenerados)), 50);

        DECLARE @Ahora DATETIME2 = SYSDATETIME();
        DECLARE @FechaLimiteRespuesta DATETIME2 =
            CASE WHEN @DiasPlazo IS NOT NULL THEN dbo.fn_SumarDiasHabiles(@Ahora, @DiasPlazo) ELSE NULL END;

        UPDATE dbo.tramites
        SET estado                 = 'ATENDIDO',
            usuario_actual_id      = @UsuarioId,
            ubicacion_actual_id    = @UbicacionActualId,
            fecha_limite_respuesta = ISNULL(CAST(@FechaLimiteRespuesta AS DATE), fecha_limite_respuesta),
            updated_at             = @Ahora
        WHERE id = @TramiteId;

        DECLARE @UltimoMovId INT, @UltimoOrden INT, @UltimoEstadoMov VARCHAR(30);
        SELECT TOP 1
            @UltimoMovId = id,
            @UltimoOrden = orden,
            @UltimoEstadoMov = estado_movimiento
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId
        ORDER BY orden DESC, id DESC;

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
            DECLARE @NomActividad VARCHAR(150) = ISNULL(@ActividadNombre, 'Informe y atención técnica concluida');

            INSERT INTO dbo.movimientos (
                tramite_id, orden, tipo_movimiento, actividad_nombre,
                usuario_origen_id, ubicacion_origen_id,
                usuario_destino_id, ubicacion_destino_id,
                estado_movimiento, proveido, instruccion,
                instrumento_generado, instrumentos_generados,
                fecha_limite_respuesta, fecha_envio, fecha_recepcion,
                tiempo_estimado_minutos, created_at
            ) VALUES (
                @TramiteId, ISNULL(@UltimoOrden, 0) + 1, 'EVALUACION', @NomActividad,
                @UsuarioId, @UbicacionActualId,
                @UsuarioId, @UbicacionActualId,
                'ATENDIDO', @Proveido, 'Atención de comisión concluida',
                @InstrumentoGenerado, @InstrumentosGenerados,
                @FechaLimiteRespuesta, NULL, @Ahora,
                CASE WHEN @DiasPlazo IS NOT NULL THEN @DiasPlazo * 24 * 60 ELSE 0 END,
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
-- 7. usp_Tramites_ConcluirInformeComision: custodia, paso 3 y PDF obligatorio
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ConcluirInformeComision
    @TramiteId          INT,
    @UsuarioId          INT,
    @Proveido           NVARCHAR(MAX) = NULL,
    @NuevoMovimientoId  INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @FechaInicio DATETIME2,
                @FechaLimite DATE;

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @FechaInicio       = fecha_inicio_informe,
            @FechaLimite       = fecha_limite_respuesta
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50060, 'El trámite especificado no existe o se encuentra inactivo.', 1;

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO', 'RECHAZADO_PLENO')
            THROW 50061, 'No se puede concluir el informe en un trámite concluyente.', 1;

        IF @PasoActual <> 3 OR @UbicacionActualId NOT BETWEEN 6 AND 11
            THROW 50062, 'La conclusión de informe solo procede en la etapa de comisión (paso 3).', 1;

        IF @UsuarioActualId IS NOT NULL AND @UsuarioActualId <> @UsuarioId
            THROW 50063, 'No tiene custodia del trámite para concluir el informe.', 1;

        DECLARE @Ahora DATETIME2 = SYSDATETIME();

        IF @FechaLimite IS NOT NULL AND CAST(@Ahora AS DATE) > @FechaLimite
            THROW 50064, 'SISTEMA CERRADO: El plazo reglamentario de elaboración de informe ha expirado.', 1;

        IF NOT EXISTS (SELECT 1 FROM dbo.adjuntos WHERE tramite_id = @TramiteId AND activo = 1)
            THROW 50065, 'No se puede concluir la elaboración del informe sin cargar previamente el archivo digital (PDF).', 1;

        IF @FechaInicio IS NULL
        BEGIN
            UPDATE dbo.tramites
            SET fecha_inicio_informe = @Ahora,
                dias_plazo_informe   = ISNULL(dias_plazo_informe, 10)
            WHERE id = @TramiteId;
        END

        UPDATE dbo.tramites
        SET fecha_fin_informe = @Ahora,
            estado            = CASE WHEN estado = 'ATENDIDO' THEN 'ATENDIDO' ELSE 'EN_ATENCION' END,
            updated_at        = @Ahora
        WHERE id = @TramiteId;

        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(@Proveido, 'Informe técnico de comisión concluido satisfactoriamente.');
        DECLARE @NomActividad VARCHAR(150) = 'Conclusión de Informe de Comisión CMS';

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento, proveido, instruccion,
            tiempo_estimado_minutos, fecha_envio, fecha_recepcion, created_at
        ) VALUES (
            @TramiteId, @NextOrden, 'INFORME_CONCLUIDO', @NomActividad,
            @UsuarioId, @UbicacionActualId,
            @UsuarioId, @UbicacionActualId,
            @EstadoActual, @DetalleMov,
            'Habilitado para remisión a Asesoría General del Pleno.',
            0, @Ahora, @Ahora, @Ahora
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
-- 8. usp_Tramites_RegistrarAprobacionPleno: sesión + remisión a Presidencia
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_RegistrarAprobacionPleno
    @TramiteId              INT,
    @UsuarioId              INT,
    @SesionPlenoNro         VARCHAR(100),
    @SesionPlenoFecha       DATETIME2 = NULL,
    @SesionPlenoResultado   VARCHAR(100),
    @Proveido               NVARCHAR(MAX) = NULL,
    @InstrumentoGenerado    VARCHAR(50) = NULL,
    @UbicacionOrgId         INT = NULL,
    @NuevoMovimientoId      INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;

    IF @SesionPlenoNro IS NULL OR LTRIM(RTRIM(@SesionPlenoNro)) = ''
        THROW 50042, 'Debe especificar el número o denominación de la Sesión del Pleno del CMS.', 1;

    IF @SesionPlenoResultado IS NULL OR LTRIM(RTRIM(@SesionPlenoResultado)) = ''
        THROW 50043, 'Debe especificar el resultado del tratamiento en el Pleno.', 1;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @FechaFinInforme DATETIME2;

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @FechaFinInforme   = fecha_fin_informe
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50004, 'El trámite especificado no existe o ha sido eliminado.', 1;

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO', 'RECHAZADO_PLENO')
            THROW 50005, 'No se puede registrar aprobación plenaria en un trámite concluyente.', 1;

        IF @PasoActual <> 5 OR @UbicacionActualId <> 2
            THROW 50048, 'La constancia de Pleno solo procede cuando el expediente se encuentra en el Pleno (paso 5, unidad 2).', 1;

        IF @EstadoActual = 'POR_RECIBIR'
            THROW 50049, 'El trámite está pendiente de recepción en el Pleno. Debe recepcionarlo primero.', 1;

        IF @UsuarioActualId IS NOT NULL AND @UsuarioActualId <> @UsuarioId
            THROW 50050, 'No tiene custodia del trámite para registrar la sesión del Pleno.', 1;

        IF @FechaFinInforme IS NULL
            THROW 50051, 'El expediente no tiene informe de comisión concluido. No puede someterse al Pleno.', 1;

        DECLARE @Ahora DATETIME2 = GETDATE();
        DECLARE @FechaSesion DATETIME2 = ISNULL(@SesionPlenoFecha, @Ahora);
        DECLARE @EsRechazo BIT = CASE WHEN @SesionPlenoResultado LIKE '%RECHAZADO%' THEN 1 ELSE 0 END;

        IF @EsRechazo = 1
        BEGIN
            UPDATE dbo.tramites
            SET sesion_pleno_nro       = @SesionPlenoNro,
                sesion_pleno_fecha     = @FechaSesion,
                sesion_pleno_resultado = @SesionPlenoResultado,
                estado                 = 'RECHAZADO_PLENO',
                paso_actual            = 8,
                updated_at             = @Ahora
            WHERE id = @TramiteId;
        END
        ELSE
        BEGIN
            -- Aprobado: remite la custodia a Presidencia para la primera firma
            UPDATE dbo.tramites
            SET sesion_pleno_nro       = @SesionPlenoNro,
                sesion_pleno_fecha     = @FechaSesion,
                sesion_pleno_resultado = @SesionPlenoResultado,
                estado                 = 'POR_RECIBIR',
                paso_actual            = 6,
                usuario_actual_id      = NULL,
                ubicacion_actual_id    = 1,
                fecha_limite_respuesta = NULL,
                updated_at             = @Ahora
            WHERE id = @TramiteId;
        END

        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(
            @Proveido,
            'Sometido a consideración y resolución en Sesión del Pleno Camaral del CMS. Resultado: ' + @SesionPlenoResultado
        );
        DECLARE @NomActividad VARCHAR(150) = 'Aprobación en Sesión del Pleno del CMS (' + @SesionPlenoNro + ')';

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento, proveido, instruccion,
            instrumento_generado, fecha_envio, fecha_recepcion,
            tiempo_estimado_minutos, created_at
        ) VALUES (
            @TramiteId, @NextOrden, 'APROBACION_PLENO', @NomActividad,
            @UsuarioId, @UbicacionActualId,
            NULL,
            CASE WHEN @EsRechazo = 1 THEN @UbicacionActualId ELSE 1 END,
            CASE WHEN @EsRechazo = 1 THEN 'RECHAZADO' ELSE 'POR_RECIBIR' END,
            @DetalleMov,
            CASE WHEN @EsRechazo = 1
                 THEN 'Trámite rechazado por el Pleno Camaral.'
                 ELSE 'Aprobado por el Pleno Camaral. Remitido a Presidencia para primera firma reglamentaria.' END,
            ISNULL(@InstrumentoGenerado, 'RESOLUCION_AUTONOMICAMUNICIPAL'),
            @Ahora,
            CASE WHEN @EsRechazo = 1 THEN @Ahora ELSE NULL END,
            0, @Ahora
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
-- 9. usp_Tramites_RegistrarFirmaDual: firma por etapa, sin fallback dbo.usuarios
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_RegistrarFirmaDual
    @TramiteId          INT,
    @UsuarioId          INT,
    @TipoFirma          VARCHAR(30),
    @Observaciones      NVARCHAR(MAX) = NULL,
    @UbicacionOrgId     INT = NULL,
    @NuevoMovimientoId  INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;

    IF @TipoFirma IS NULL OR @TipoFirma NOT IN ('PRESIDENCIA', 'SECRETARIA')
        THROW 50044, 'El tipo de firma debe ser PRESIDENCIA o SECRETARIA.', 1;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @SesionPlenoNro VARCHAR(100),
                @FirmaPresidencia BIT,
                @FirmaSecretaria BIT;

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @SesionPlenoNro    = sesion_pleno_nro,
            @FirmaPresidencia  = ISNULL(firma_presidencia, 0),
            @FirmaSecretaria   = ISNULL(firma_secretaria, 0)
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50004, 'El trámite especificado no existe o ha sido eliminado.', 1;

        IF @EstadoActual IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO')
            THROW 50045, 'No se puede registrar firma en un trámite concluyente.', 1;

        IF @EstadoActual = 'POR_RECIBIR'
            THROW 50046, 'El trámite está pendiente de recepción. Debe recepcionarlo antes de firmar.', 1;

        IF NOT (
            (@UsuarioActualId IS NOT NULL AND @UsuarioActualId = @UsuarioId)
            OR (@UsuarioActualId IS NULL AND @UbicacionActualId = @UbicacionOrgId)
        )
            THROW 50047, 'No tiene custodia del trámite para registrar la firma.', 1;

        IF @SesionPlenoNro IS NULL OR LTRIM(RTRIM(@SesionPlenoNro)) = ''
            THROW 50048, 'Debe registrar primero la Sesión del Pleno antes de estampar firmas.', 1;

        DECLARE @NombreFirmante NVARCHAR(150);
        DECLARE @CodCargoFirmante INT;
        SELECT TOP 1
            @NombreFirmante = LTRIM(RTRIM(Nombres + ' ' + ISNULL(Apellidos, ''))),
            @CodCargoFirmante = cod_cargo
        FROM dbo.TEmpleados WHERE id = @UsuarioId;

        IF @NombreFirmante IS NULL
            THROW 50049, 'No se encontró el funcionario firmante.', 1;

        IF @TipoFirma = 'PRESIDENCIA' AND @CodCargoFirmante <> 1
            THROW 50049, 'Solo el Presidente del Concejo Municipal puede estampar la firma de Presidencia.', 1;

        IF @TipoFirma = 'SECRETARIA' AND @CodCargoFirmante <> 6
            THROW 50049, 'Solo el Secretario General del Concejo Municipal puede estampar la firma de Secretaría.', 1;

        DECLARE @Ahora DATETIME2 = GETDATE();

        IF @TipoFirma = 'PRESIDENCIA'
        BEGIN
            IF @PasoActual <> 6 OR @UbicacionActualId <> 1
                THROW 50050, 'La firma de Presidencia solo procede en el paso 6 (Presidencia, unidad 1).', 1;

            IF @FirmaPresidencia = 1
                THROW 50051, 'La firma de Presidencia ya fue registrada.', 1;

            UPDATE dbo.tramites
            SET firma_presidencia         = 1,
                firma_presidencia_fecha   = @Ahora,
                firma_presidencia_usuario = @NombreFirmante,
                updated_at                = @Ahora
            WHERE id = @TramiteId;
        END
        ELSE
        BEGIN
            IF @PasoActual <> 7 OR @UbicacionActualId <> 4
                THROW 50052, 'La firma de Secretaría General solo procede en el paso 7 (Secretaría, unidad 4).', 1;

            IF @FirmaPresidencia = 0
                THROW 50053, 'Debe registrarse primero la firma de Presidencia.', 1;

            IF @FirmaSecretaria = 1
                THROW 50054, 'La firma de Secretaría General ya fue registrada.', 1;

            UPDATE dbo.tramites
            SET firma_secretaria         = 1,
                firma_secretaria_fecha   = @Ahora,
                firma_secretaria_usuario = @NombreFirmante,
                updated_at               = @Ahora
            WHERE id = @TramiteId;
        END

        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @CargoFirmante NVARCHAR(150) = CASE
            WHEN @TipoFirma = 'PRESIDENCIA' THEN 'Presidencia del Concejo Municipal de Sucre'
            ELSE 'Secretaría General del Concejo Municipal de Sucre'
        END;

        DECLARE @ActividadNombre VARCHAR(150) = CASE
            WHEN @TipoFirma = 'PRESIDENCIA' THEN 'Rúbrica Institucional: Presidencia CMS'
            ELSE 'Rúbrica Institucional: Secretaría General CMS'
        END;

        DECLARE @ProveidoTexto NVARCHAR(MAX) =
            'Firma reglamentaria estampada por ' + @NombreFirmante + ' en ejercicio de ' + @CargoFirmante + '.' +
            CASE WHEN @Observaciones IS NOT NULL AND LTRIM(RTRIM(@Observaciones)) <> ''
                 THEN ' Nota: ' + @Observaciones ELSE '' END;

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento, proveido, instruccion,
            fecha_envio, fecha_recepcion, tiempo_estimado_minutos, created_at
        ) VALUES (
            @TramiteId, @NextOrden, 'FIRMA_DUAL', @ActividadNombre,
            @UsuarioId, @UbicacionActualId,
            @UsuarioId, @UbicacionActualId,
            'FIRMADO', @ProveidoTexto,
            'Firma dual concurrente registrada según Reglamento Interno CMS',
            @Ahora, @Ahora, 0, @Ahora
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
-- 10. usp_Tramites_DespachoFinal: CONCLUIDO directo, solo Secretaría (paso 7)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_DespachoFinal
    @TramiteId              INT,
    @UsuarioId              INT,
    @CiteDespacho           VARCHAR(100),
    @DestinatarioFinal      NVARCHAR(250),
    @Proveido               NVARCHAR(MAX) = NULL,
    @UbicacionOrgId         INT = NULL,
    @NuevoMovimientoId      INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;

    IF @CiteDespacho IS NULL OR LTRIM(RTRIM(@CiteDespacho)) = ''
        THROW 50055, 'Debe indicar el CITE o número oficial de oficio saliente del CMS.', 1;

    IF @DestinatarioFinal IS NULL OR LTRIM(RTRIM(@DestinatarioFinal)) = ''
        THROW 50056, 'Debe especificar el destinatario final oficial.', 1;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @FirmaPresidencia BIT,
                @FirmaSecretaria BIT;

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @FirmaPresidencia  = ISNULL(firma_presidencia, 0),
            @FirmaSecretaria   = ISNULL(firma_secretaria, 0)
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50004, 'El trámite especificado no existe o ha sido eliminado.', 1;

        IF @EstadoActual = 'CONCLUIDO'
            THROW 50057, 'El trámite ya se encuentra formalmente CONCLUIDO y despachado.', 1;

        IF @EstadoActual IN ('ANULADO', 'RECHAZADO_PLENO')
            THROW 50058, 'No se puede despachar un trámite Anulado o Rechazado.', 1;

        IF @PasoActual <> 7 OR @UbicacionActualId <> 4
            THROW 50059, 'El Despacho Final solo procede en Secretaría General (paso 7, unidad 4).', 1;

        IF @EstadoActual = 'POR_RECIBIR'
            THROW 50060, 'El trámite está pendiente de recepción en Secretaría General. Debe recepcionarlo primero.', 1;

        IF NOT (
            (@UsuarioActualId IS NOT NULL AND @UsuarioActualId = @UsuarioId)
            OR (@UsuarioActualId IS NULL AND @UbicacionActualId = @UbicacionOrgId)
        )
            THROW 50061, 'No tiene custodia del trámite para efectuar el Despacho Final.', 1;

        DECLARE @CodCargoDespacho INT;
        SELECT @CodCargoDespacho = cod_cargo FROM dbo.TEmpleados WHERE id = @UsuarioId;

        IF @CodCargoDespacho <> 6
            THROW 50061, 'Solo el Secretario General del Concejo Municipal puede efectuar el Despacho Final.', 1;

        IF @FirmaPresidencia = 0 OR @FirmaSecretaria = 0
        BEGIN
            DECLARE @ErrorMsg NVARCHAR(300) =
                'No es posible realizar el Despacho Final: se requiere el registro concurrente de ambas firmas reglamentarias. ' +
                'Estado actual: [Presidencia: ' + CASE WHEN @FirmaPresidencia = 1 THEN 'Firmado' ELSE 'PENDIENTE' END +
                ', Secretaría General: ' + CASE WHEN @FirmaSecretaria = 1 THEN 'Firmado' ELSE 'PENDIENTE' END + '].';
            THROW 50062, @ErrorMsg, 1;
        END

        DECLARE @Ahora DATETIME2 = GETDATE();

        UPDATE dbo.tramites
        SET estado                      = 'CONCLUIDO',
            paso_actual                 = 8,
            fecha_conclusion            = @Ahora,
            despacho_final_fecha        = @Ahora,
            despacho_final_cite         = @CiteDespacho,
            despacho_final_destinatario = @DestinatarioFinal,
            usuario_actual_id           = NULL,
            ubicacion_actual_id         = 4,
            fecha_limite_respuesta      = NULL,
            updated_at                  = @Ahora
        WHERE id = @TramiteId;

        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @DetalleDespacho NVARCHAR(MAX) =
            'Expediente despachado oficialmente bajo CITE ' + @CiteDespacho +
            ' dirigido a ' + @DestinatarioFinal + '. ' +
            ISNULL(@Proveido, 'Trámite finalizado y notificado a la entidad peticionaria.');

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento, proveido, instruccion,
            fecha_envio, fecha_recepcion, tiempo_estimado_minutos, created_at
        ) VALUES (
            @TramiteId, @NextOrden, 'DESPACHO_FINAL',
            'Despacho Final al Ejecutivo Municipal / Institución Externa',
            @UsuarioId, @UbicacionActualId,
            NULL, NULL,
            'CONCLUIDO', @DetalleDespacho,
            'Despacho finalizado con firmas duales concurrentes completas',
            @Ahora, @Ahora, 0, @Ahora
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
-- 11. usp_Tramites_IniciarInformeComision: días hábiles
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
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;

    IF @DiasPlazo IS NULL OR @DiasPlazo < 5 OR @DiasPlazo > 15
        THROW 50060, 'El plazo reglamentario para la elaboración del informe de comisión debe ser entre 5 y 15 días hábiles.', 1;

    BEGIN TRANSACTION;
    BEGIN TRY
        DECLARE @EstadoActual VARCHAR(30),
                @PasoActual INT,
                @UsuarioActualId INT,
                @UbicacionActualId INT,
                @Correlativo VARCHAR(50);

        SELECT
            @EstadoActual      = estado,
            @PasoActual        = paso_actual,
            @UsuarioActualId   = usuario_actual_id,
            @UbicacionActualId = ubicacion_actual_id,
            @Correlativo       = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
            THROW 50004, 'El trámite especificado no existe o se encuentra inactivo.', 1;

        IF @EstadoActual IN ('ANULADO', 'BLOQUEADO', 'CONCLUIDO', 'RECHAZADO_PLENO')
            THROW 50005, 'No se puede iniciar elaboración de informe en un trámite concluyente.', 1;

        IF @PasoActual <> 3 OR @UbicacionActualId NOT BETWEEN 6 AND 11
            THROW 50006, 'El inicio de informe solo procede en la etapa de comisión (paso 3).', 1;

        IF @UsuarioActualId IS NOT NULL AND @UsuarioActualId <> @UsuarioId
            THROW 50007, 'No tiene custodia del trámite para iniciar el informe.', 1;

        DECLARE @Ahora DATETIME2 = SYSDATETIME();
        DECLARE @FechaLimite DATETIME2 = dbo.fn_SumarDiasHabiles(@Ahora, @DiasPlazo);

        UPDATE dbo.tramites
        SET fecha_inicio_informe   = @Ahora,
            dias_plazo_informe     = @DiasPlazo,
            fecha_limite_respuesta = CAST(@FechaLimite AS DATE),
            updated_at             = @Ahora
        WHERE id = @TramiteId;

        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @DetalleMov NVARCHAR(MAX) = ISNULL(
            @Proveido,
            'Inicio formal de elaboración de informe de comisión. Plazo reglamentario: ' + CAST(@DiasPlazo AS VARCHAR(10)) + ' días hábiles.'
        );
        DECLARE @NomActividad VARCHAR(150) = 'Inicio Elaboración de Informe (' + CAST(@DiasPlazo AS VARCHAR(10)) + ' días CMS)';

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            usuario_destino_id, ubicacion_destino_id,
            estado_movimiento, proveido, instruccion,
            instrumento_generado, instrumentos_generados,
            fecha_limite_respuesta, fecha_envio, fecha_recepcion,
            tiempo_estimado_minutos, created_at
        ) VALUES (
            @TramiteId, @NextOrden, 'INICIO_INFORME', @NomActividad,
            @UsuarioId, @UbicacionActualId,
            @UsuarioId, @UbicacionActualId,
            @EstadoActual, @DetalleMov,
            'Elaboración y emisión de informe de comisión dentro del plazo perentorio.',
            'INFORME', 'INFORME',
            @FechaLimite, @Ahora, @Ahora,
            @DiasPlazo * 24 * 60, @Ahora
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
-- 12. Bandera estricta de bandeja y resumen
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Escritorio_ListarBandeja
    @UsuarioId      INT,
    @UbicacionOrgId INT           = NULL,
    @Bandeja        VARCHAR(30)   = 'RECIBIDOS',
    @Categoria      VARCHAR(30)   = NULL,
    @Estado         VARCHAR(30)   = NULL,
    @Search         NVARCHAR(100) = NULL,
    @Gestion        INT           = NULL,
    @SoloVencidos   BIT           = 0,
    @VerGlobal      BIT           = 0,
    @Limit          INT           = 50,
    @Offset         INT           = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);

    ;WITH UltimosMovimientos AS (
        SELECT
            m.tramite_id, m.id, m.actividad_nombre, m.fecha_envio, m.fecha_recepcion,
            m.proveido, m.instrumento_generado, m.orden,
            ROW_NUMBER() OVER (PARTITION BY m.tramite_id ORDER BY m.orden DESC, m.id DESC) AS rn
        FROM dbo.movimientos m
    ),
    BandejaBase AS (
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
            t.paso_actual,
            t.destinatario_nombre,
            t.destinatario_cargo,
            t.destinatario_unidad,
            t.usuario_actual_id,
            ISNULL(uAct.Nombres + ' ' + ISNULL(uAct.Apellidos, ''), uAct.login) AS usuario_actual_nombre,
            t.ubicacion_actual_id,
            uoAct.codU   AS cod_u_actual,
            uoAct.nombre AS ubicacion_actual_nombre,
            uoAct.sigla  AS ubicacion_actual_sigla,
            t.fecha_creacion,
            t.fecha_limite_respuesta,
            t.fecha_fin_informe,
            CASE
                WHEN t.fecha_limite_respuesta IS NOT NULL
                 AND t.fecha_limite_respuesta < @Hoy
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS es_vencido,
            CASE
                WHEN t.fecha_limite_respuesta IS NOT NULL
                THEN DATEDIFF(DAY, @Hoy, t.fecha_limite_respuesta)
                ELSE NULL
            END AS dias_restantes,
            (SELECT COUNT(1) FROM dbo.adjuntos a WHERE a.tramite_id = t.id AND a.activo = 1) AS nro_adjuntos,
            ultMov.actividad_nombre     AS actividad_actual,
            ultMov.fecha_envio          AS ult_fecha_envio,
            ultMov.fecha_recepcion      AS ult_fecha_recepcion,
            ultMov.proveido             AS ult_proveido,
            ultMov.instrumento_generado AS ult_instrumento_generado,
            t.sesion_pleno_nro,
            t.sesion_pleno_resultado,
            t.firma_presidencia,
            t.firma_secretaria,
            t.despacho_final_cite,
            -- Custodia estricta: usuario asignado o unidad sin usuario asignado
            CASE
                WHEN (t.usuario_actual_id = @UsuarioId
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
                THEN 1 ELSE 0
            END AS es_mi_recibido,
            CASE
                WHEN (t.usuario_actual_id = @UsuarioId
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS puede_operar,
            CASE
                WHEN (t.creado_por = @UsuarioId
                      OR t.ubicacion_org_id = @UbicacionOrgId
                      OR EXISTS (SELECT 1 FROM dbo.movimientos m WHERE m.tramite_id = t.id AND (m.usuario_origen_id = @UsuarioId OR m.ubicacion_origen_id = @UbicacionOrgId)))
                 AND (t.usuario_actual_id <> @UsuarioId
                      OR t.ubicacion_actual_id <> @UbicacionOrgId
                      OR t.estado IN ('EN_TRANSITO', 'POR_RECIBIR', 'CONCLUIDO', 'RECHAZADO_PLENO'))
                THEN 1 ELSE 0
            END AS es_mi_despachado
        FROM dbo.tramites t
        INNER JOIN dbo.tipos_proceso tp     ON tp.id = t.tipo_proceso_id
        LEFT JOIN dbo.TEmpleados uAct       ON uAct.id = t.usuario_actual_id
        LEFT JOIN dbo.ubicaciones_org uoAct ON uoAct.id = t.ubicacion_actual_id
        LEFT JOIN UltimosMovimientos ultMov ON ultMov.tramite_id = t.id AND ultMov.rn = 1
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @Gestion)
    )
    SELECT
        b.id, b.numero_correlativo, b.gestion, b.tipo_proceso_id,
        b.tipo_proceso_codigo, b.tipo_proceso_nombre, b.tipo_categoria,
        b.remitente, b.institucion_remitente, b.cite_externo, b.referencia,
        b.prioridad, b.nro_hojas, b.nro_anexos, b.estado, b.paso_actual,
        b.actividad_actual, b.destinatario_nombre, b.destinatario_cargo, b.destinatario_unidad,
        b.usuario_actual_id, b.usuario_actual_nombre,
        b.ubicacion_actual_id, b.cod_u_actual, b.ubicacion_actual_nombre, b.ubicacion_actual_sigla,
        b.fecha_creacion, b.ult_fecha_envio AS fecha_envio, b.ult_fecha_recepcion AS fecha_recepcion,
        b.fecha_limite_respuesta, b.fecha_fin_informe,
        b.es_vencido, b.dias_restantes, b.nro_adjuntos,
        b.ult_proveido AS ultimo_proveido, b.ult_instrumento_generado AS ultimo_instrumento_generado,
        b.sesion_pleno_nro, b.sesion_pleno_resultado,
        b.firma_presidencia, b.firma_secretaria, b.despacho_final_cite,
        b.puede_operar,
        CASE WHEN b.es_mi_recibido = 1 THEN 'RECIBIDO' ELSE 'DESPACHADO' END AS bandeja_tipo
    FROM BandejaBase b
    WHERE
        (
            (@VerGlobal = 1)
            OR (@Bandeja = 'RECIBIDOS' AND b.es_mi_recibido = 1)
            OR (@Bandeja = 'DESPACHADOS' AND b.es_mi_despachado = 1)
            OR (@Bandeja = 'TODOS' AND (b.es_mi_recibido = 1 OR b.es_mi_despachado = 1 OR @VerGlobal = 1))
        )
        AND (@Categoria IS NULL OR b.tipo_categoria = @Categoria)
        AND (@Estado IS NULL OR b.estado = @Estado)
        AND (@SoloVencidos = 0 OR b.es_vencido = 1)
        AND (
            @Search IS NULL
            OR b.numero_correlativo LIKE '%' + @Search + '%'
            OR b.referencia LIKE '%' + @Search + '%'
            OR b.remitente LIKE '%' + @Search + '%'
            OR ISNULL(b.cite_externo, '') LIKE '%' + @Search + '%'
            OR ISNULL(b.sesion_pleno_nro, '') LIKE '%' + @Search + '%'
            OR ISNULL(b.despacho_final_cite, '') LIKE '%' + @Search + '%'
        )
    ORDER BY
        b.es_vencido DESC,
        CASE b.prioridad WHEN 'URGENTE' THEN 1 WHEN 'ALTA' THEN 2 ELSE 3 END ASC,
        b.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Escritorio_ObtenerResumen
    @UsuarioId      INT,
    @UbicacionOrgId INT = NULL,
    @Gestion        INT = NULL,
    @VerGlobal      BIT = 0
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @Hoy DATE = CAST(GETDATE() AS DATE);
    DECLARE @AnioActual INT = ISNULL(@Gestion, YEAR(GETDATE()));

    ;WITH BaseCalculo AS (
        SELECT
            t.id,
            t.estado,
            t.prioridad,
            CASE
                WHEN t.fecha_limite_respuesta IS NOT NULL
                 AND t.fecha_limite_respuesta < @Hoy
                 AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO')
                THEN 1 ELSE 0
            END AS es_vencido,
            CASE
                WHEN @VerGlobal = 1 THEN 1
                WHEN (t.usuario_actual_id = @UsuarioId
                      OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
                THEN 1 ELSE 0
            END AS es_recibido,
            CASE
                WHEN (t.creado_por = @UsuarioId
                      OR t.ubicacion_org_id = @UbicacionOrgId
                      OR EXISTS (SELECT 1 FROM dbo.movimientos m WHERE m.tramite_id = t.id AND (m.usuario_origen_id = @UsuarioId OR m.ubicacion_origen_id = @UbicacionOrgId)))
                 AND (t.usuario_actual_id <> @UsuarioId
                      OR t.ubicacion_actual_id <> @UbicacionOrgId
                      OR t.estado IN ('EN_TRANSITO', 'POR_RECIBIR', 'CONCLUIDO', 'RECHAZADO_PLENO'))
                THEN 1 ELSE 0
            END AS es_despachado
        FROM dbo.tramites t
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @AnioActual)
    )
    SELECT
        @AnioActual AS gestion,
        COUNT(CASE WHEN es_recibido = 1 AND estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO') THEN 1 END) AS total_bandeja,
        COUNT(CASE WHEN es_recibido = 1 AND estado IN ('POR_RECIBIR', 'EN_TRANSITO') THEN 1 END) AS por_recibir,
        COUNT(CASE WHEN es_recibido = 1 AND estado IN ('EN_ATENCION', 'CREADO', 'RECIBIDO', 'ATENDIDO') THEN 1 END) AS en_atencion,
        COUNT(CASE WHEN es_recibido = 1 AND estado = 'ATENDIDO' THEN 1 END) AS atendidos,
        COUNT(CASE WHEN es_despachado = 1 THEN 1 END) AS total_despachados,
        COUNT(CASE WHEN es_despachado = 1 AND estado IN ('POR_RECIBIR', 'EN_TRANSITO') THEN 1 END) AS despachados_sin_confirmar,
        COUNT(CASE WHEN es_despachado = 1 AND estado IN ('EN_ATENCION', 'RECIBIDO', 'ATENDIDO', 'CONCLUIDO', 'APROBADO_PLENO') THEN 1 END) AS despachados_confirmados,
        COUNT(CASE WHEN es_recibido = 1 AND es_vencido = 1 THEN 1 END) AS vencidos,
        COUNT(CASE WHEN es_recibido = 1 AND prioridad IN ('URGENTE', 'ALTA') AND estado NOT IN ('CONCLUIDO', 'ANULADO', 'RECHAZADO_PLENO') THEN 1 END) AS urgentes
    FROM BaseCalculo;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. usp_Tramites_ObtenerPorId: paso_actual y puede_operar por custodio
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id             INT = NULL,
    @TramiteId      INT = NULL,
    @UsuarioId      INT = NULL,
    @UbicacionOrgId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SET @Id = ISNULL(@Id, @TramiteId);

    IF @Id IS NULL OR NOT EXISTS (SELECT 1 FROM dbo.tramites WHERE id = @Id AND activo = 1)
        THROW 50004, 'El trámite solicitado no existe o fue dado de baja.', 1;

    -- Resultset 1
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
        t.paso_actual,
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
        t.usuario_actual_id,
        t.ubicacion_actual_id,
        uoAct.nombre AS ubicacion_actual_nombre,
        uoAct.sigla  AS ubicacion_actual_sigla,
        uoAct.codU   AS cod_u_actual,
        CASE
            WHEN @UsuarioId IS NOT NULL
             AND (t.usuario_actual_id = @UsuarioId
                  OR (t.usuario_actual_id IS NULL AND t.ubicacion_actual_id = @UbicacionOrgId))
             AND t.estado NOT IN ('CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO')
            THEN 1 ELSE 0
        END AS puede_operar,
        t.fecha_creacion,
        t.fecha_conclusion,
        t.fecha_limite_respuesta,
        t.fecha_inicio_informe,
        t.dias_plazo_informe,
        t.fecha_fin_informe,
        ISNULL(e.Nombres + ' ' + ISNULL(e.Apellidos, ''), e.login) AS creado_por_usuario,
        uo.nombre AS unidad_origen,
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
    LEFT JOIN dbo.ubicaciones_org uoAct ON uoAct.id = t.ubicacion_actual_id
    WHERE t.id = @Id AND t.activo = 1;

    -- Resultset 2
    SELECT
        m.id,
        m.orden,
        m.actividad_nombre AS actividad,
        m.tipo_movimiento,
        m.usuario_origen_id,
        ISNULL(uoE.Nombres + ' ' + ISNULL(uoE.Apellidos, ''), uoE.login) AS usuario_origen_nombre,
        ISNULL(uoE.cargo_nombre, cOrig.NombreC) AS usuario_origen_cargo,
        ISNULL(uo.nombre, 'Ventanilla Central') AS unidad_origen,
        m.usuario_destino_id,
        ISNULL(udE.Nombres + ' ' + ISNULL(udE.Apellidos, ''), udE.login) AS usuario_destino_nombre,
        ISNULL(udE.cargo_nombre, cDest.NombreC) AS usuario_destino_cargo,
        ISNULL(ud.nombre, 'Unidad de Destino') AS unidad_destino,
        m.estado_movimiento AS estado,
        m.proveido,
        m.instruccion,
        m.justificacion_retroceso,
        m.instrumento_generado,
        ISNULL(m.instrumentos_generados, m.instrumento_generado) AS instrumentos_generados,
        m.fecha_limite_respuesta,
        m.fecha_envio,
        m.fecha_recepcion,
        ISNULL(m.fecha_recepcion, ISNULL(m.fecha_envio, m.created_at)) AS fecha,
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
            THEN 1 ELSE 0
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

    -- Resultset 3
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
-- 14. Autenticación: exponer cod_cargo y cod_u para las reglas de rol/etapa
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Autenticar
    @Login NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.id,
        e.id AS persona_id,
        e.login,
        e.password_hash,
        ISNULL(e.cargo_nombre, c.NombreC) AS cargo,
        e.Activo AS activo,
        e.updated_at AS ultimo_acceso,
        e.Nombres AS nombres,
        e.Apellidos AS apellido_paterno,
        CAST('' AS VARCHAR(50)) AS apellido_materno,
        CAST(e.CI AS VARCHAR(20)) AS ci,
        e.Email AS email,
        e.cod_cargo,
        e.cod_u,
        c.NombreC AS cargo_oficial,
        u.NombU AS unidad_nombre
    FROM dbo.TEmpleados e
    LEFT JOIN dbo.TCargo c ON c.CodCargo = e.cod_cargo
    LEFT JOIN dbo.TUnidad u ON u.CodU = e.cod_u
    WHERE e.login = @Login AND e.Activo = 1;
END;
GO

CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.id,
        e.id AS persona_id,
        e.login,
        e.password_hash,
        ISNULL(e.cargo_nombre, c.NombreC) AS cargo,
        e.Activo AS activo,
        e.updated_at AS ultimo_acceso,
        e.created_at,
        e.Nombres AS nombres,
        e.Apellidos AS apellido_paterno,
        CAST('' AS VARCHAR(50)) AS apellido_materno,
        CAST(e.CI AS VARCHAR(20)) AS ci,
        CAST('CH' AS VARCHAR(5)) AS ci_expedido,
        e.Email AS email,
        CAST(e.Cel AS VARCHAR(20)) AS telefono,
        e.Direccion AS direccion,
        e.cod_u,
        u.NombU AS unidad_nombre,
        e.cod_cargo,
        c.NombreC AS cargo_oficial
    FROM dbo.TEmpleados e
    LEFT JOIN dbo.TUnidad u ON u.CodU = e.cod_u
    LEFT JOIN dbo.TCargo c ON c.CodCargo = e.cod_cargo
    WHERE e.id = @Id;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 15. usp_TEmpleados_Listar: filtro opcional por unidad institucional
--     Permite que los modales del circuito solo ofrezcan funcionarios de la
--     unidad de destino y conozcan su cargo.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_TEmpleados_Listar
    @Search VARCHAR(100) = NULL,
    @Activo BIT          = NULL,
    @Limit  INT          = 50,
    @Offset INT          = 0,
    @CodU   SMALLINT     = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.id,
        e.CI,
        e.Apellidos,
        e.Nombres,
        e.Direccion,
        e.Cel,
        e.Email,
        e.Activo,
        e.login,
        e.cargo_nombre,
        e.cod_u,
        u.NombU AS unidad_nombre,
        e.cod_cargo,
        c.NombreC AS cargo_oficial
    FROM dbo.TEmpleados e
    LEFT JOIN dbo.TUnidad u ON u.CodU = e.cod_u
    LEFT JOIN dbo.TCargo c ON c.CodCargo = e.cod_cargo
    WHERE (@Activo IS NULL OR e.Activo = @Activo)
      AND (@CodU IS NULL OR e.cod_u = @CodU)
      AND (@Search IS NULL OR @Search = ''
           OR e.Nombres LIKE '%' + @Search + '%'
           OR e.Apellidos LIKE '%' + @Search + '%'
           OR e.login LIKE '%' + @Search + '%'
           OR CAST(e.CI AS VARCHAR(20)) LIKE '%' + @Search + '%')
    ORDER BY e.Apellidos, e.Nombres
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO
