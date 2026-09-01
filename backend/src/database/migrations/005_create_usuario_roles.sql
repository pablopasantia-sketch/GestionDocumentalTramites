-- Migración 005: Crear tabla usuario_roles (Asignación Multi-Rol con Ubicación Orgánica)
CREATE TABLE IF NOT EXISTS `usuario_roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `rol_id` INT NOT NULL,
  `ubicacion_org_id` INT NOT NULL,
  `nivel_acceso` VARCHAR(50) NOT NULL DEFAULT 'CONTROL_TOTAL',
  `fecha_expiracion` DATE NULL,
  `filtro` VARCHAR(255) NULL,
  `es_principal` BOOLEAN NOT NULL DEFAULT FALSE,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_usuario_rol_ubicacion` (`usuario_id`, `rol_id`, `ubicacion_org_id`),
  INDEX `idx_ur_usuario` (`usuario_id`),
  INDEX `idx_ur_rol` (`rol_id`),
  INDEX `idx_ur_ubicacion` (`ubicacion_org_id`),
  INDEX `idx_ur_activo_exp` (`activo`, `fecha_expiracion`),
  CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ur_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
