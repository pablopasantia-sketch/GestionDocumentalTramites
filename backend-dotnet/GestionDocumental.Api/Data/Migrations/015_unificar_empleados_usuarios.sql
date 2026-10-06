-- Migración 015: Unificación de Personal Municipal y Cuentas de Acceso (TEmpleados absorbe usuarios)
-- DB_TRAMITES_EXTERNOS T-SQL

-- 1. Adaptar dbo.TEmpleados para incluir ID, credenciales de acceso y asignaciones institucionales
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') 
      AND name = 'id'
)
BEGIN
    ALTER TABLE dbo.TEmpleados ADD [id] INT IDENTITY(1,1) NOT NULL;
    ALTER TABLE dbo.TEmpleados ADD CONSTRAINT [UK_TEmpleados_Id] UNIQUE ([id]);
END;
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'login')
    ALTER TABLE dbo.TEmpleados ADD [login] VARCHAR(50) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'password_hash')
    ALTER TABLE dbo.TEmpleados ADD [password_hash] VARCHAR(255) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'cargo_nombre')
    ALTER TABLE dbo.TEmpleados ADD [cargo_nombre] VARCHAR(100) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'avatar_url')
    ALTER TABLE dbo.TEmpleados ADD [avatar_url] VARCHAR(255) NULL;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'cod_u')
BEGIN
    ALTER TABLE dbo.TEmpleados ADD [cod_u] SMALLINT NULL;
    ALTER TABLE dbo.TEmpleados ADD CONSTRAINT [FK_TEmpleados_TUnidad] 
        FOREIGN KEY ([cod_u]) REFERENCES dbo.TUnidad ([CodU]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'cod_cargo')
BEGIN
    ALTER TABLE dbo.TEmpleados ADD [cod_cargo] SMALLINT NULL;
    ALTER TABLE dbo.TEmpleados ADD CONSTRAINT [FK_TEmpleados_TCargo] 
        FOREIGN KEY ([cod_cargo]) REFERENCES dbo.TCargo ([CodCargo]);
END;

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'created_at')
    ALTER TABLE dbo.TEmpleados ADD [created_at] DATETIME2 NOT NULL CONSTRAINT [DF_TEmpleados_CreatedAt] DEFAULT (GETDATE());

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID(N'dbo.TEmpleados') AND name = 'updated_at')
    ALTER TABLE dbo.TEmpleados ADD [updated_at] DATETIME2 NOT NULL CONSTRAINT [DF_TEmpleados_UpdatedAt] DEFAULT (GETDATE());
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'UK_TEmpleados_Login' AND object_id = OBJECT_ID(N'dbo.TEmpleados'))
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX UK_TEmpleados_Login 
    ON dbo.TEmpleados ([login]) 
    WHERE [login] IS NOT NULL;
END;
GO

-- 2. Migrar credenciales desde dbo.usuarios (si existe) y redirigir claves foráneas
IF OBJECT_ID(N'dbo.usuarios', N'U') IS NOT NULL
BEGIN
    -- Sincronizar credenciales existentes por coincidencia de CI
    UPDATE e
    SET e.login         = u.login,
        e.password_hash = u.password_hash,
        e.cargo_nombre  = u.cargo,
        e.Activo        = u.activo
    FROM dbo.TEmpleados e
    INNER JOIN dbo.personas p ON TRY_CAST(p.ci AS INT) = e.CI
    INNER JOIN dbo.usuarios u ON u.persona_id = p.id;

    -- Eliminar restricciones que apuntaban a la tabla usuarios
    IF OBJECT_ID(N'dbo.fk_ur_usuario', N'F') IS NOT NULL ALTER TABLE dbo.usuario_roles DROP CONSTRAINT fk_ur_usuario;
    IF OBJECT_ID(N'dbo.fk_tramite_creador', N'F') IS NOT NULL ALTER TABLE dbo.tramites DROP CONSTRAINT fk_tramite_creador;
    IF OBJECT_ID(N'dbo.fk_tramite_usr_actual', N'F') IS NOT NULL ALTER TABLE dbo.tramites DROP CONSTRAINT fk_tramite_usr_actual;
    IF OBJECT_ID(N'dbo.fk_tramite_primer_dest', N'F') IS NOT NULL ALTER TABLE dbo.tramites DROP CONSTRAINT fk_tramite_primer_dest;
    IF OBJECT_ID(N'dbo.fk_mov_usr_origen', N'F') IS NOT NULL ALTER TABLE dbo.movimientos DROP CONSTRAINT fk_mov_usr_origen;
    IF OBJECT_ID(N'dbo.fk_mov_usr_dest', N'F') IS NOT NULL ALTER TABLE dbo.movimientos DROP CONSTRAINT fk_mov_usr_dest;
    IF OBJECT_ID(N'dbo.fk_adj_usuario', N'F') IS NOT NULL ALTER TABLE dbo.adjuntos DROP CONSTRAINT fk_adj_usuario;
    IF OBJECT_ID(N'dbo.fk_usuarios_persona', N'F') IS NOT NULL ALTER TABLE dbo.usuarios DROP CONSTRAINT fk_usuarios_persona;

    -- Re-apuntar las restricciones de forma segura a dbo.TEmpleados ([id])
    ALTER TABLE dbo.usuario_roles WITH CHECK ADD CONSTRAINT fk_ur_usuario 
        FOREIGN KEY (usuario_id) REFERENCES dbo.TEmpleados ([id]);
    ALTER TABLE dbo.tramites WITH CHECK ADD CONSTRAINT fk_tramite_creador 
        FOREIGN KEY (creado_por) REFERENCES dbo.TEmpleados ([id]);
    ALTER TABLE dbo.tramites WITH CHECK ADD CONSTRAINT fk_tramite_usr_actual 
        FOREIGN KEY (usuario_actual_id) REFERENCES dbo.TEmpleados ([id]);
    ALTER TABLE dbo.tramites WITH CHECK ADD CONSTRAINT fk_tramite_primer_dest 
        FOREIGN KEY (primer_destinatario_id) REFERENCES dbo.TEmpleados ([id]);
    ALTER TABLE dbo.movimientos WITH CHECK ADD CONSTRAINT fk_mov_usr_origen 
        FOREIGN KEY (usuario_origen_id) REFERENCES dbo.TEmpleados ([id]);
    ALTER TABLE dbo.movimientos WITH CHECK ADD CONSTRAINT fk_mov_usr_dest 
        FOREIGN KEY (usuario_destino_id) REFERENCES dbo.TEmpleados ([id]);
    ALTER TABLE dbo.adjuntos WITH CHECK ADD CONSTRAINT fk_adj_usuario 
        FOREIGN KEY (subido_por) REFERENCES dbo.TEmpleados ([id]);

    -- Eliminar la tabla usuarios redundante
    DROP TABLE dbo.usuarios;
END
ELSE
BEGIN
    -- Si la tabla usuarios ya no existe, verificar y asegurar las FKs hacia TEmpleados
    IF OBJECT_ID(N'dbo.fk_ur_usuario', N'F') IS NULL
        ALTER TABLE dbo.usuario_roles WITH CHECK ADD CONSTRAINT fk_ur_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.TEmpleados ([id]);
    IF OBJECT_ID(N'dbo.fk_tramite_creador', N'F') IS NULL
        ALTER TABLE dbo.tramites WITH CHECK ADD CONSTRAINT fk_tramite_creador FOREIGN KEY (creado_por) REFERENCES dbo.TEmpleados ([id]);
    IF OBJECT_ID(N'dbo.fk_tramite_usr_actual', N'F') IS NULL
        ALTER TABLE dbo.tramites WITH CHECK ADD CONSTRAINT fk_tramite_usr_actual FOREIGN KEY (usuario_actual_id) REFERENCES dbo.TEmpleados ([id]);
    IF OBJECT_ID(N'dbo.fk_tramite_primer_dest', N'F') IS NULL
        ALTER TABLE dbo.tramites WITH CHECK ADD CONSTRAINT fk_tramite_primer_dest FOREIGN KEY (primer_destinatario_id) REFERENCES dbo.TEmpleados ([id]);
    IF OBJECT_ID(N'dbo.fk_mov_usr_origen', N'F') IS NULL
        ALTER TABLE dbo.movimientos WITH CHECK ADD CONSTRAINT fk_mov_usr_origen FOREIGN KEY (usuario_origen_id) REFERENCES dbo.TEmpleados ([id]);
    IF OBJECT_ID(N'dbo.fk_mov_usr_dest', N'F') IS NULL
        ALTER TABLE dbo.movimientos WITH CHECK ADD CONSTRAINT fk_mov_usr_dest FOREIGN KEY (usuario_destino_id) REFERENCES dbo.TEmpleados ([id]);
    IF OBJECT_ID(N'dbo.fk_adj_usuario', N'F') IS NULL
        ALTER TABLE dbo.adjuntos WITH CHECK ADD CONSTRAINT fk_adj_usuario FOREIGN KEY (subido_por) REFERENCES dbo.TEmpleados ([id]);
END;
GO

-- 3. Stored Procedures actualizados para operar con dbo.TEmpleados

-- usp_Usuarios_Autenticar: Valida login directo en TEmpleados
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
        e.Email AS email
    FROM dbo.TEmpleados e
    LEFT JOIN dbo.TCargo c ON c.CodCargo = e.cod_cargo
    WHERE e.login = @Login AND e.Activo = 1;
END;
GO

-- usp_Usuarios_ObtenerRoles: Retorna roles activos de un funcionario (id)
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_ObtenerRoles
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
    INNER JOIN dbo.roles r ON r.id = ur.rol_id
    INNER JOIN dbo.ubicaciones_org uo ON uo.id = ur.ubicacion_org_id
    WHERE ur.usuario_id = @UsuarioId
      AND ur.activo = 1
      AND r.activo = 1
      AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion >= CAST(GETDATE() AS DATE));
END;
GO

-- usp_Usuarios_Listar: Listado completo de personal municipal con roles
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Listar
    @Activo VARCHAR(20) = 'activos',
    @Search NVARCHAR(100) = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.id,
        CAST(e.CI AS VARCHAR(20)) AS ci,
        e.Nombres AS nombres,
        e.Apellidos AS apellido_paterno,
        CAST('' AS VARCHAR(50)) AS apellido_materno,
        e.Nombres + ' ' + e.Apellidos AS nombre_completo,
        e.login,
        e.Email AS email,
        CAST(e.Cel AS VARCHAR(20)) AS telefono,
        e.Direccion AS direccion,
        ISNULL(e.cargo_nombre, c.NombreC) AS cargo,
        e.cod_u,
        u.NombU AS unidad_nombre,
        e.cod_cargo,
        c.NombreC AS cargo_oficial,
        e.Activo AS activo,
        e.updated_at AS ultimo_acceso,
        e.created_at,
        STRING_AGG(r.nombre, ', ') AS roles_nombres
    FROM dbo.TEmpleados e
    LEFT JOIN dbo.TUnidad u ON u.CodU = e.cod_u
    LEFT JOIN dbo.TCargo c ON c.CodCargo = e.cod_cargo
    LEFT JOIN dbo.usuario_roles ur ON ur.usuario_id = e.id AND ur.activo = 1
    LEFT JOIN dbo.roles r ON r.id = ur.rol_id AND r.activo = 1
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND e.Activo = 1) OR (@Activo = 'inactivos' AND e.Activo = 0))
      AND (@Search IS NULL OR @Search = '' 
           OR e.Nombres LIKE '%' + @Search + '%' 
           OR e.Apellidos LIKE '%' + @Search + '%' 
           OR e.login LIKE '%' + @Search + '%' 
           OR CAST(e.CI AS VARCHAR(20)) LIKE '%' + @Search + '%')
    GROUP BY e.id, e.CI, e.Nombres, e.Apellidos, e.login, e.Email, e.Cel, e.Direccion,
             e.cargo_nombre, c.NombreC, e.cod_u, u.NombU, e.cod_cargo, e.Activo, e.updated_at, e.created_at
    ORDER BY e.Apellidos, e.Nombres;
END;
GO

-- usp_Usuarios_ObtenerPorId: Detalle completo de un funcionario por ID
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        e.id,
        e.id AS persona_id,
        e.login,
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

-- usp_Usuarios_Insertar: Registra funcionario con o sin credenciales de acceso
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Insertar
    @PersonaId     INT           = NULL, -- Mantenido por compatibilidad
    @Login         NVARCHAR(50)  = NULL,
    @PasswordHash  NVARCHAR(255) = NULL,
    @Cargo         NVARCHAR(100) = NULL,
    @CI            INT           = NULL,
    @Nombres       VARCHAR(50)   = NULL,
    @Apellidos     VARCHAR(50)   = NULL,
    @Direccion     VARCHAR(50)   = 'Sucre, Bolivia',
    @Cel           INT           = 0,
    @Email         VARCHAR(50)   = NULL,
    @CodU          SMALLINT      = NULL,
    @CodCargo      SMALLINT      = NULL,
    @NuevoId       INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Validar unicidad de CI
        IF @CI IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE CI = @CI)
        BEGIN
            THROW 50003, 'Ya existe un funcionario registrado con ese número de CI.', 1;
        END

        -- Validar unicidad de Login si se provee
        IF @Login IS NOT NULL AND LTRIM(RTRIM(@Login)) <> '' AND EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE login = @Login)
        BEGIN
            THROW 50001, 'El nombre de usuario (login) ya se encuentra registrado.', 1;
        END

        -- Generar CI temporal si viniera nulo
        IF @CI IS NULL
            SELECT @CI = ISNULL(MAX(CI), 1000000) + 1 FROM dbo.TEmpleados;

        INSERT INTO dbo.TEmpleados (
            CI, Apellidos, Nombres, Direccion, Cel, Email, Activo,
            login, password_hash, cargo_nombre, cod_u, cod_cargo,
            created_at, updated_at
        )
        VALUES (
            @CI,
            ISNULL(@Apellidos, 'SIN APELLIDO'),
            ISNULL(@Nombres, 'SIN NOMBRE'),
            ISNULL(@Direccion, 'Sucre, Bolivia'),
            ISNULL(@Cel, 0),
            @Email,
            1,
            NULLIF(LTRIM(RTRIM(@Login)), ''),
            @PasswordHash,
            @Cargo,
            @CodU,
            @CodCargo,
            GETDATE(),
            GETDATE()
        );

        SET @NuevoId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- usp_Usuarios_Actualizar: Modifica datos personales y credenciales de acceso
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Actualizar
    @Id        INT,
    @PersonaId INT           = NULL,
    @Login     NVARCHAR(50)  = NULL,
    @Cargo     NVARCHAR(100) = NULL,
    @Activo    BIT           = 1,
    @Nombres   VARCHAR(50)   = NULL,
    @Apellidos VARCHAR(50)   = NULL,
    @Direccion VARCHAR(50)   = NULL,
    @Cel       INT           = NULL,
    @Email     VARCHAR(50)   = NULL,
    @CodU      SMALLINT      = NULL,
    @CodCargo  SMALLINT      = NULL
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF @Login IS NOT NULL AND LTRIM(RTRIM(@Login)) <> '' 
           AND EXISTS (SELECT 1 FROM dbo.TEmpleados WHERE login = @Login AND id <> @Id)
        BEGIN
            THROW 50002, 'El login especificado ya pertenece a otro usuario.', 1;
        END

        UPDATE dbo.TEmpleados
        SET login        = NULLIF(LTRIM(RTRIM(@Login)), ''),
            cargo_nombre = ISNULL(@Cargo, cargo_nombre),
            Activo       = @Activo,
            Nombres      = ISNULL(@Nombres, Nombres),
            Apellidos    = ISNULL(@Apellidos, Apellidos),
            Direccion    = ISNULL(@Direccion, Direccion),
            Cel          = ISNULL(@Cel, Cel),
            Email        = ISNULL(@Email, Email),
            cod_u        = ISNULL(@CodU, cod_u),
            cod_cargo    = ISNULL(@CodCargo, cod_cargo),
            updated_at   = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- usp_Usuarios_CambiarPassword: Modifica la contraseña cifrada
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_CambiarPassword
    @Id           INT,
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.TEmpleados
        SET password_hash = @PasswordHash,
            updated_at    = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- usp_Usuarios_EliminarLogico: Baja lógica de funcionario
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.TEmpleados
        SET Activo     = 0,
            updated_at = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- usp_TEmpleados_Listar: Listado oficial para selectores y combos
CREATE OR ALTER PROCEDURE dbo.usp_TEmpleados_Listar
    @Search VARCHAR(100) = NULL,
    @Activo BIT          = NULL,
    @Limit  INT          = 50,
    @Offset INT          = 0
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
      AND (@Search IS NULL OR @Search = ''
           OR e.Nombres LIKE '%' + @Search + '%'
           OR e.Apellidos LIKE '%' + @Search + '%'
           OR CAST(e.CI AS VARCHAR(20)) LIKE '%' + @Search + '%')
    ORDER BY e.Apellidos, e.Nombres
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- usp_TEmpleados_ObtenerPorCI: Consulta funcionario exacto por CI
CREATE OR ALTER PROCEDURE dbo.usp_TEmpleados_ObtenerPorCI
    @CI INT
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
    WHERE e.CI = @CI;
END;
GO

-- usp_Personas_EliminarLogico: Baja lógica de persona (ciudadano/solicitante externo)
CREATE OR ALTER PROCEDURE dbo.usp_Personas_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (SELECT 1 FROM dbo.personas WHERE id = @Id)
        BEGIN
            THROW 50004, 'La persona solicitante no existe en el sistema.', 1;
        END

        UPDATE dbo.personas
        SET activo     = 0,
            updated_at = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

-- usp_Usuarios_ActualizarUltimoAcceso: Registra la fecha de acceso del funcionario
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_ActualizarUltimoAcceso
    @UsuarioId INT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE dbo.TEmpleados
    SET updated_at = GETDATE()
    WHERE id = @UsuarioId;
END;
GO

-- usp_Tramites_Listar: Listado paginado de trámites con TEmpleados
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Listar
    @Estado VARCHAR(30) = NULL,
    @Gestion INT = NULL,
    @Search NVARCHAR(100) = NULL,
    @Limit INT = 20,
    @Offset INT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        tp.nombre AS tipo_proceso_nombre,
        tp.tipo_categoria,
        t.remitente,
        t.referencia,
        t.prioridad,
        t.nro_hojas,
        t.estado,
        uo.nombre AS ubicacion_actual_nombre,
        u.login   AS usuario_actual_login,
        t.fecha_creacion,
        (SELECT COUNT(1) FROM dbo.adjuntos a WHERE a.tramite_id = t.id AND a.activo = 1) AS nro_adjuntos
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_actual_id
    LEFT JOIN dbo.TEmpleados u        ON u.id  = t.usuario_actual_id
    WHERE t.activo = 1
      AND (@Estado IS NULL OR @Estado = 'TODOS' OR t.estado = @Estado)
      AND (@Gestion IS NULL OR t.gestion = @Gestion)
      AND (@Search IS NULL OR (
          t.numero_correlativo LIKE '%' + @Search + '%' OR
          t.remitente          LIKE '%' + @Search + '%' OR
          t.referencia         LIKE '%' + @Search + '%' OR
          tp.nombre            LIKE '%' + @Search + '%'
      ))
    ORDER BY t.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END;
GO

-- usp_Tramites_ObtenerPorId: Detalle completo de Hoja de Ruta con TEmpleados
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    -- Resultset 1: Datos principales del trámite
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.codigo AS tipo_proceso_codigo,
        tp.nombre AS tipo_proceso_nombre,
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
        ISNULL(u.Nombres + ' ' + u.Apellidos, u.login) AS creado_por_usuario,
        uo.nombre AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    INNER JOIN dbo.TEmpleados u       ON u.id  = t.creado_por
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_org_id
    WHERE t.id = @Id AND t.activo = 1;

    -- Resultset 2: Historial de movimientos
    SELECT
        m.orden,
        m.actividad_nombre AS actividad,
        m.tipo_movimiento,
        ISNULL(uo.nombre, 'Ventanilla Central') AS unidad_origen,
        ud.nombre AS unidad_destino,
        m.estado_movimiento AS estado,
        m.proveido,
        ISNULL(m.fecha_recepcion, ISNULL(m.fecha_envio, m.created_at)) AS fecha
    FROM dbo.movimientos m
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = m.ubicacion_origen_id
    LEFT JOIN dbo.ubicaciones_org ud ON ud.id = m.ubicacion_destino_id
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
        ISNULL(u.Nombres + ' ' + u.Apellidos, u.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    INNER JOIN dbo.TEmpleados u ON u.id = a.subido_por
    WHERE a.tramite_id = @Id AND a.activo = 1
    ORDER BY a.id DESC;
END;
GO

-- usp_Adjuntos_ListarPorTramite: Documentos adjuntos de un trámite con TEmpleados
CREATE OR ALTER PROCEDURE dbo.usp_Adjuntos_ListarPorTramite
    @TramiteId INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        a.id,
        a.tramite_id,
        a.movimiento_id,
        a.nombre_original,
        a.tamano_bytes,
        a.tipo_mime,
        ISNULL(u.Nombres + ' ' + ISNULL(u.Apellidos, ''), u.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    INNER JOIN dbo.TEmpleados u ON u.id = a.subido_por
    WHERE a.tramite_id = @TramiteId AND a.activo = 1
    ORDER BY a.id DESC;
END;
GO

