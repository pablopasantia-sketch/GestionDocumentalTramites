-- Migración 014: Unificación y sincronización bidireccional entre TUnidad y ubicaciones_org
-- DB_TRAMITES_EXTERNOS T-SQL

-- 1. Agregar columna codU a dbo.ubicaciones_org si no existe
IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID(N'dbo.ubicaciones_org') 
      AND name = 'codU'
)
BEGIN
    ALTER TABLE dbo.ubicaciones_org ADD [codU] [smallint] NULL;
    ALTER TABLE dbo.ubicaciones_org 
        ADD CONSTRAINT [FK_UbicacionesOrg_TUnidad] 
        FOREIGN KEY ([codU]) REFERENCES dbo.TUnidad ([CodU]);
END;
GO

-- 2. Enlazar registros históricos existentes (1 al 6)
UPDATE dbo.ubicaciones_org SET codU = 1 WHERE id = 1 AND codU IS NULL;
UPDATE dbo.ubicaciones_org SET codU = 2 WHERE id = 2 AND codU IS NULL;
UPDATE dbo.ubicaciones_org SET codU = 3 WHERE id = 3 AND codU IS NULL;
UPDATE dbo.ubicaciones_org SET codU = 4 WHERE id = 4 AND codU IS NULL;
UPDATE dbo.ubicaciones_org SET codU = 5 WHERE id = 5 AND codU IS NULL;
UPDATE dbo.ubicaciones_org SET codU = 6 WHERE id = 6 AND codU IS NULL;
GO

-- 3. Crear en ubicaciones_org los registros de TUnidad que aún no existían en el árbol (7 al 10)
IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codU = 7)
    INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
    VALUES ('DIR-PLAN', 'DIRECCION DE PLANIFICACION Y MEDIO AMBIENTE', 'DPMA', 2, 1, 'Planificación territorial y medio ambiente municipal', 1, 7, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codU = 8)
    INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
    VALUES ('DIR-SAL', 'DIRECCION DE SALUD Y DESARROLLO SOCIAL', 'DSDS', 2, 1, 'Salud y programas sociales municipales', 1, 8, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codU = 9)
    INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
    VALUES ('DIR-OBR', 'DIRECCION DE OBRAS PUBLICAS E INFRAESTRUCTURA', 'DOPI', 2, 1, 'Obras públicas e infraestructura urbana', 1, 9, GETDATE(), GETDATE());

IF NOT EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codU = 10)
    INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
    VALUES ('DIR-ING', 'DIRECCION DE INGRESOS Y TRIBUTACION', 'DIT', 2, 1, 'Recaudaciones e ingresos tributarios municipales', 1, 10, GETDATE(), GETDATE());
GO

-- 4. Actualizar Stored Procedures: Listar y ObtenerPorId para incluir codU
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
        u.codU,
        u.created_at,
        u.updated_at
    FROM dbo.ubicaciones_org u
    LEFT JOIN dbo.ubicaciones_org p ON p.id = u.padre_id
    WHERE (@Activo = 'todos' OR (@Activo = 'activos' AND u.activo = 1) OR (@Activo = 'inactivos' AND u.activo = 0))
    ORDER BY u.nivel ASC, u.nombre ASC;
END
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
        u.codU,
        u.created_at,
        u.updated_at
    FROM dbo.ubicaciones_org u
    LEFT JOIN dbo.ubicaciones_org p ON p.id = u.padre_id
    WHERE u.id = @Id;
END
GO

-- 5. usp_UbicacionesOrg_Insertar: Inserción atómica y coordinada en TUnidad y ubicaciones_org
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_Insertar
    @Codigo      VARCHAR(50),
    @Nombre      VARCHAR(150),
    @Sigla       VARCHAR(30)   = NULL,
    @Nivel       INT           = 1,
    @PadreId     INT           = NULL,
    @Descripcion NVARCHAR(MAX) = NULL,
    @NuevoId     INT OUTPUT,
    @NuevoCodU   SMALLINT OUTPUT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codigo = @Codigo)
        BEGIN
            THROW 50008, 'El código de ubicación orgánica ya existe.', 1;
        END

        -- 1. Calcular el siguiente CodU disponible para TUnidad
        DECLARE @MaxCod SMALLINT;
        SELECT @MaxCod = ISNULL(MAX(CodU), 0) + 1 FROM dbo.TUnidad;

        -- 2. Insertar en TUnidad (Catálogo oficial municipal)
        INSERT INTO dbo.TUnidad (CodU, NombU, Activo)
        VALUES (@MaxCod, UPPER(LEFT(@Nombre, 50)), 1);

        -- 3. Insertar en ubicaciones_org (Árbol jerárquico) con referencia al CodU
        INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
        VALUES (@Codigo, @Nombre, @Sigla, @Nivel, @PadreId, @Descripcion, 1, @MaxCod, GETDATE(), GETDATE());

        SET @NuevoId = SCOPE_IDENTITY();
        SET @NuevoCodU = @MaxCod;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- 6. usp_UbicacionesOrg_Actualizar: Modificación coordinada
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

        DECLARE @LinkedCodU SMALLINT;
        SELECT @LinkedCodU = codU FROM dbo.ubicaciones_org WHERE id = @Id;

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

        -- Sincronizar en TUnidad si está enlazada
        IF @LinkedCodU IS NOT NULL
        BEGIN
            UPDATE dbo.TUnidad
            SET NombU = UPPER(LEFT(@Nombre, 50)),
                Activo = @Activo
            WHERE CodU = @LinkedCodU;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- 7. usp_UbicacionesOrg_EliminarLogico: Baja lógica coordinada
CREATE OR ALTER PROCEDURE dbo.usp_UbicacionesOrg_EliminarLogico
    @Id INT
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;
        IF EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE padre_id = @Id AND activo = 1)
        BEGIN
            THROW 50010, 'No se puede dar de baja la unidad porque contiene unidades subordinadas activas.', 1;
        END

        DECLARE @LinkedCodU SMALLINT;
        SELECT @LinkedCodU = codU FROM dbo.ubicaciones_org WHERE id = @Id;

        UPDATE dbo.ubicaciones_org
        SET activo = 0, updated_at = GETDATE()
        WHERE id = @Id;

        -- Sincronizar en TUnidad si está enlazada
        IF @LinkedCodU IS NOT NULL
        BEGIN
            UPDATE dbo.TUnidad
            SET Activo = 0
            WHERE CodU = @LinkedCodU;
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- 8. usp_TUnidad_Insertar: Sincronización hacia ubicaciones_org
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
        VALUES (@MaxCod, UPPER(@NombU), 1);

        -- Generar código alfanumérico único para el árbol
        DECLARE @GenCodigo VARCHAR(50) = 'UNI-' + CAST(@MaxCod AS VARCHAR(10));
        IF EXISTS (SELECT 1 FROM dbo.ubicaciones_org WHERE codigo = @GenCodigo)
            SET @GenCodigo = 'UNI-' + CAST(@MaxCod AS VARCHAR(10)) + '-' + CONVERT(VARCHAR(5), GETDATE(), 12);

        -- Sincronizar en el árbol jerárquico colgando de la raíz (1)
        INSERT INTO dbo.ubicaciones_org (codigo, nombre, sigla, nivel, padre_id, descripcion, activo, codU, created_at, updated_at)
        VALUES (@GenCodigo, UPPER(@NombU), NULL, 2, 1, 'Unidad creada desde catálogo municipal', 1, @MaxCod, GETDATE(), GETDATE());

        SET @NuevoCodU = @MaxCod;
        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- 9. usp_TUnidad_Actualizar: Sincronización hacia ubicaciones_org
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
        SET NombU = UPPER(@NombU),
            Activo = @Activo
        WHERE CodU = @CodU;

        -- Sincronizar en ubicaciones_org
        UPDATE dbo.ubicaciones_org
        SET nombre = UPPER(@NombU),
            activo = @Activo,
            updated_at = GETDATE()
        WHERE codU = @CodU;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO

-- 10. usp_TUnidad_EliminarLogico: Sincronización hacia ubicaciones_org
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

        -- Sincronizar en ubicaciones_org
        UPDATE dbo.ubicaciones_org
        SET activo = 0,
            updated_at = GETDATE()
        WHERE codU = @CodU;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END
GO
