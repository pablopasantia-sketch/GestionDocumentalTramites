-- Migración 011: Crear tabla parametros (Configuraciones Globales y Variables del Sistema) - T-SQL
IF OBJECT_ID(N'dbo.parametros', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.parametros (
      id INT IDENTITY(1,1) PRIMARY KEY,
      clave VARCHAR(100) NOT NULL,
      valor NVARCHAR(MAX) NOT NULL,
      tipo_dato VARCHAR(30) NOT NULL DEFAULT 'STRING',
      descripcion VARCHAR(255) NULL,
      editable BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_parametros_clave UNIQUE (clave)
    );
END;
