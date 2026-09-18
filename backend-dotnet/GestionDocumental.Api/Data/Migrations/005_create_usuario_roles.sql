-- Migración 005: Crear tabla usuario_roles (Asignación Multi-Rol con Ubicación Orgánica) - T-SQL
IF OBJECT_ID(N'dbo.usuario_roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuario_roles (
      id INT IDENTITY(1,1) PRIMARY KEY,
      usuario_id INT NOT NULL,
      rol_id INT NOT NULL,
      ubicacion_org_id INT NOT NULL,
      nivel_acceso VARCHAR(50) NOT NULL DEFAULT 'CONTROL_TOTAL',
      fecha_expiracion DATE NULL,
      filtro VARCHAR(255) NULL,
      es_principal BIT NOT NULL DEFAULT 0,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_usuario_rol_ubicacion UNIQUE (usuario_id, rol_id, ubicacion_org_id),
      CONSTRAINT fk_ur_usuario FOREIGN KEY (usuario_id) REFERENCES dbo.usuarios (id),
      CONSTRAINT fk_ur_rol FOREIGN KEY (rol_id) REFERENCES dbo.roles (id),
      CONSTRAINT fk_ur_ubicacion FOREIGN KEY (ubicacion_org_id) REFERENCES dbo.ubicaciones_org (id)
    );

    CREATE INDEX idx_ur_usuario ON dbo.usuario_roles (usuario_id);
    CREATE INDEX idx_ur_rol ON dbo.usuario_roles (rol_id);
    CREATE INDEX idx_ur_ubicacion ON dbo.usuario_roles (ubicacion_org_id);
    CREATE INDEX idx_ur_activo_exp ON dbo.usuario_roles (activo, fecha_expiracion);
END;
