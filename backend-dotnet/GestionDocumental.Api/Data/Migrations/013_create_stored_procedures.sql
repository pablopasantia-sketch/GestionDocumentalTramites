-- =============================================================================
-- MIGRACIÓN 013: STORED PROCEDURES - SISTEMA WAYKA MVP
-- Base de datos: DB_TRAMITES_EXTERNOS
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_AutenticarUsuario: Valida login y devuelve datos del usuario + roles
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_AutenticarUsuario
    @Login NVARCHAR(50)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.persona_id,
        u.login,
        u.password_hash,
        u.cargo,
        u.activo,
        u.ultimo_acceso,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.email
    FROM dbo.usuarios u
    INNER JOIN dbo.personas p ON p.id = u.persona_id
    WHERE u.login = @Login AND u.activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ObtenerRolesUsuario: Devuelve todos los roles activos de un usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerRolesUsuario
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        ur.id,
        ur.usuario_id,
        ur.rol_id,
        r.codigo  AS rol_codigo,
        r.nombre  AS rol_nombre,
        ur.ubicacion_org_id,
        uo.codigo AS ubicacion_codigo,
        uo.nombre AS ubicacion_nombre,
        uo.sigla  AS ubicacion_sigla,
        ur.nivel_acceso,
        ur.fecha_expiracion,
        ur.es_principal,
        ur.activo
    FROM dbo.usuario_roles ur
    INNER JOIN dbo.roles r        ON r.id  = ur.rol_id
    INNER JOIN dbo.ubicaciones_org uo ON uo.id = ur.ubicacion_org_id
    WHERE ur.usuario_id = @UsuarioId
      AND ur.activo = 1
      AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion >= CAST(GETDATE() AS DATE))
    ORDER BY ur.es_principal DESC, r.nombre;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ActualizarUltimoAcceso: Registra el último acceso del usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ActualizarUltimoAcceso
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.usuarios
    SET ultimo_acceso = GETDATE(),
        updated_at    = GETDATE()
    WHERE id = @UsuarioId;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ListarTramites: Lista paginada de trámites con filtros opcionales
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarTramites
    @Estado      NVARCHAR(30)  = NULL,
    @Gestion     INT           = NULL,
    @Search      NVARCHAR(200) = NULL,
    @Limit       INT           = 50,
    @Offset      INT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.nombre        AS tipo_proceso_nombre,
        t.tipo_corres,
        t.remitente,
        t.referencia,
        t.prioridad,
        t.nro_hojas,
        t.estado,
        uo.nombre        AS ubicacion_actual_nombre,
        us.login         AS usuario_actual_login,
        t.fecha_creacion,
        (SELECT COUNT(*) FROM dbo.adjuntos a WHERE a.tramite_id = t.id AND a.activo = 1) AS nro_adjuntos
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso   tp ON tp.id = t.tipo_proceso_id
    LEFT  JOIN dbo.ubicaciones_org uo ON uo.id = t.ubicacion_actual_id
    LEFT  JOIN dbo.usuarios        us ON us.id = t.usuario_actual_id
    WHERE t.activo = 1
      AND (@Estado  IS NULL OR @Estado = 'TODOS' OR t.estado = @Estado)
      AND (@Gestion IS NULL OR t.gestion = @Gestion)
      AND (@Search  IS NULL OR
           t.numero_correlativo LIKE '%' + @Search + '%' OR
           t.remitente          LIKE '%' + @Search + '%' OR
           t.referencia         LIKE '%' + @Search + '%' OR
           tp.nombre            LIKE '%' + @Search + '%')
    ORDER BY t.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ObtenerTramitePorId: Detalle completo de un trámite por ID
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerTramitePorId
    @TramiteId INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Datos del trámite
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.codigo        AS tipo_proceso_codigo,
        tp.nombre        AS tipo_proceso_nombre,
        tp.tipo_categoria,
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
        t.fecha_limite_respuesta,
        t.fecha_conclusion,
        t.motivo_anulacion,
        ISNULL(p.nombres + ' ' + p.apellido_paterno, us_c.login) AS creado_por_usuario,
        uo.nombre        AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso   tp   ON tp.id  = t.tipo_proceso_id
    LEFT  JOIN dbo.usuarios        us_c ON us_c.id = t.creado_por
    LEFT  JOIN dbo.personas        p    ON p.id    = us_c.persona_id
    LEFT  JOIN dbo.ubicaciones_org uo   ON uo.id   = t.ubicacion_org_id
    WHERE t.id = @TramiteId AND t.activo = 1;

    -- Historial de movimientos
    SELECT
        m.orden,
        m.actividad_nombre,
        m.tipo_movimiento,
        uo_o.nombre AS unidad_origen,
        uo_d.nombre AS unidad_destino,
        m.estado_movimiento,
        m.proveido,
        ISNULL(m.fecha_recepcion, ISNULL(m.fecha_envio, m.created_at)) AS fecha
    FROM dbo.movimientos m
    LEFT JOIN dbo.ubicaciones_org uo_o ON uo_o.id = m.ubicacion_origen_id
    LEFT JOIN dbo.ubicaciones_org uo_d ON uo_d.id = m.ubicacion_destino_id
    WHERE m.tramite_id = @TramiteId
    ORDER BY m.orden;

    -- Adjuntos activos
    SELECT
        a.id,
        a.tramite_id,
        a.movimiento_id,
        a.nombre_original,
        a.tamano_bytes,
        a.tipo_mime,
        ISNULL(p2.nombres + ' ' + p2.apellido_paterno, us2.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    LEFT JOIN dbo.usuarios us2 ON us2.id = a.subido_por
    LEFT JOIN dbo.personas  p2 ON p2.id  = us2.persona_id
    WHERE a.tramite_id = @TramiteId AND a.activo = 1
    ORDER BY a.id DESC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ConsultaPublicaTramite: Consulta ciudadana por número correlativo
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ConsultaPublicaTramite
    @NumeroCorrelativo NVARCHAR(50),
    @Gestion           INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        tp.nombre        AS tipo_proceso,
        tp.tipo_categoria,
        t.referencia,
        t.remitente,
        t.estado,
        t.prioridad,
        t.nro_hojas,
        t.fecha_creacion,
        t.fecha_conclusion,
        uo_act.nombre AS ubicacion_actual,
        uo_org.nombre AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso   tp      ON tp.id  = t.tipo_proceso_id
    LEFT  JOIN dbo.ubicaciones_org uo_act  ON uo_act.id = t.ubicacion_actual_id
    LEFT  JOIN dbo.ubicaciones_org uo_org  ON uo_org.id = t.ubicacion_org_id
    WHERE t.numero_correlativo = @NumeroCorrelativo
      AND t.gestion = @Gestion
      AND t.activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ObtenerEstadisticasTramites: Conteo por estado para dashboard
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerEstadisticasTramites
    @Gestion INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        @Gestion                                                 AS gestion,
        COUNT(*)                                                 AS total,
        SUM(CASE WHEN estado = 'CREADO'        THEN 1 ELSE 0 END) AS creados,
        SUM(CASE WHEN estado = 'EN_ATENCION'   THEN 1 ELSE 0 END) AS en_atencion,
        SUM(CASE WHEN estado IN ('EN_TRANSITO','POR_RECIBIR') THEN 1 ELSE 0 END) AS en_transito,
        SUM(CASE WHEN estado = 'RECIBIDO'      THEN 1 ELSE 0 END) AS recibidos,
        SUM(CASE WHEN estado = 'BLOQUEADO'     THEN 1 ELSE 0 END) AS bloqueados,
        SUM(CASE WHEN estado = 'CONCLUIDO'     THEN 1 ELSE 0 END) AS concluidos,
        SUM(CASE WHEN estado = 'ANULADO'       THEN 1 ELSE 0 END) AS anulados
    FROM dbo.tramites
    WHERE gestion = @Gestion AND activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_CrearTramite: Inserta un nuevo trámite y su movimiento inicial de forma atómica
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_CrearTramite
    @TipoProcesoId        INT,
    @Remitente            NVARCHAR(200),
    @InstitucionRemitente NVARCHAR(200) = NULL,
    @CiteExterno          NVARCHAR(100) = NULL,
    @Referencia           NVARCHAR(MAX),
    @TipoCorres           NVARCHAR(50)  = 'CORRESPONDENCIA',
    @NroHojas             INT           = 1,
    @NroAnexos            INT           = 0,
    @Instruccion          NVARCHAR(500) = NULL,
    @Prioridad            NVARCHAR(20)  = 'NORMAL',
    @CodUDestino          SMALLINT      = NULL,
    @CodCargoDestino      SMALLINT      = NULL,
    @CiEmpleadoDestino    INT           = NULL,
    @DestinatarioNombre   NVARCHAR(200) = NULL,
    @DestinatarioCargo    NVARCHAR(150) = NULL,
    @DestinatarioUnidad   NVARCHAR(150) = NULL,
    @PrimerDestinatarioId INT           = NULL,
    @ProveidoInicial      NVARCHAR(MAX) = NULL,
    @UsuarioId            INT,
    @UbicacionId          INT,
    @TramiteId            INT OUTPUT,
    @NumeroCorrelativo    NVARCHAR(50)  OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Year            INT           = YEAR(GETDATE());
        DECLARE @TipoCodigo      NVARCHAR(20);
        DECLARE @TiempoHoras     INT;
        DECLARE @UltimoNumero    INT;
        DECLARE @NextSeq         INT;
        DECLARE @CorrId          INT;
        DECLARE @FechaLimite     DATETIME;
        DECLARE @Ahora           DATETIME      = GETDATE();
        DECLARE @ProvText        NVARCHAR(MAX);

        SELECT @TipoCodigo  = codigo,
               @TiempoHoras = tiempo_estimado_horas
        FROM dbo.tipos_proceso
        WHERE id = @TipoProcesoId AND activo = 1;

        IF @TipoCodigo IS NULL
            THROW 50001, 'Tipo de proceso no encontrado o inactivo.', 1;

        SELECT @CorrId       = id,
               @UltimoNumero = ultimo_numero
        FROM dbo.correlativos WITH (UPDLOCK, ROWLOCK)
        WHERE tipo_proceso_id = @TipoProcesoId AND gestion = @Year;

        IF @CorrId IS NULL
        BEGIN
            INSERT INTO dbo.correlativos (tipo_proceso_id, ubicacion_org_id, gestion, ultimo_numero, created_at, updated_at)
            VALUES (@TipoProcesoId, @UbicacionId, @Year, 1, @Ahora, @Ahora);
            SET @NextSeq = 1;
        END
        ELSE
        BEGIN
            SET @NextSeq = @UltimoNumero + 1;
            UPDATE dbo.correlativos
            SET ultimo_numero = @NextSeq, updated_at = @Ahora
            WHERE id = @CorrId;
        END;

        UPDATE dbo.tipos_proceso
        SET correlativo_seq = @NextSeq, updated_at = @Ahora
        WHERE id = @TipoProcesoId;

        SET @NumeroCorrelativo = @TipoCodigo + '-' + CAST(@NextSeq AS NVARCHAR) + '/' + CAST(@Year AS NVARCHAR);
        SET @FechaLimite = CASE WHEN @TiempoHoras > 0 THEN DATEADD(HOUR, @TiempoHoras, @Ahora) ELSE NULL END;

        INSERT INTO dbo.tramites (
            numero_correlativo, gestion, tipo_proceso_id, estado,
            remitente, institucion_remitente, cite_externo, referencia,
            tipo_corres, nro_hojas, nro_anexos, instruccion, prioridad,
            cod_u_destino, cod_cargo_destino, ci_empleado_destino,
            destinatario_nombre, destinatario_cargo, destinatario_unidad,
            primer_destinatario_id, fecha_creacion, fecha_limite_respuesta,
            creado_por, ubicacion_org_id, usuario_actual_id, ubicacion_actual_id,
            activo, created_at, updated_at
        )
        VALUES (
            @NumeroCorrelativo, @Year, @TipoProcesoId, 'CREADO',
            @Remitente, @InstitucionRemitente, @CiteExterno, @Referencia,
            @TipoCorres, @NroHojas, @NroAnexos, @Instruccion, @Prioridad,
            @CodUDestino, @CodCargoDestino, @CiEmpleadoDestino,
            @DestinatarioNombre, @DestinatarioCargo, @DestinatarioUnidad,
            @PrimerDestinatarioId, @Ahora, @FechaLimite,
            @UsuarioId, @UbicacionId, @UsuarioId, @UbicacionId,
            1, @Ahora, @Ahora
        );

        SET @TramiteId = SCOPE_IDENTITY();

        SET @ProvText = ISNULL(@ProveidoInicial, N'Recepcion y apertura de Hoja de Ruta externa ' + @NumeroCorrelativo + '.');

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            estado_movimiento, proveido, instruccion,
            tiempo_estimado_minutos, fecha_envio, fecha_recepcion, created_at
        )
        VALUES (
            @TramiteId, 1, 'INICIO', 'Recepcion en Ventanilla Unica',
            @UsuarioId, @UbicacionId,
            'CREADO', @ProvText, @Instruccion,
            @TiempoHoras * 60, @Ahora, @Ahora, @Ahora
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_AnularTramite: Anula un trámite y registra el movimiento de anulación
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_AnularTramite
    @TramiteId   INT,
    @UsuarioId   INT,
    @UbicacionId INT,
    @Motivo      NVARCHAR(MAX)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @Ahora      DATETIME = GETDATE();
        DECLARE @NextOrden  INT;
        DECLARE @CreadoPor  INT;
        DECLARE @UbiOrg     INT;
        DECLARE @NumCorr    NVARCHAR(50);

        SELECT @CreadoPor = creado_por,
               @UbiOrg    = ubicacion_org_id,
               @NumCorr   = numero_correlativo
        FROM dbo.tramites
        WHERE id = @TramiteId AND activo = 1;

        IF @NumCorr IS NULL
            THROW 50002, 'Tramite no encontrado o ya inactivo.', 1;

        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1
        FROM dbo.movimientos
        WHERE tramite_id = @TramiteId;

        UPDATE dbo.tramites
        SET estado            = 'ANULADO',
            motivo_anulacion  = @Motivo,
            updated_at        = @Ahora
        WHERE id = @TramiteId;

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id,
            estado_movimiento, proveido,
            fecha_envio, created_at
        )
        VALUES (
            @TramiteId, @NextOrden, 'ANULACION', 'Anulacion de tramite',
            CASE WHEN @UsuarioId > 0 THEN @UsuarioId ELSE @CreadoPor END,
            CASE WHEN @UbicacionId > 0 THEN @UbicacionId ELSE @UbiOrg END,
            'ANULADO', 'Anulacion: ' + @Motivo,
            @Ahora, @Ahora
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ListarUsuarios: Lista de usuarios con personas y roles activos
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarUsuarios
    @Search NVARCHAR(200) = NULL,
    @Activo NVARCHAR(10)  = 'true'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.persona_id,
        u.login,
        u.cargo,
        u.activo,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.email
    FROM dbo.usuarios u
    INNER JOIN dbo.personas p ON p.id = u.persona_id
    WHERE (
        @Activo = 'all'
        OR (@Activo = 'false' AND u.activo = 0)
        OR u.activo = 1
    )
    AND (
        @Search IS NULL OR
        u.login               LIKE '%' + @Search + '%' OR
        u.cargo               LIKE '%' + @Search + '%' OR
        p.nombres             LIKE '%' + @Search + '%' OR
        p.apellido_paterno    LIKE '%' + @Search + '%' OR
        p.ci                  LIKE '%' + @Search + '%'
    )
    ORDER BY u.login;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ObtenerUsuarioPorId: Detalle de un usuario por ID
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerUsuarioPorId
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.persona_id,
        u.login,
        u.cargo,
        u.activo,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.email
    FROM dbo.usuarios u
    INNER JOIN dbo.personas p ON p.id = u.persona_id
    WHERE u.id = @UsuarioId;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_CambiarPasswordUsuario: Actualiza el hash de contraseña
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_CambiarPasswordUsuario
    @UsuarioId INT,
    @NuevoHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.usuarios
    SET password_hash = @NuevoHash,
        updated_at    = GETDATE()
    WHERE id = @UsuarioId;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ListarUnidades: Listado de unidades institucionales (TUnidad)
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarUnidades
    @Activo BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.CodU,
        u.NombU,
        u.Activo,
        (SELECT COUNT(*) FROM dbo.TCargo c WHERE c.CodU = u.CodU) AS TotalCargos
    FROM dbo.TUnidad u
    WHERE (@Activo IS NULL OR u.Activo = @Activo)
    ORDER BY u.CodU;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ListarCargos: Listado de cargos institucionales (TCargo) con filtro por unidad
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarCargos
    @CodU SMALLINT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.CodCargo,
        c.NombreC,
        c.CodU,
        u.NombU AS UnidadNombre
    FROM dbo.TCargo c
    LEFT JOIN dbo.TUnidad u ON u.CodU = c.CodU
    WHERE (@CodU IS NULL OR c.CodU = @CodU)
    ORDER BY c.CodCargo;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ListarEmpleados: Busqueda de empleados institucionales (TEmpleados)
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarEmpleados
    @Activo BIT           = NULL,
    @Search NVARCHAR(200) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.CI,
        e.Apellidos,
        e.Nombres,
        e.Nombres + ' ' + e.Apellidos AS NombreCompleto,
        e.Direccion,
        e.Cel,
        e.Email,
        e.Activo
    FROM dbo.TEmpleados e
    WHERE (@Activo IS NULL OR e.Activo = @Activo)
      AND (@Search IS NULL OR
           e.Nombres   LIKE '%' + @Search + '%' OR
           e.Apellidos LIKE '%' + @Search + '%' OR
           CAST(e.CI AS NVARCHAR) LIKE '%' + @Search + '%')
    ORDER BY e.Apellidos, e.Nombres;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_ObtenerEmpleadoPorCI: Busca un empleado por su CI
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerEmpleadoPorCI
    @CI INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.CI,
        e.Apellidos,
        e.Nombres,
        e.Nombres + ' ' + e.Apellidos AS NombreCompleto,
        e.Direccion,
        e.Cel,
        e.Email,
        e.Activo
    FROM dbo.TEmpleados e
    WHERE e.CI = @CI;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- SP_PreviewCorrelativo: Vista previa del siguiente numero correlativo
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.SP_PreviewCorrelativo
    @TipoProcesoId INT,
    @Gestion       INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year       INT          = ISNULL(@Gestion, YEAR(GETDATE()));
    DECLARE @Codigo     NVARCHAR(20);
    DECLARE @Nombre     NVARCHAR(150);
    DECLARE @TiempoHrs  INT;
    DECLARE @UltNum     INT;
    DECLARE @NextNum    INT;
    DECLARE @Preview    NVARCHAR(50);

    SELECT @Codigo    = codigo,
           @Nombre    = nombre,
           @TiempoHrs = tiempo_estimado_horas
    FROM dbo.tipos_proceso
    WHERE id = @TipoProcesoId AND activo = 1;

    IF @Codigo IS NULL
    BEGIN
        SELECT NULL AS numero_correlativo, NULL AS gestion,
               NULL AS codigo_tipo,        NULL AS nombre_tipo,
               NULL AS tiempo_estimado_horas;
        RETURN;
    END;

    SELECT @UltNum = ISNULL(ultimo_numero, 0)
    FROM dbo.correlativos
    WHERE tipo_proceso_id = @TipoProcesoId AND gestion = @Year;

    SET @NextNum = ISNULL(@UltNum, 0) + 1;
    SET @Preview = @Codigo + '-' + CAST(@NextNum AS NVARCHAR) + '/' + CAST(@Year AS NVARCHAR);

    SELECT @Preview    AS numero_correlativo,
           @Year       AS gestion,
           @Codigo     AS codigo_tipo,
           @Nombre     AS nombre_tipo,
           @TiempoHrs  AS tiempo_estimado_horas;
END
GO
