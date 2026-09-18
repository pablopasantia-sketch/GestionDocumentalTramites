-- Migración 006: Crear tabla tipos_proceso (Trámites y Correspondencias Unificadas) - T-SQL
IF OBJECT_ID(N'dbo.tipos_proceso', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tipos_proceso (
      id INT IDENTITY(1,1) PRIMARY KEY,
      codigo VARCHAR(20) NOT NULL,
      nombre VARCHAR(150) NOT NULL,
      descripcion NVARCHAR(MAX) NULL,
      tipo_categoria VARCHAR(30) NOT NULL DEFAULT 'TRAMITE',
      ubicacion_org_id INT NULL,
      correlativo_seq INT NOT NULL DEFAULT 0,
      tiempo_estimado_horas INT NOT NULL DEFAULT 24,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_tipos_proceso_codigo UNIQUE (codigo),
      CONSTRAINT fk_tp_ubicacion FOREIGN KEY (ubicacion_org_id) REFERENCES dbo.ubicaciones_org (id)
    );

    CREATE INDEX idx_tp_categoria ON dbo.tipos_proceso (tipo_categoria);
    CREATE INDEX idx_tp_activo ON dbo.tipos_proceso (activo);
END;
