-- Migración 002: Crear tabla ubicaciones_org (Organigrama Jerárquico Institucional) - T-SQL
IF OBJECT_ID(N'dbo.ubicaciones_org', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ubicaciones_org (
      id INT IDENTITY(1,1) PRIMARY KEY,
      codigo VARCHAR(50) NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      sigla VARCHAR(30) NULL,
      padre_id INT NULL,
      nivel INT NOT NULL DEFAULT 1,
      descripcion NVARCHAR(MAX) NULL,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_ubicaciones_codigo UNIQUE (codigo),
      CONSTRAINT fk_ubicaciones_padre FOREIGN KEY (padre_id) REFERENCES dbo.ubicaciones_org (id)
    );

    CREATE INDEX idx_ubicaciones_padre ON dbo.ubicaciones_org (padre_id);
    CREATE INDEX idx_ubicaciones_activo ON dbo.ubicaciones_org (activo);
END;
