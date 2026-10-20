-- =============================================================================
-- MIGRACIÓN 022: VENTANILLA ÚNICA CMS - MACRO-BIFURCACIÓN DE CANALES
-- Sistema Wayka - Adenda Operativa Post-Sprint 3 (Concejo Municipal de Sucre - CMS)
-- Base de datos: DB_TRAMITES_EXTERNOS (Microsoft SQL Server T-SQL)
-- =============================================================================

-- Actualización de dbo.usp_Tramites_Crear para admitir @TipoCorres ('EXTERNA' / 'INTERNA')
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

        -- 4. Insertar Trámite con tipo_corres registrado (Bifurcación CMS)
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
            @NumeroCorrelativo, @Year, @TipoProcesoId, 'CREADO',
            @Remitente, @InstitucionRemitente, @CiteExterno, @Referencia,
            @TipoCorresNorm, @NroHojas, @NroAnexos, @Instruccion, @Prioridad,
            @CodUDestino, @CodCargoDestino, @CiEmpleadoDestino,
            @DestinatarioNombre, @DestinatarioCargo, @DestinatarioUnidad,
            ISNULL(@PrimerDestinatarioId, @UsuarioDestinoId), @Ahora, @FechaLimite,
            @UserId, @UbicacionId, @UserId, @UbicacionId,
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
            'CREADO',
            @Prov, @Instruccion, @HorasSLA * 60,
            @Ahora, @Ahora, @Ahora
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
-- Actualización de dbo.usp_Tramites_ObtenerPorId
-- Proyecta t.tipo_corres en Resultset 1 (Cabecera del Trámite)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;

    -- Resultset 1: Datos principales del trámite (incluyendo tipo_corres)
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
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN dbo.TEmpleados uoE      ON uoE.id = m.usuario_origen_id
    LEFT JOIN dbo.TCargo cOrig        ON cOrig.CodCargo = uoE.cod_cargo
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
