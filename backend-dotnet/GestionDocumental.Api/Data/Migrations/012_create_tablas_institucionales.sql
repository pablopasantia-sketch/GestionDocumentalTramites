-- Migración 012: Crear tablas institucionales (TUnidad, TCargo, TEmpleados) - DB_TRAMITES_EXTERNOS T-SQL

-- 1. Tabla TUnidad
IF OBJECT_ID(N'dbo.TUnidad', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TUnidad (
        [CodU] [smallint] NOT NULL,
        [NombU] [varchar](50) NOT NULL,
        [Activo] [bit] NOT NULL,
        CONSTRAINT [PK_TUnidad] PRIMARY KEY CLUSTERED ([CodU] ASC)
    );
END;

-- 2. Tabla TCargo
IF OBJECT_ID(N'dbo.TCargo', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TCargo (
        [CodCargo] [smallint] NOT NULL,
        [NombreC] [varchar](50) NOT NULL,
        [CodU] [smallint] NOT NULL,
        CONSTRAINT [PK_TCargo] PRIMARY KEY CLUSTERED ([CodCargo] ASC),
        CONSTRAINT [FK_TCargoTUnidad] FOREIGN KEY ([CodU]) REFERENCES dbo.TUnidad ([CodU])
    );
END;

-- 3. Tabla TEmpleados
IF OBJECT_ID(N'dbo.TEmpleados', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TEmpleados (
        [CI] [int] NOT NULL,
        [Apellidos] [varchar](50) NOT NULL,
        [Nombres] [varchar](50) NOT NULL,
        [Direccion] [varchar](50) NOT NULL,
        [Cel] [int] NOT NULL,
        [Email] [varchar](50) NULL,
        [Activo] [bit] NOT NULL,
        CONSTRAINT [PK_TEmpleados] PRIMARY KEY CLUSTERED ([CI] ASC)
    );
END;
