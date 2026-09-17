USE [DBNotasCMS]
GO

/****** Object:  Table [dbo].[TEmpleados]    Script Date: 17/09/2026 11:44:53 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[TEmpleados](
	[CI] [int] NOT NULL,
	[Apellidos] [varchar](50) NOT NULL,
	[Nombres] [varchar](50) NOT NULL,
	[Direccion] [varchar](50) NOT NULL,
	[Cel] [int] NOT NULL,
	[Email] [varchar](50) NULL,
	[Activo] [bit] NOT NULL,
 CONSTRAINT [PK_TEmpleados] PRIMARY KEY CLUSTERED 
(
	[CI] ASC
)WITH (PAD_INDEX = OFF, STATISTICS_NORECOMPUTE = OFF, IGNORE_DUP_KEY = OFF, ALLOW_ROW_LOCKS = ON, ALLOW_PAGE_LOCKS = ON, OPTIMIZE_FOR_SEQUENTIAL_KEY = OFF) ON [PRIMARY]
) ON [PRIMARY]
GO

