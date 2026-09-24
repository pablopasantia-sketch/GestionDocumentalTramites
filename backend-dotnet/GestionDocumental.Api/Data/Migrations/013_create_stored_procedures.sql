-- =============================================================================
-- MIGRACIÓN 013: STORED PROCEDURES - SISTEMA WAYKA MVP
-- Base de datos: DB_TRAMITES_EXTERNOS
-- Arquitectura Corporativa: Stored Procedures con manejo de errores y transacciones
-- =============================================================================

-- =============================================================================
-- SECCIÓN 1: MÓDULO AUTENTICACIÓN Y SEGURIDAD (Personas, Usuarios, Roles, UsuarioRol)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_Autenticar: Valida login de usuario activo y retorna datos con persona
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Autenticar
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
-- usp_Usuarios_ObtenerRoles: Retorna roles activos y vigentes de un usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
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
    INNER JOIN dbo.roles r            ON r.id  = ur.rol_id
    INNER JOIN dbo.ubicaciones_org uo ON uo.id = ur.ubicacion_org_id
    WHERE ur.usuario_id = @UsuarioId
      AND ur.activo = 1
      AND (ur.fecha_expiracion IS NULL OR ur.fecha_expiracion >= CAST(GETDATE() AS DATE))
    ORDER BY ur.es_principal DESC, r.nombre;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_ActualizarUltimoAcceso: Registra la fecha/hora de último acceso
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_ActualizarUltimoAcceso
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
-- usp_Usuarios_Listar: Listado paginado de usuarios con persona
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Listar
    @Search  NVARCHAR(100) = NULL,
    @Activo  VARCHAR(20)   = 'activos',
    @Limit   INT           = 50,
    @Offset  INT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.persona_id,
        u.login,
        u.cargo,
        u.activo,
        u.ultimo_acceso,
        u.created_at,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.email,
        p.telefono
    FROM dbo.usuarios u
    INNER JOIN dbo.personas p ON p.id = u.persona_id
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND u.activo = 1) OR (@Activo = 'inactivos' AND u.activo = 0))
      AND (@Search IS NULL OR (
          u.login LIKE '%' + @Search + '%' OR
          u.cargo LIKE '%' + @Search + '%' OR
          p.nombres LIKE '%' + @Search + '%' OR
          p.apellido_paterno LIKE '%' + @Search + '%' OR
          p.ci LIKE '%' + @Search + '%'
      ))
    ORDER BY u.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_ObtenerPorId: Detalle de usuario por Id
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.persona_id,
        u.login,
        u.cargo,
        u.activo,
        u.ultimo_acceso,
        u.created_at,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.email,
        p.telefono
    FROM dbo.usuarios u
    INNER JOIN dbo.personas p ON p.id = u.persona_id
    WHERE u.id = @Id;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_Insertar: Registra un nuevo usuario en el sistema
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Insertar
    @PersonaId     INT,
    @Login         NVARCHAR(50),
    @PasswordHash  NVARCHAR(255),
    @Cargo         NVARCHAR(100),
    @NuevoId       INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.usuarios WHERE login = @Login)
        BEGIN
            THROW 50001, 'El nombre de usuario (login) ya se encuentra registrado.', 1;
        END

        INSERT INTO dbo.usuarios (persona_id, login, password_hash, cargo, activo, created_at, updated_at)
        VALUES (@PersonaId, @Login, @PasswordHash, @Cargo, 1, GETDATE(), GETDATE());

        SET @NuevoId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_Actualizar: Modifica datos de un usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_Actualizar
    @Id        INT,
    @PersonaId INT,
    @Login     NVARCHAR(50),
    @Cargo     NVARCHAR(100),
    @Activo    BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.usuarios WHERE login = @Login AND id <> @Id)
        BEGIN
            THROW 50002, 'El login especificado ya pertenece a otro usuario.', 1;
        END

        UPDATE dbo.usuarios
        SET persona_id = @PersonaId,
            login      = @Login,
            cargo      = @Cargo,
            activo     = @Activo,
            updated_at = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_CambiarPassword: Modifica la contraseña cifrada
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_CambiarPassword
    @Id           INT,
    @PasswordHash NVARCHAR(255)
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.usuarios
        SET password_hash = @PasswordHash,
            updated_at    = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Usuarios_EliminarLogico: Da de baja lógica a un usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Usuarios_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.usuarios
        SET activo = 0,
            updated_at = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Personas_Listar: Listado paginado de personas con búsqueda
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Personas_Listar
    @Search  NVARCHAR(100) = NULL,
    @Activo  VARCHAR(20)   = 'activos',
    @Limit   INT           = 50,
    @Offset  INT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.sexo,
        p.estado_civil,
        p.telefono,
        p.email,
        p.empresa_telefonica,
        p.direccion,
        p.activo,
        p.created_at,
        p.updated_at
    FROM dbo.personas p
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND p.activo = 1) OR (@Activo = 'inactivos' AND p.activo = 0))
      AND (@Search IS NULL OR (
          p.ci LIKE '%' + @Search + '%' OR
          p.nombres LIKE '%' + @Search + '%' OR
          p.apellido_paterno LIKE '%' + @Search + '%' OR
          p.apellido_materno LIKE '%' + @Search + '%' OR
          p.email LIKE '%' + @Search + '%'
      ))
    ORDER BY p.id DESC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Personas_ObtenerPorId: Detalle de persona por Id
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Personas_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.sexo,
        p.estado_civil,
        p.telefono,
        p.email,
        p.empresa_telefonica,
        p.direccion,
        p.activo,
        p.created_at,
        p.updated_at
    FROM dbo.personas p
    WHERE p.id = @Id;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Personas_ObtenerPorCI: Consulta de persona por CI único
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Personas_ObtenerPorCI
    @Ci VARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        p.id,
        p.nombres,
        p.apellido_paterno,
        p.apellido_materno,
        p.ci,
        p.ci_expedido,
        p.sexo,
        p.estado_civil,
        p.telefono,
        p.email,
        p.empresa_telefonica,
        p.direccion,
        p.activo,
        p.created_at,
        p.updated_at
    FROM dbo.personas p
    WHERE p.ci = @Ci;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Personas_Insertar: Registro de nueva persona
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Personas_Insertar
    @Nombres           VARCHAR(100),
    @ApellidoPaterno   VARCHAR(100),
    @ApellidoMaterno   VARCHAR(100) = NULL,
    @Ci                VARCHAR(20),
    @CiExpedido        VARCHAR(5)   = 'CH',
    @Sexo              VARCHAR(10)  = 'M',
    @EstadoCivil       VARCHAR(20)  = NULL,
    @Telefono          VARCHAR(20)  = NULL,
    @Email             VARCHAR(150) = NULL,
    @EmpresaTelefonica VARCHAR(20)  = NULL,
    @Direccion         VARCHAR(255) = NULL,
    @NuevoId           INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.personas WHERE ci = @Ci)
        BEGIN
            THROW 50003, 'El número de Cédula de Identidad (CI) ya se encuentra registrado.', 1;
        END

        INSERT INTO dbo.personas (
            nombres, apellido_paterno, apellido_materno, ci, ci_expedido,
            sexo, estado_civil, telefono, email, empresa_telefonica, direccion,
            activo, created_at, updated_at
        ) VALUES (
            @Nombres, @ApellidoPaterno, @ApellidoMaterno, @Ci, @CiExpedido,
            @Sexo, @EstadoCivil, @Telefono, @Email, @EmpresaTelefonica, @Direccion,
            1, GETDATE(), GETDATE()
        );

        SET @NuevoId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Personas_Actualizar: Modificación de datos personales
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Personas_Actualizar
    @Id                INT,
    @Nombres           VARCHAR(100),
    @ApellidoPaterno   VARCHAR(100),
    @ApellidoMaterno   VARCHAR(100) = NULL,
    @Ci                VARCHAR(20),
    @CiExpedido        VARCHAR(5)   = 'CH',
    @Sexo              VARCHAR(10)  = 'M',
    @EstadoCivil       VARCHAR(20)  = NULL,
    @Telefono          VARCHAR(20)  = NULL,
    @Email             VARCHAR(150) = NULL,
    @EmpresaTelefonica VARCHAR(20)  = NULL,
    @Direccion         VARCHAR(255) = NULL,
    @Activo            BIT          = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.personas WHERE ci = @Ci AND id <> @Id)
        BEGIN
            THROW 50004, 'El CI especificado ya pertenece a otra persona.', 1;
        END

        UPDATE dbo.personas
        SET nombres           = @Nombres,
            apellido_paterno  = @ApellidoPaterno,
            apellido_materno  = @ApellidoMaterno,
            ci                = @Ci,
            ci_expedido       = @CiExpedido,
            sexo              = @Sexo,
            estado_civil      = @EstadoCivil,
            telefono          = @Telefono,
            email             = @Email,
            empresa_telefonica = @EmpresaTelefonica,
            direccion         = @Direccion,
            activo            = @Activo,
            updated_at        = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Personas_EliminarLogico: Baja lógica de persona
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Personas_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        -- Validar dependencia con usuarios activos
        IF EXISTS (SELECT 1 FROM dbo.usuarios WHERE persona_id = @Id AND activo = 1)
        BEGIN
            THROW 50005, 'No se puede eliminar la persona porque tiene una cuenta de usuario activa asociada.', 1;
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
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Roles_Listar: Listado de roles del sistema
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Roles_Listar
    @Activo VARCHAR(20) = 'activos'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, codigo, nombre, descripcion, activo, created_at, updated_at
    FROM dbo.roles
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND activo = 1) OR (@Activo = 'inactivos' AND activo = 0))
    ORDER BY id ASC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Roles_ObtenerPorId: Detalle de rol por Id
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Roles_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT id, codigo, nombre, descripcion, activo, created_at, updated_at
    FROM dbo.roles
    WHERE id = @Id;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Roles_Insertar: Crea nuevo rol institucional
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Roles_Insertar
    @Codigo      NVARCHAR(50),
    @Nombre      NVARCHAR(100),
    @Descripcion NVARCHAR(255) = NULL,
    @NuevoId     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.roles WHERE codigo = @Codigo)
        BEGIN
            THROW 50006, 'El código de rol ya existe.', 1;
        END

        INSERT INTO dbo.roles (codigo, nombre, descripcion, activo, created_at, updated_at)
        VALUES (@Codigo, @Nombre, @Descripcion, 1, GETDATE(), GETDATE());

        SET @NuevoId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Roles_Actualizar: Modifica rol existente
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Roles_Actualizar
    @Id          INT,
    @Codigo      NVARCHAR(50),
    @Nombre      NVARCHAR(100),
    @Descripcion NVARCHAR(255) = NULL,
    @Activo      BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.roles WHERE codigo = @Codigo AND id <> @Id)
        BEGIN
            THROW 50007, 'El código de rol ya pertenece a otro registro.', 1;
        END

        UPDATE dbo.roles
        SET codigo      = @Codigo,
            nombre      = @Nombre,
            descripcion = @Descripcion,
            activo      = @Activo,
            updated_at  = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Roles_EliminarLogico: Baja lógica de rol
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Roles_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.roles
        SET activo     = 0,
            updated_at = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UsuarioRoles_Listar: Lista todas las asignaciones o por usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UsuarioRoles_Listar
    @UsuarioId INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        ur.id,
        ur.usuario_id,
        ur.rol_id,
        r.codigo AS rol_codigo,
        r.nombre AS rol_nombre,
        ur.ubicacion_org_id,
        u.codigo AS ubicacion_codigo,
        u.nombre AS ubicacion_nombre,
        u.sigla  AS ubicacion_sigla,
        ur.nivel_acceso,
        ur.fecha_expiracion,
        ur.es_principal,
        ur.activo
    FROM dbo.usuario_roles ur
    INNER JOIN dbo.roles r ON r.id = ur.rol_id
    INNER JOIN dbo.ubicaciones_org u ON u.id = ur.ubicacion_org_id
    WHERE ur.activo = 1
      AND (@UsuarioId IS NULL OR ur.usuario_id = @UsuarioId)
    ORDER BY ur.usuario_id ASC, ur.es_principal DESC, r.nombre ASC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UsuarioRoles_Asignar: Asigna o reactiva un rol para un usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UsuarioRoles_Asignar
    @UsuarioId       INT,
    @RolId           INT,
    @UbicacionOrgId  INT,
    @NivelAcceso     VARCHAR(20) = 'REGULAR',
    @FechaExpiracion DATE        = NULL,
    @EsPrincipal     BIT         = 0,
    @NuevoId         INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- Si se asigna como principal, remover principal a los otros roles del usuario
        IF @EsPrincipal = 1
        BEGIN
            UPDATE dbo.usuario_roles
            SET es_principal = 0, updated_at = GETDATE()
            WHERE usuario_id = @UsuarioId;
        END

        -- Verificar si ya existe la terna
        DECLARE @ExistId INT = NULL;
        SELECT @ExistId = id FROM dbo.usuario_roles
        WHERE usuario_id = @UsuarioId AND rol_id = @RolId AND ubicacion_org_id = @UbicacionOrgId;

        IF @ExistId IS NOT NULL
        BEGIN
            UPDATE dbo.usuario_roles
            SET nivel_acceso     = @NivelAcceso,
                fecha_expiracion = @FechaExpiracion,
                es_principal     = @EsPrincipal,
                activo           = 1,
                updated_at       = GETDATE()
            WHERE id = @ExistId;
            SET @NuevoId = @ExistId;
        END
        ELSE
        BEGIN
            INSERT INTO dbo.usuario_roles (
                usuario_id, rol_id, ubicacion_org_id, nivel_acceso,
                fecha_expiracion, es_principal, activo, created_at, updated_at
            ) VALUES (
                @UsuarioId, @RolId, @UbicacionOrgId, @NivelAcceso,
                @FechaExpiracion, @EsPrincipal, 1, GETDATE(), GETDATE()
            );
            SET @NuevoId = SCOPE_IDENTITY();
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UsuarioRoles_SetPrincipal: Establece el rol principal de un usuario
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UsuarioRoles_SetPrincipal
    @UsuarioId    INT,
    @UsuarioRolId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.usuario_roles
        SET es_principal = 0, updated_at = GETDATE()
        WHERE usuario_id = @UsuarioId;

        UPDATE dbo.usuario_roles
        SET es_principal = 1, updated_at = GETDATE()
        WHERE id = @UsuarioRolId AND usuario_id = @UsuarioId;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UsuarioRoles_Eliminar: Baja lógica de asignación usuario-rol
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UsuarioRoles_Eliminar
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.usuario_roles
        SET activo = 0, updated_at = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


-- =============================================================================
-- SECCIÓN 2: MÓDULO ESTRUCTURA E INSTITUCIÓN (UbicacionesOrg, TUnidad, TCargo, TEmpleados)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UbicacionesOrg_Listar: Listado completo de ubicaciones orgánicas
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_Listar
    @Activo VARCHAR(20) = 'activos'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.codigo,
        u.nombre,
        u.sigla,
        u.nivel,
        u.padre_id,
        p.nombre AS padre_nombre,
        u.descripcion,
        u.activo,
        u.created_at,
        u.updated_at
    FROM dbo.ubicaciones_org u
    LEFT JOIN dbo.ubicaciones_org p ON p.id = u.padre_id
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND u.activo = 1) OR (@Activo = 'inactivos' AND u.activo = 0))
    ORDER BY u.nivel ASC, u.nombre ASC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UbicacionesOrg_ObtenerPorId: Detalle de ubicación por Id
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        u.id,
        u.codigo,
        u.nombre,
        u.sigla,
        u.nivel,
        u.padre_id,
        p.nombre AS padre_nombre,
        u.descripcion,
        u.activo,
        u.created_at,
        u.updated_at
    FROM dbo.ubicaciones_org u
    LEFT JOIN dbo.ubicaciones_org p ON p.id = u.padre_id
    WHERE u.id = @Id;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UbicacionesOrg_Insertar: Registro de nueva ubicación orgánica
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_Insertar
    @Codigo      VARCHAR(50),
    @Nombre      VARCHAR(150),
    @Sigla       VARCHAR(30)   = NULL,
    @Nivel       INT           = 1,
    @PadreId     INT           = NULL,
    @Descripcion NVARCHAR(MAX) = NULL,
    @NuevoId     INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codigo = @Codigo)
        BEGIN
            THROW 50008, 'El código de ubicación orgánica ya existe.', 1;
        END

        INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, created_at, updated_at)
        VALUES (@Codigo, @Nombre, @Sigla, @Nivel, @PadreId, @Descripcion, 1, GETDATE(), GETDATE());

        SET @NuevoId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UbicacionesOrg_Actualizar: Modificación de ubicación orgánica
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_Actualizar
    @Id          INT,
    @Codigo      VARCHAR(50),
    @Nombre      VARCHAR(150),
    @Sigla       VARCHAR(30)   = NULL,
    @Nivel       INT           = 1,
    @PadreId     INT           = NULL,
    @Descripcion NVARCHAR(MAX) = NULL,
    @Activo      BIT           = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codigo = @Codigo AND id <> @Id)
        BEGIN
            THROW 50009, 'El código especificado ya pertenece a otra ubicación.', 1;
        END

        UPDATE dbo.ubicaciones_org
        SET codigo      = @Codigo,
            nombre      = @Nombre,
            sigla       = @Sigla,
            nivel       = @Nivel,
            padre_id    = @PadreId,
            descripcion = @Descripcion,
            activo      = @Activo,
            updated_at  = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_UbicacionesOrg_EliminarLogico: Baja lógica de ubicación
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE padre_id = @Id AND activo = 1)
        BEGIN
            THROW 50010, 'No se puede eliminar la ubicación porque contiene unidades subordinadas activas.', 1;
        END

        UPDATE dbo.ubicaciones_org
        SET activo = 0, updated_at = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TUnidad_Listar: Listado oficial de unidades municipales (TUnidad)
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TUnidad_Listar
    @Activo BIT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT CodU, NombU, Activo
    FROM dbo.TUnidad
    WHERE (@Activo IS NULL OR Activo = @Activo)
    ORDER BY CodU ASC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TUnidad_Insertar: Crea una nueva unidad oficial
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TUnidad_Insertar
    @NombU      VARCHAR(50),
    @NuevoCodU  SMALLINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @MaxCod SMALLINT;
        SELECT @MaxCod = ISNULL(MAX(CodU), 0) + 1 FROM dbo.TUnidad;

        INSERT INTO dbo.TUnidad (CodU, NombU, Activo)
        VALUES (@MaxCod, @NombU, 1);

        SET @NuevoCodU = @MaxCod;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TUnidad_Actualizar: Modifica denominación o estado de unidad
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TUnidad_Actualizar
    @CodU   SMALLINT,
    @NombU  VARCHAR(50),
    @Activo BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.TUnidad
        SET NombU = @NombU,
            Activo = @Activo
        WHERE CodU = @CodU;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TUnidad_EliminarLogico: Baja lógica de unidad
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TUnidad_EliminarLogico
    @CodU SMALLINT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.TUnidad
        SET Activo = 0
        WHERE CodU = @CodU;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TCargo_Listar: Listado oficial de cargos dependientes (TCargo)
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TCargo_Listar
    @CodU   SMALLINT = NULL,
    @Activo BIT      = NULL
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        c.CodCargo,
        c.NombreC,
        c.CodU,
        u.NombU AS NombreUnidad,
        ISNULL(u.Activo, 1) AS Activo
    FROM dbo.TCargo c
    LEFT JOIN dbo.TUnidad u ON u.CodU = c.CodU
    WHERE (@CodU IS NULL OR c.CodU = @CodU)
      AND (@Activo IS NULL OR u.Activo = @Activo)
    ORDER BY c.CodU ASC, c.NombreC ASC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TCargo_Insertar: Crea nuevo cargo dependiente
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TCargo_Insertar
    @NombreC       VARCHAR(50),
    @CodU          SMALLINT,
    @NuevoCodCargo SMALLINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DECLARE @MaxCargo SMALLINT;
        SELECT @MaxCargo = ISNULL(MAX(CodCargo), 0) + 1 FROM dbo.TCargo;

        INSERT INTO dbo.TCargo (CodCargo, NombreC, CodU)
        VALUES (@MaxCargo, @NombreC, @CodU);

        SET @NuevoCodCargo = @MaxCargo;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TCargo_Actualizar: Modifica nombre o unidad de cargo
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TCargo_Actualizar
    @CodCargo SMALLINT,
    @NombreC  VARCHAR(50),
    @CodU     SMALLINT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.TCargo
        SET NombreC = @NombreC,
            CodU    = @CodU
        WHERE CodCargo = @CodCargo;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TCargo_Eliminar: Elimina cargo institucional
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TCargo_Eliminar
    @CodCargo SMALLINT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        DELETE FROM dbo.TCargo WHERE CodCargo = @CodCargo;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TEmpleados_Listar: Consulta de padrón de funcionarios institucionales
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TEmpleados_Listar
    @Search VARCHAR(100) = NULL,
    @Activo BIT          = NULL,
    @Limit  INT          = 50,
    @Offset INT          = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        CI,
        Apellidos,
        Nombres,
        Direccion,
        Cel,
        Email,
        Activo
    FROM dbo.TEmpleados
    WHERE (@Activo IS NULL OR Activo = @Activo)
      AND (@Search IS NULL OR (
          CAST(CI AS VARCHAR) LIKE '%' + @Search + '%' OR
          Apellidos LIKE '%' + @Search + '%' OR
          Nombres   LIKE '%' + @Search + '%' OR
          Email     LIKE '%' + @Search + '%'
      ))
    ORDER BY Apellidos ASC, Nombres ASC
    OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TEmpleados_ObtenerPorCI: Consulta funcionario exacto por CI
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TEmpleados_ObtenerPorCI
    @CI INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        CI,
        Apellidos,
        Nombres,
        Direccion,
        Cel,
        Email,
        Activo
    FROM dbo.TEmpleados
    WHERE CI = @CI;
END
GO


-- =============================================================================
-- SECCIÓN 3: MÓDULO TRÁMITES EXTERNOS Y WORKFLOW (TiposProceso, Tramites, Movimientos)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TiposProceso_Listar: Listado de tipos de trámite/correspondencia
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TiposProceso_Listar
    @TipoCategoria VARCHAR(30) = NULL,
    @Activo        VARCHAR(20) = 'activos'
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tp.id,
        tp.codigo,
        tp.nombre,
        tp.descripcion,
        tp.tipo_categoria,
        tp.ubicacion_org_id,
        uo.codigo AS ubicacion_codigo,
        uo.nombre AS ubicacion_nombre,
        uo.sigla  AS ubicacion_sigla,
        tp.correlativo_seq,
        tp.tiempo_estimado_horas,
        tp.activo
    FROM dbo.tipos_proceso tp
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = tp.ubicacion_org_id
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND tp.activo = 1) OR (@Activo = 'inactivos' AND tp.activo = 0))
      AND (@TipoCategoria IS NULL OR tp.tipo_categoria = @TipoCategoria)
    ORDER BY tp.codigo ASC, tp.nombre ASC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TiposProceso_ObtenerPorId: Detalle de tipo de trámite por Id
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TiposProceso_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        tp.id,
        tp.codigo,
        tp.nombre,
        tp.descripcion,
        tp.tipo_categoria,
        tp.ubicacion_org_id,
        uo.codigo AS ubicacion_codigo,
        uo.nombre AS ubicacion_nombre,
        uo.sigla  AS ubicacion_sigla,
        tp.correlativo_seq,
        tp.tiempo_estimado_horas,
        tp.activo
    FROM dbo.tipos_proceso tp
    LEFT JOIN dbo.ubicaciones_org uo ON uo.id = tp.ubicacion_org_id
    WHERE tp.id = @Id;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TiposProceso_Insertar: Registra nuevo tipo de trámite externo
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TiposProceso_Insertar
    @Codigo              VARCHAR(20),
    @Nombre              VARCHAR(150),
    @Descripcion         VARCHAR(500) = NULL,
    @TipoCategoria       VARCHAR(30)  = 'CORRESPONDENCIA',
    @UbicacionOrgId      INT          = NULL,
    @TiempoEstimadoHoras INT          = 24,
    @NuevoId             INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE codigo = @Codigo)
        BEGIN
            THROW 50011, 'El código de tipo de trámite ya existe.', 1;
        END

        INSERT INTO dbo.tipos_proceso (
            codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id,
            correlativo_seq, tiempo_estimado_horas, activo, created_at, updated_at
        ) VALUES (
            @Codigo, @Nombre, @Descripcion, @TipoCategoria, @UbicacionOrgId,
            0, @TiempoEstimadoHoras, 1, GETDATE(), GETDATE()
        );

        SET @NuevoId = SCOPE_IDENTITY();
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TiposProceso_Actualizar: Modifica tipo de trámite externo
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TiposProceso_Actualizar
    @Id                  INT,
    @Codigo              VARCHAR(20),
    @Nombre              VARCHAR(150),
    @Descripcion         VARCHAR(500) = NULL,
    @TipoCategoria       VARCHAR(30)  = 'CORRESPONDENCIA',
    @UbicacionOrgId      INT          = NULL,
    @TiempoEstimadoHoras INT          = 24,
    @Activo              BIT          = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.tipos_proceso WHERE codigo = @Codigo AND id <> @Id)
        BEGIN
            THROW 50012, 'El código especificado pertenece a otro tipo de trámite.', 1;
        END

        UPDATE dbo.tipos_proceso
        SET codigo                = @Codigo,
            nombre                = @Nombre,
            descripcion           = @Descripcion,
            tipo_categoria        = @TipoCategoria,
            ubicacion_org_id      = @UbicacionOrgId,
            tiempo_estimado_horas = @TiempoEstimadoHoras,
            activo                = @Activo,
            updated_at            = GETDATE()
        WHERE id = @Id;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_TiposProceso_ToggleActivo: Alterna estado activo/inactivo
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_TiposProceso_ToggleActivo
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.tipos_proceso
        SET activo = CASE WHEN activo = 1 THEN 0 ELSE 1 END,
            updated_at = GETDATE()
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_PreviewCorrelativo: Previsualiza el siguiente correlativo anual
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_PreviewCorrelativo
    @TipoProcesoId INT,
    @Gestion       INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year INT = ISNULL(@Gestion, YEAR(GETDATE()));

    SELECT
        tp.codigo AS codigo_tipo,
        tp.nombre AS nombre_tipo,
        tp.tiempo_estimado_horas,
        @Year     AS gestion,
        tp.codigo + '-' + CAST(ISNULL(c.ultimo_numero, 0) + 1 AS VARCHAR) + '/' + CAST(@Year AS VARCHAR) AS numero_correlativo
    FROM dbo.tipos_proceso tp
    LEFT JOIN dbo.correlativos c ON c.tipo_proceso_id = tp.id AND c.gestion = @Year
    WHERE tp.id = @TipoProcesoId AND tp.activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_Crear: Emite nueva Hoja de Ruta externa con asignación institucional
-- ─────────────────────────────────────────────────────────────────────────────
GO
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

        -- 4. Insertar Trámite
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
            'CORRESPONDENCIA', @NroHojas, @NroAnexos, @Instruccion, @Prioridad,
            @CodUDestino, @CodCargoDestino, @CiEmpleadoDestino,
            @DestinatarioNombre, @DestinatarioCargo, @DestinatarioUnidad,
            @PrimerDestinatarioId, @Ahora, @FechaLimite,
            @UserId, @UbicacionId, @UserId, @UbicacionId,
            1, @Ahora, @Ahora
        );

        SET @NuevoTramiteId = SCOPE_IDENTITY();

        -- 5. Insertar Movimiento Inicial (Orden 1)
        DECLARE @Prov VARCHAR(MAX) = ISNULL(@ProveidoInicial, 'Recepción y apertura de Hoja de Ruta externa ' + @NumeroCorrelativo);
        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id, estado_movimiento,
            proveido, instruccion, tiempo_estimado_minutos,
            fecha_envio, fecha_recepcion, created_at
        ) VALUES (
            @NuevoTramiteId, 1, 'INICIO', 'Recepción en Ventanilla Única',
            @UserId, @UbicacionId, 'CREADO',
            @Prov, @Instruccion, @HorasSLA * 60,
            @Ahora, @Ahora, @Ahora
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
-- usp_Tramites_Listar: Listado de trámites con conteo de adjuntos
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Listar
    @Estado  NVARCHAR(30)  = NULL,
    @Gestion INT           = NULL,
    @Search  NVARCHAR(200) = NULL,
    @Limit   INT           = 50,
    @Offset  INT           = 0
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        t.tipo_proceso_id,
        tp.nombre AS tipo_proceso_nombre,
        t.tipo_corres,
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
    LEFT JOIN dbo.usuarios u          ON u.id  = t.usuario_actual_id
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
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_ObtenerPorId: Detalle completo de Hoja de Ruta
-- ─────────────────────────────────────────────────────────────────────────────
GO
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
        ISNULL(p.nombres + ' ' + p.apellido_paterno, u.login) AS creado_por_usuario,
        uo.nombre AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    INNER JOIN dbo.usuarios u         ON u.id  = t.creado_por
    LEFT JOIN dbo.personas p          ON p.id  = u.persona_id
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
        ISNULL(p.nombres + ' ' + p.apellido_paterno, u.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    INNER JOIN dbo.usuarios u ON u.id = a.subido_por
    LEFT JOIN dbo.personas p  ON p.id = u.persona_id
    WHERE a.tramite_id = @Id AND a.activo = 1
    ORDER BY a.id DESC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_ConsultaPublica: Consulta ciudadana de Hoja de Ruta
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ConsultaPublica
    @Correlativo NVARCHAR(50),
    @Gestion     INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year INT = ISNULL(@Gestion, YEAR(GETDATE()));

    SELECT
        t.id,
        t.numero_correlativo,
        t.gestion,
        tp.nombre AS tipo_proceso,
        tp.tipo_categoria,
        t.referencia,
        t.remitente,
        t.estado,
        t.prioridad,
        t.nro_hojas,
        t.fecha_creacion,
        t.fecha_conclusion,
        ISNULL(ua.nombre, 'Despacho Central') AS ubicacion_actual,
        ISNULL(uo.nombre, 'Ventanilla Única') AS unidad_origen
    FROM dbo.tramites t
    INNER JOIN dbo.tipos_proceso tp   ON tp.id = t.tipo_proceso_id
    LEFT JOIN dbo.ubicaciones_org uo  ON uo.id = t.ubicacion_org_id
    LEFT JOIN dbo.ubicaciones_org ua  ON ua.id = t.ubicacion_actual_id
    WHERE t.numero_correlativo = @Correlativo
      AND t.gestion = @Year
      AND t.activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_ObtenerEstadisticas: Métricas de gestión
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_ObtenerEstadisticas
    @Gestion INT = NULL
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @Year INT = ISNULL(@Gestion, YEAR(GETDATE()));

    SELECT
        @Year AS gestion,
        COUNT(1) AS total,
        SUM(CASE WHEN estado = 'CREADO' THEN 1 ELSE 0 END) AS creados,
        SUM(CASE WHEN estado = 'EN_ATENCION' THEN 1 ELSE 0 END) AS en_atencion,
        SUM(CASE WHEN estado IN ('EN_TRANSITO', 'POR_RECIBIR') THEN 1 ELSE 0 END) AS en_transito,
        SUM(CASE WHEN estado = 'RECIBIDO' THEN 1 ELSE 0 END) AS recibidos,
        SUM(CASE WHEN estado = 'BLOQUEADO' THEN 1 ELSE 0 END) AS bloqueados,
        SUM(CASE WHEN estado = 'CONCLUIDO' THEN 1 ELSE 0 END) AS concluidos,
        SUM(CASE WHEN estado = 'ANULADO' THEN 1 ELSE 0 END) AS anulados
    FROM dbo.tramites
    WHERE gestion = @Year AND activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Tramites_Anular: Operación especial de anulación
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Tramites_Anular
    @Id          INT,
    @Motivo      NVARCHAR(MAX),
    @UserId      INT,
    @UbicacionId INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.tramites
        SET estado = 'ANULADO',
            motivo_anulacion = @Motivo,
            updated_at = GETDATE()
        WHERE id = @Id AND activo = 1;

        DECLARE @NextOrden INT;
        SELECT @NextOrden = ISNULL(MAX(orden), 0) + 1 FROM dbo.movimientos WHERE tramite_id = @Id;

        INSERT INTO dbo.movimientos (
            tramite_id, orden, tipo_movimiento, actividad_nombre,
            usuario_origen_id, ubicacion_origen_id, estado_movimiento,
            proveido, fecha_envio, created_at
        ) VALUES (
            @Id, @NextOrden, 'ANULACION', 'Anulación de trámite',
            @UserId, @UbicacionId, 'ANULADO',
            'Anulación: ' + @Motivo, GETDATE(), GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


-- =============================================================================
-- SECCIÓN 4: MÓDULO ADJUNTOS DIGITALES (PDFs)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Adjuntos_Insertar: Registra documento digital PDF
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Adjuntos_Insertar
    @TramiteId         INT,
    @MovimientoId      INT           = NULL,
    @NombreOriginal    VARCHAR(255),
    @NombreAlmacenado  VARCHAR(255),
    @RutaArchivo       VARCHAR(500),
    @TipoMime          VARCHAR(100)  = 'application/pdf',
    @TamanoBytes       BIGINT,
    @SubidoPor         INT,
    @NuevoId           INT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        INSERT INTO dbo.adjuntos (
            tramite_id, movimiento_id, nombre_original, nombre_almacenado,
            ruta_archivo, tipo_mime, tamano_bytes, subido_por, activo, created_at
        ) VALUES (
            @TramiteId, @MovimientoId, @NombreOriginal, @NombreAlmacenado,
            @RutaArchivo, @TipoMime, @TamanoBytes, @SubidoPor, 1, GETDATE()
        );

        SET @NuevoId = SCOPE_IDENTITY();

        UPDATE dbo.tramites SET updated_at = GETDATE() WHERE id = @TramiteId;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Adjuntos_ListarPorTramite: Listado de PDFs vigentes de un trámite
-- ─────────────────────────────────────────────────────────────────────────────
GO
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
        ISNULL(p.nombres + ' ' + p.apellido_paterno, u.login) AS subido_por_nombre,
        a.created_at AS fecha_subida
    FROM dbo.adjuntos a
    INNER JOIN dbo.usuarios u ON u.id = a.subido_por
    LEFT JOIN dbo.personas p  ON p.id = u.persona_id
    WHERE a.tramite_id = @TramiteId AND a.activo = 1
    ORDER BY a.id DESC;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Adjuntos_ObtenerPorId: Obtiene metadatos de un adjunto
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Adjuntos_ObtenerPorId
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    SELECT
        id,
        tramite_id,
        movimiento_id,
        nombre_original,
        nombre_almacenado,
        ruta_archivo,
        tipo_mime,
        tamano_bytes,
        subido_por,
        activo,
        created_at
    FROM dbo.adjuntos
    WHERE id = @Id AND activo = 1;
END
GO

-- ─────────────────────────────────────────────────────────────────────────────
-- usp_Adjuntos_EliminarLogico: Baja lógica de documento PDF
-- ─────────────────────────────────────────────────────────────────────────────
GO
CREATE OR ALTER PROCEDURE dbo.usp_Adjuntos_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        UPDATE dbo.adjuntos
        SET activo = 0
        WHERE id = @Id;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO


-- =============================================================================
-- SECCIÓN 5: SINÓNIMOS / ALIAS DE COMPATIBILIDAD (SP_...)
-- =============================================================================
GO
CREATE OR ALTER PROCEDURE dbo.SP_AutenticarUsuario @Login NVARCHAR(50) AS BEGIN EXEC dbo.usp_Usuarios_Autenticar @Login; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerRolesUsuario @UsuarioId INT AS BEGIN EXEC dbo.usp_Usuarios_ObtenerRoles @UsuarioId; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ActualizarUltimoAcceso @UsuarioId INT AS BEGIN EXEC dbo.usp_Usuarios_ActualizarUltimoAcceso @UsuarioId; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarTramites @Estado NVARCHAR(30)=NULL, @Gestion INT=NULL, @Search NVARCHAR(200)=NULL, @Limit INT=50, @Offset INT=0 AS BEGIN EXEC dbo.usp_Tramites_Listar @Estado, @Gestion, @Search, @Limit, @Offset; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ConsultaPublicaTramite @Correlativo NVARCHAR(50), @Gestion INT=NULL AS BEGIN EXEC dbo.usp_Tramites_ConsultaPublica @Correlativo, @Gestion; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerEstadisticasTramites @Gestion INT=NULL AS BEGIN EXEC dbo.usp_Tramites_ObtenerEstadisticas @Gestion; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_AnularTramite @Id INT, @Motivo NVARCHAR(MAX), @UserId INT=1, @UbicacionId INT=3 AS BEGIN EXEC dbo.usp_Tramites_Anular @Id, @Motivo, @UserId, @UbicacionId; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarUsuarios @Search NVARCHAR(100)=NULL, @Activo VARCHAR(20)='activos', @Limit INT=50, @Offset INT=0 AS BEGIN EXEC dbo.usp_Usuarios_Listar @Search, @Activo, @Limit, @Offset; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerUsuarioPorId @Id INT AS BEGIN EXEC dbo.usp_Usuarios_ObtenerPorId @Id; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_CambiarPasswordUsuario @Id INT, @PasswordHash NVARCHAR(255) AS BEGIN EXEC dbo.usp_Usuarios_CambiarPassword @Id, @PasswordHash; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarUnidades @Activo BIT=NULL AS BEGIN EXEC dbo.usp_TUnidad_Listar @Activo; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarCargos @CodU SMALLINT=NULL, @Activo BIT=NULL AS BEGIN EXEC dbo.usp_TCargo_Listar @CodU, @Activo; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ListarEmpleados @Search VARCHAR(100)=NULL, @Activo BIT=NULL, @Limit INT=50, @Offset INT=0 AS BEGIN EXEC dbo.usp_TEmpleados_Listar @Search, @Activo, @Limit, @Offset; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_ObtenerEmpleadoPorCI @CI INT AS BEGIN EXEC dbo.usp_TEmpleados_ObtenerPorCI @CI; END
GO
CREATE OR ALTER PROCEDURE dbo.SP_PreviewCorrelativo @TipoProcesoId INT, @Gestion INT=NULL AS BEGIN EXEC dbo.usp_Tramites_PreviewCorrelativo @TipoProcesoId, @Gestion; END
GO
