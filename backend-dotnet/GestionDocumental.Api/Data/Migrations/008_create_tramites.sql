-- Migración 008: Crear tabla tramites (Flujo Unificado de Trámites y Correspondencias) - T-SQL
IF OBJECT_ID(N'dbo.tramites', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.tramites (
      id INT IDENTITY(1,1) PRIMARY KEY,
      numero_correlativo VARCHAR(50) NOT NULL,
      gestion INT NOT NULL,
      tipo_proceso_id INT NOT NULL,
      estado VARCHAR(30) NOT NULL DEFAULT 'EN_ATENCION',
      remitente VARCHAR(200) NOT NULL,
      referencia NVARCHAR(MAX) NOT NULL,
      tipo_corres VARCHAR(20) NOT NULL DEFAULT 'INTERNO',
      nro_hojas INT NOT NULL DEFAULT 1,
      nro_anexos INT NOT NULL DEFAULT 0,
      instruccion VARCHAR(255) NULL,
      prioridad VARCHAR(20) NOT NULL DEFAULT 'NORMAL',
      primer_destinatario_id INT NULL,
      otros_destinatarios_json NVARCHAR(MAX) NULL,
      fecha_creacion DATETIME2 NOT NULL DEFAULT GETDATE(),
      fecha_conclusion DATETIME2 NULL,
      fecha_limite_respuesta DATE NULL,
      creado_por INT NOT NULL,
      ubicacion_org_id INT NOT NULL,
      usuario_actual_id INT NULL,
      ubicacion_actual_id INT NULL,
      cite_externo VARCHAR(100) NULL,
      institucion_remitente NVARCHAR(200) NULL,
      cod_u_destino SMALLINT NULL,
      cod_cargo_destino SMALLINT NULL,
      ci_empleado_destino INT NULL,
      destinatario_nombre NVARCHAR(150) NULL,
      destinatario_cargo NVARCHAR(150) NULL,
      destinatario_unidad NVARCHAR(150) NULL,
      motivo_bloqueo NVARCHAR(MAX) NULL,
      motivo_anulacion NVARCHAR(MAX) NULL,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_tramite_correlativo_gestion UNIQUE (numero_correlativo, gestion),
      CONSTRAINT fk_tramite_tipo FOREIGN KEY (tipo_proceso_id) REFERENCES dbo.tipos_proceso (id),
      CONSTRAINT fk_tramite_creador FOREIGN KEY (creado_por) REFERENCES dbo.usuarios (id),
      CONSTRAINT fk_tramite_ubicacion FOREIGN KEY (ubicacion_org_id) REFERENCES dbo.ubicaciones_org (id),
      CONSTRAINT fk_tramite_usr_actual FOREIGN KEY (usuario_actual_id) REFERENCES dbo.usuarios (id),
      CONSTRAINT fk_tramite_ubi_actual FOREIGN KEY (ubicacion_actual_id) REFERENCES dbo.ubicaciones_org (id),
      CONSTRAINT fk_tramite_primer_dest FOREIGN KEY (primer_destinatario_id) REFERENCES dbo.usuarios (id)
    );

    CREATE INDEX idx_tramites_estado ON dbo.tramites (estado);
    CREATE INDEX idx_tramites_gestion ON dbo.tramites (gestion);
    CREATE INDEX idx_tramites_usuario_actual ON dbo.tramites (usuario_actual_id);
    CREATE INDEX idx_tramites_ubicacion_actual ON dbo.tramites (ubicacion_actual_id);
    CREATE INDEX idx_tramites_fecha_creacion ON dbo.tramites (fecha_creacion);
    CREATE INDEX idx_tramites_fecha_limite ON dbo.tramites (fecha_limite_respuesta);
    CREATE INDEX idx_tramites_activo ON dbo.tramites (activo);
END;
