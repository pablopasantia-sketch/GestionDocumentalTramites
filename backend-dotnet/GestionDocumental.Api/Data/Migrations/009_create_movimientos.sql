-- Migración 009: Crear tabla movimientos (Historial Inmutable, Trazabilidad, Proveídos y Derivaciones) - T-SQL
IF OBJECT_ID(N'dbo.movimientos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.movimientos (
      id INT IDENTITY(1,1) PRIMARY KEY,
      tramite_id INT NOT NULL,
      orden INT NOT NULL DEFAULT 1,
      tipo_movimiento VARCHAR(30) NOT NULL,
      actividad_nombre VARCHAR(150) NOT NULL DEFAULT 'Atención de trámite',
      usuario_origen_id INT NOT NULL,
      ubicacion_origen_id INT NOT NULL,
      usuario_destino_id INT NULL,
      ubicacion_destino_id INT NULL,
      estado_movimiento VARCHAR(50) NOT NULL,
      proveido NVARCHAR(MAX) NULL,
      instruccion VARCHAR(255) NULL,
      justificacion_retroceso NVARCHAR(MAX) NULL,
      fecha_recepcion DATETIME2 NULL,
      fecha_envio DATETIME2 NULL,
      tiempo_estimado_minutos INT NOT NULL DEFAULT 0,
      tiempo_transcurrido_minutos INT NOT NULL DEFAULT 0,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT fk_mov_tramite FOREIGN KEY (tramite_id) REFERENCES dbo.tramites (id) ON DELETE CASCADE,
      CONSTRAINT fk_mov_usr_origen FOREIGN KEY (usuario_origen_id) REFERENCES dbo.usuarios (id),
      CONSTRAINT fk_mov_ubi_origen FOREIGN KEY (ubicacion_origen_id) REFERENCES dbo.ubicaciones_org (id),
      CONSTRAINT fk_mov_usr_dest FOREIGN KEY (usuario_destino_id) REFERENCES dbo.usuarios (id),
      CONSTRAINT fk_mov_ubi_dest FOREIGN KEY (ubicacion_destino_id) REFERENCES dbo.ubicaciones_org (id)
    );

    CREATE INDEX idx_mov_tramite_orden ON dbo.movimientos (tramite_id, orden);
    CREATE INDEX idx_mov_origen ON dbo.movimientos (usuario_origen_id);
    CREATE INDEX idx_mov_destino ON dbo.movimientos (usuario_destino_id);
    CREATE INDEX idx_mov_fecha_recepcion ON dbo.movimientos (fecha_recepcion);
    CREATE INDEX idx_mov_fecha_envio ON dbo.movimientos (fecha_envio);
END;
