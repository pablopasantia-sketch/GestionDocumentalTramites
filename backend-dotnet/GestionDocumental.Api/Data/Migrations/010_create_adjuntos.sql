-- Migración 010: Crear tabla adjuntos (Archivos y Documentos Digitales / PDFs)
CREATE TABLE IF NOT EXISTS `adjuntos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tramite_id` INT NOT NULL,
  `movimiento_id` INT NULL,
  `nombre_original` VARCHAR(255) NOT NULL,
  `nombre_almacenado` VARCHAR(255) NOT NULL,
  `ruta_archivo` VARCHAR(500) NOT NULL,
  `tipo_mime` VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
  `tamano_bytes` BIGINT NOT NULL DEFAULT 0,
  `subido_por` INT NOT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_adj_tramite` (`tramite_id`),
  INDEX `idx_adj_movimiento` (`movimiento_id`),
  INDEX `idx_adj_activo` (`activo`),
  CONSTRAINT `fk_adj_tramite` FOREIGN KEY (`tramite_id`) REFERENCES `tramites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_adj_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimientos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_adj_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
