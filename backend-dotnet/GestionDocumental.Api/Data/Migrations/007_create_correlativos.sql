-- Migración 007: Crear tabla correlativos (Control Secuencial por Gestión y Proceso/Oficina) - T-SQL
IF OBJECT_ID(N'dbo.correlativos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.correlativos (
      id INT IDENTITY(1,1) PRIMARY KEY,
      tipo_proceso_id INT NULL,
      ubicacion_org_id INT NULL,
      gestion INT NOT NULL,
      ultimo_numero INT NOT NULL DEFAULT 0,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_correlativo_seq UNIQUE (tipo_proceso_id, ubicacion_org_id, gestion),
      CONSTRAINT fk_corr_tipo FOREIGN KEY (tipo_proceso_id) REFERENCES dbo.tipos_proceso (id),
      CONSTRAINT fk_corr_ubicacion FOREIGN KEY (ubicacion_org_id) REFERENCES dbo.ubicaciones_org (id)
    );

    CREATE INDEX idx_corr_gestion ON dbo.correlativos (gestion);
END;
