-- Migración 023: Circuito Plenario, Firmas Duales y Despacho Final (Alineación Concejo Municipal de Sucre - CMS)
-- T-SQL para SQL Server 2022+

-- 1. Agregar columnas a dbo.tramites si no existen
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.tramites') AND name = 'sesion_pleno_nro'
)
BEGIN
    ALTER TABLE dbo.tramites
    ADD sesion_pleno_nro VARCHAR(100) NULL,
        sesion_pleno_fecha DATETIME2 NULL,
        sesion_pleno_resultado VARCHAR(100) NULL,
        firma_presidencia BIT NOT NULL CONSTRAINT df_tramite_firma_presidencia DEFAULT 0,
        firma_presidencia_fecha DATETIME2 NULL,
        firma_presidencia_usuario VARCHAR(150) NULL,
        firma_secretaria BIT NOT NULL CONSTRAINT df_tramite_firma_secretaria DEFAULT 0,
        firma_secretaria_fecha DATETIME2 NULL,
        firma_secretaria_usuario VARCHAR(150) NULL,
        despacho_final_fecha DATETIME2 NULL,
        despacho_final_cite VARCHAR(100) NULL,
        despacho_final_destinatario NVARCHAR(250) NULL;
END;
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Procedimiento Almacenado: dbo.usp_Tramites_RegistrarAprobacionPleno
--    Registra la consideración y resolución en Sesión del Pleno del CMS
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
        DECLARE @EstadoActual VARCHAR(30), @UbicacionActualId INT;
        SELECT 
            @EstadoActual = estado,
            @UbicacionActualId = ubicacion_actual_id
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
            CASE WHEN @NuevoEstado = 'RECHAZADO_PLENO' THEN 'RECHAZADO' ELSE 'APROBADO' END,
            @DetalleMov,
            'Aprobado por el Pleno Camaral - En espera de firmas duales reglamentarias',
            @InstrumentoGenerado,
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
-- 3. Procedimiento Almacenado: dbo.usp_Tramites_RegistrarFirmaDual
--    Registra concurrentemente la firma de Presidencia o Secretaría General del CMS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_RegistrarFirmaDual
    @TramiteId          INT,
    @UsuarioId          INT,
    @TipoFirma          VARCHAR(30), -- 'PRESIDENCIA' | 'SECRETARIA'
    @Observaciones      NVARCHAR(MAX) = NULL,
    @NuevoMovimientoId  INT = NULL OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF @TramiteId IS NULL OR @TramiteId <= 0
    BEGIN
        THROW 50001, 'El identificador del trámite es obligatorio y debe ser válido.', 1;
    END

    IF @TipoFirma IS NULL OR @TipoFirma NOT IN ('PRESIDENCIA', 'SECRETARIA')
    BEGIN
        THROW 50044, 'El tipo de firma debe ser PRESIDENCIA o SECRETARIA.', 1;
    END

    BEGIN TRANSACTION;
    BEGIN TRY
        -- Validar trámite
        DECLARE @EstadoActual VARCHAR(30), @UbicacionActualId INT;
        SELECT 
            @EstadoActual = estado,
            @UbicacionActualId = ubicacion_actual_id
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @EstadoActual IS NULL
        BEGIN
            THROW 50004, 'El trámite especificado no existe o ha sido eliminado.', 1;
        END

        IF @EstadoActual IN ('CONCLUIDO', 'ANULADO')
        BEGIN
            THROW 50045, 'No se puede registrar firma en un trámite que ya está CONCLUIDO o ANULADO.', 1;
        END

        -- Resolver nombre del firmante
        DECLARE @NombreFirmante NVARCHAR(150);
        SELECT TOP 1 @NombreFirmante = ISNULL(Nombres + ' ' + ISNULL(Apellidos, ''), login)
        FROM dbo.TEmpleados WHERE id = @UsuarioId;

        IF @NombreFirmante IS NULL
        BEGIN
            SELECT TOP 1 @NombreFirmante = ISNULL(nombre_completo, username)
            FROM dbo.usuarios WHERE id = @UsuarioId;
        END

        IF @NombreFirmante IS NULL
        BEGIN
            SET @NombreFirmante = 'Autoridad CMS (Usuario #' + CAST(@UsuarioId AS VARCHAR) + ')';
        END

        DECLARE @Ahora DATETIME2 = GETDATE();

        -- Actualizar campos en dbo.tramites
        IF @TipoFirma = 'PRESIDENCIA'
        BEGIN
            UPDATE dbo.tramites
            SET firma_presidencia         = 1,
                firma_presidencia_fecha   = @Ahora,
                firma_presidencia_usuario = @NombreFirmante,
                updated_at                = @Ahora
            WHERE id = @TramiteId;
        END
        ELSE IF @TipoFirma = 'SECRETARIA'
        BEGIN
            UPDATE dbo.tramites
            SET firma_secretaria         = 1,
                firma_secretaria_fecha   = @Ahora,
                firma_secretaria_usuario = @NombreFirmante,
                updated_at               = @Ahora
            WHERE id = @TramiteId;
        END

        -- Resolver siguiente orden
        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        DECLARE @UbicacionUsuario INT = @UbicacionActualId;
        IF @UbicacionUsuario IS NULL
        BEGIN
            SELECT TOP 1 @UbicacionUsuario = id FROM dbo.ubicaciones_org WHERE activo = 1;
        END

        DECLARE @CargoFirmante NVARCHAR(150) = CASE 
            WHEN @TipoFirma = 'PRESIDENCIA' THEN 'Presidencia del Concejo Municipal de Sucre'
            ELSE 'Secretaría General del Concejo Municipal de Sucre'
        END;

        DECLARE @ActividadNombre VARCHAR(150) = CASE 
            WHEN @TipoFirma = 'PRESIDENCIA' THEN 'Rúbrica Institucional: Presidencia CMS'
            ELSE 'Rúbrica Institucional: Secretaría General CMS'
        END;

        DECLARE @ProveidoTexto NVARCHAR(MAX) = 'Firma reglamentaria estampada por ' + @NombreFirmante + ' en ejercicio de ' + @CargoFirmante + '.' + 
            CASE WHEN @Observaciones IS NOT NULL AND LTRIM(RTRIM(@Observaciones)) <> '' THEN ' Nota: ' + @Observaciones ELSE '' END;

        -- Registrar movimiento en dbo.movimientos
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
            'FIRMA_DUAL',
            @ActividadNombre,
            @UsuarioId,
            @UbicacionUsuario,
            @UsuarioId,
            @UbicacionUsuario,
            'FIRMADO',
            @ProveidoTexto,
            'Firma dual concurrente registrada según Reglamento Interno CMS',
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
-- 4. Procedimiento Almacenado: dbo.usp_Tramites_DespachoFinal
--    Valida estrictamente ambas firmas duales antes de concluir y despachar
-- ─────────────────────────────────────────────────────────────────────────────
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
        -- Validar estado y firmas duales concurrentes
        DECLARE @EstadoActual VARCHAR(30), 
                @UbicacionActualId INT,
                @FirmaPresidencia BIT,
                @FirmaSecretaria BIT,
                @FirmaPresidenciaFecha DATETIME2,
                @FirmaSecretariaFecha DATETIME2;

        SELECT 
            @EstadoActual = estado,
            @UbicacionActualId = ubicacion_actual_id,
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

        -- 2. Registrar movimiento en dbo.movimientos
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
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Actualización de dbo.usp_Tramites_ObtenerPorId
--    Proyecta información plenaria, firmas duales y despacho final en Resultset 1
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
        t.tipo_corres,
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

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Actualización de dbo.usp_Escritorio_ListarBandeja
--    Proyecta atributos del Circuito Plenario y Firmas Duales en la vista agregada
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Escritorio_ListarBandeja
    @UsuarioId      INT,
    @UbicacionOrgId INT           = NULL,
    @Bandeja        VARCHAR(30)   = 'RECIBIDOS', -- 'RECIBIDOS' | 'DESPACHADOS' | 'TODOS'
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
            m.tramite_id,
            m.id,
            m.actividad_nombre,
            m.fecha_envio,
            m.fecha_recepcion,
            m.proveido,
            m.instrumento_generado,
            m.orden,
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
            -- Atributos de Pleno y Firmas Duales CMS
            t.sesion_pleno_nro,
            t.sesion_pleno_resultado,
            t.firma_presidencia,
            t.firma_secretaria,
            t.despacho_final_cite,
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
        INNER JOIN dbo.tipos_proceso tp     ON tp.id = t.tipo_proceso_id
        LEFT JOIN dbo.TEmpleados uAct       ON uAct.id = t.usuario_actual_id
        LEFT JOIN dbo.ubicaciones_org uoAct ON uoAct.id = t.ubicacion_actual_id
        LEFT JOIN UltimosMovimientos ultMov ON ultMov.tramite_id = t.id AND ultMov.rn = 1
        WHERE t.activo = 1
          AND (@Gestion IS NULL OR t.gestion = @Gestion)
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
        b.actividad_actual,
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
        b.sesion_pleno_nro,
        b.sesion_pleno_resultado,
        b.firma_presidencia,
        b.firma_secretaria,
        b.despacho_final_cite,
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
            OR ISNULL(b.sesion_pleno_nro, '') LIKE '%' + @Search + '%'
            OR ISNULL(b.despacho_final_cite, '') LIKE '%' + @Search + '%'
        )
    ORDER BY 
        CASE WHEN @Bandeja = 'DESPACHADOS' THEN ISNULL(b.ult_fecha_envio, b.fecha_creacion)
             ELSE ISNULL(b.ult_fecha_recepcion, ISNULL(b.ult_fecha_envio, b.fecha_creacion))
        END DESC
    OFFSET @Offset ROWS
    FETCH NEXT @Limit ROWS ONLY;
END;
GO
