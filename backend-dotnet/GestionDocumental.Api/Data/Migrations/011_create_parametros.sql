-- Migración 011: Crear tabla parametros (Configuraciones Globales y Variables del Sistema)
CREATE TABLE IF NOT EXISTS `parametros` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `clave` VARCHAR(100) NOT NULL,
  `valor` TEXT NOT NULL,
  `tipo_dato` VARCHAR(30) NOT NULL DEFAULT 'STRING',
  `descripcion` VARCHAR(255) NULL,
  `editable` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_parametros_clave` (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
