-- Migración 010: Crear tabla adjuntos (Archivos y Documentos Digitales / PDFs) - T-SQL
IF OBJECT_ID(N'dbo.adjuntos', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.adjuntos (
      id INT IDENTITY(1,1) PRIMARY KEY,
      tramite_id INT NOT NULL,
      movimiento_id INT NULL,
      nombre_original VARCHAR(255) NOT NULL,
      nombre_almacenado VARCHAR(255) NOT NULL,
      ruta_archivo VARCHAR(500) NOT NULL,
      tipo_mime VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
      tamano_bytes BIGINT NOT NULL DEFAULT 0,
      subido_por INT NOT NULL,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT fk_adj_tramite FOREIGN KEY (tramite_id) REFERENCES dbo.tramites (id) ON DELETE CASCADE,
      CONSTRAINT fk_adj_movimiento FOREIGN KEY (movimiento_id) REFERENCES dbo.movimientos (id),
      CONSTRAINT fk_adj_usuario FOREIGN KEY (subido_por) REFERENCES dbo.usuarios (id)
    );

    CREATE INDEX idx_adj_tramite ON dbo.adjuntos (tramite_id);
    CREATE INDEX idx_adj_movimiento ON dbo.adjuntos (movimiento_id);
    CREATE INDEX idx_adj_activo ON dbo.adjuntos (activo);
END;
