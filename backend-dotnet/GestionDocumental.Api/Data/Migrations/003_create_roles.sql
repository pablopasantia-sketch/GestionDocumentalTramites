-- Migración 003: Crear tabla roles (Catálogo de Roles del MVP) - T-SQL
IF OBJECT_ID(N'dbo.roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.roles (
      id INT IDENTITY(1,1) PRIMARY KEY,
      codigo VARCHAR(50) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      descripcion NVARCHAR(MAX) NULL,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_roles_codigo UNIQUE (codigo)
    );

    CREATE INDEX idx_roles_activo ON dbo.roles (activo);
END;
