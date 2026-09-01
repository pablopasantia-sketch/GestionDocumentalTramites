-- Migración 001: Crear tabla personas (Datos Personales de Funcionarios y Ciudadanos)
CREATE TABLE IF NOT EXISTS `personas` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `nombres` VARCHAR(100) NOT NULL,
  `apellido_paterno` VARCHAR(100) NOT NULL,
  `apellido_materno` VARCHAR(100) NULL,
  `ci` VARCHAR(25) NOT NULL,
  `ci_expedido` VARCHAR(10) NULL,
  `sexo` ENUM('M', 'F', 'OTRO') DEFAULT 'M',
  `estado_civil` VARCHAR(30) NULL,
  `telefono` VARCHAR(30) NULL,
  `email` VARCHAR(120) NULL,
  `empresa_telefonica` VARCHAR(50) NULL,
  `direccion` VARCHAR(255) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_personas_ci` (`ci`),
  INDEX `idx_personas_nombres` (`nombres`, `apellido_paterno`),
  INDEX `idx_personas_activo` (`activo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
