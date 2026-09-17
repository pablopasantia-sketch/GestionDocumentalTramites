-- Migración 002: Crear tabla ubicaciones_org (Organigrama Jerárquico Institucional)
CREATE TABLE IF NOT EXISTS `ubicaciones_org` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `sigla` VARCHAR(30) NULL,
  `padre_id` INT NULL,
  `nivel` INT NOT NULL DEFAULT 1,
  `descripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_ubicaciones_codigo` (`codigo`),
  INDEX `idx_ubicaciones_padre` (`padre_id`),
  INDEX `idx_ubicaciones_activo` (`activo`),
  CONSTRAINT `fk_ubicaciones_padre` FOREIGN KEY (`padre_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
