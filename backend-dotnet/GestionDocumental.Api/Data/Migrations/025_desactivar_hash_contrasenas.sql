-- =============================================================================
-- Migración 025: Desactivación de Hash y Almacenamiento en Texto Plano de Contraseñas
-- Base de Datos: DB_TRAMITES_EXTERNOS
-- 
-- Convierte contraseñas hasheadas existentes en dbo.TEmpleados al valor
-- de texto plano institucional 'admin123' para visualización directa.
-- =============================================================================

USE DB_TRAMITES_EXTERNOS;
GO

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

PRINT '=============================================================================';
PRINT '🔓 DESACTIVANDO HASH EN TABLA TEmpleados (CONVERSIÓN A TEXTO PLANO)';
PRINT '=============================================================================';

-- Actualizar credenciales existentes que comiencen con hash bcrypt ($2a$, $2b$, $2y$)
UPDATE dbo.TEmpleados
SET password_hash = 'admin123'
WHERE login IS NOT NULL 
  AND (password_hash LIKE '$2a$%' OR password_hash LIKE '$2b$%' OR password_hash LIKE '$2y$%');

PRINT '✅ Contraseñas en dbo.TEmpleados migradas a texto plano exitosamente.';
GO
