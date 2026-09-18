-- Migración 004: Crear tabla usuarios (Cuentas y Credenciales) - T-SQL
IF OBJECT_ID(N'dbo.usuarios', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.usuarios (
      id INT IDENTITY(1,1) PRIMARY KEY,
      persona_id INT NOT NULL,
      login VARCHAR(50) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      cargo VARCHAR(120) NULL,
      activo BIT NOT NULL DEFAULT 1,
      ultimo_acceso DATETIME2 NULL,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_usuarios_login UNIQUE (login),
      CONSTRAINT fk_usuarios_persona FOREIGN KEY (persona_id) REFERENCES dbo.personas (id)
    );

    CREATE INDEX idx_usuarios_persona ON dbo.usuarios (persona_id);
    CREATE INDEX idx_usuarios_activo ON dbo.usuarios (activo);
END;
