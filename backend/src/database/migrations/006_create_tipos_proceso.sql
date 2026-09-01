-- Migración 006: Crear tabla tipos_proceso (Trámites y Correspondencias Unificadas)
CREATE TABLE IF NOT EXISTS `tipos_proceso` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(20) NOT NULL,
  `nombre` VARCHAR(150) NOT NULL,
  `descripcion` TEXT NULL,
  `tipo_categoria` ENUM('TRAMITE', 'CORRESPONDENCIA') NOT NULL DEFAULT 'TRAMITE',
  `ubicacion_org_id` INT NULL,
  `correlativo_seq` INT NOT NULL DEFAULT 0,
  `tiempo_estimado_horas` INT NOT NULL DEFAULT 24,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tipos_proceso_codigo` (`codigo`),
  INDEX `idx_tp_categoria` (`tipo_categoria`),
  INDEX `idx_tp_activo` (`activo`),
  CONSTRAINT `fk_tp_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
