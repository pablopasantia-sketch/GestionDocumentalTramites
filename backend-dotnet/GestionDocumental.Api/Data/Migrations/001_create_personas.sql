-- Migración 001: Crear tabla personas (Datos Personales de Funcionarios y Ciudadanos) - T-SQL
IF OBJECT_ID(N'dbo.personas', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.personas (
      id INT IDENTITY(1,1) PRIMARY KEY,
      nombres VARCHAR(100) NOT NULL,
      apellido_paterno VARCHAR(100) NOT NULL,
      apellido_materno VARCHAR(100) NULL,
      ci VARCHAR(25) NOT NULL,
      ci_expedido VARCHAR(10) NULL,
      sexo VARCHAR(10) NOT NULL DEFAULT 'M',
      estado_civil VARCHAR(30) NULL,
      telefono VARCHAR(30) NULL,
      email VARCHAR(120) NULL,
      empresa_telefonica VARCHAR(50) NULL,
      direccion VARCHAR(255) NULL,
      activo BIT NOT NULL DEFAULT 1,
      created_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      updated_at DATETIME2 NOT NULL DEFAULT GETDATE(),
      CONSTRAINT uk_personas_ci UNIQUE (ci)
    );

    CREATE INDEX idx_personas_nombres ON dbo.personas (nombres, apellido_paterno);
    CREATE INDEX idx_personas_activo ON dbo.personas (activo);
END;
