-- Migración 007: Crear tabla correlativos (Control Secuencial por Gestión y Proceso/Oficina)
CREATE TABLE IF NOT EXISTS `correlativos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo_proceso_id` INT NULL,
  `ubicacion_org_id` INT NULL,
  `gestion` INT NOT NULL,
  `ultimo_numero` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_correlativo_seq` (`tipo_proceso_id`, `ubicacion_org_id`, `gestion`),
  INDEX `idx_corr_gestion` (`gestion`),
  CONSTRAINT `fk_corr_tipo` FOREIGN KEY (`tipo_proceso_id`) REFERENCES `tipos_proceso` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_corr_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
