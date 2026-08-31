-- ==============================================================================
-- SISTEMA WAYKA MVP - ESQUEMA DE BASE DE DATOS (MySQL 8.0+)
-- Flujo Unificado de Trámites Documentales y Workflow Institucional
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `wayka_db` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `wayka_db`;

-- Deshabilitar chequeo de llaves foráneas temporalmente para recargas limpias
SET FOREIGN_KEY_CHECKS = 0;

-- 1. TABLA: PERSONAS (Datos personales)
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
  INDEX `idx_personas_nombres` (`nombres`, `apellido_paterno`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. TABLA: UBICACIONES_ORG (Organigrama y Estructura Jerárquica)
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
  CONSTRAINT `fk_ubicaciones_padre` FOREIGN KEY (`padre_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. TABLA: ROLES (Catálogo de Roles del Sistema)
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `codigo` VARCHAR(50) NOT NULL,
  `nombre` VARCHAR(100) NOT NULL,
  `descripcion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_roles_codigo` (`codigo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. TABLA: USUARIOS (Credenciales y Cuentas de Usuario)
CREATE TABLE IF NOT EXISTS `usuarios` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `persona_id` INT NOT NULL,
  `login` VARCHAR(50) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `cargo` VARCHAR(120) NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `ultimo_acceso` DATETIME NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_usuarios_login` (`login`),
  CONSTRAINT `fk_usuarios_persona` FOREIGN KEY (`persona_id`) REFERENCES `personas` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. TABLA: USUARIO_ROLES (Asignación Multi-Rol con Ubicación Orgánica)
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
  CONSTRAINT `fk_ur_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ur_rol` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_ur_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. TABLA: TIPOS_PROCESO (Catálogo de Tipos de Trámite / Correspondencia)
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
  CONSTRAINT `fk_tp_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. TABLA: CORRELATIVOS (Control Secuencial por Gestión y Proceso/Oficina)
CREATE TABLE IF NOT EXISTS `correlativos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tipo_proceso_id` INT NULL,
  `ubicacion_org_id` INT NULL,
  `gestion` INT NOT NULL,
  `ultimo_numero` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_correlativo_seq` (`tipo_proceso_id`, `ubicacion_org_id`, `gestion`),
  CONSTRAINT `fk_corr_tipo` FOREIGN KEY (`tipo_proceso_id`) REFERENCES `tipos_proceso` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_corr_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. TABLA: TRAMITES (Entidad Principal de Trámites y Correspondencias)
CREATE TABLE IF NOT EXISTS `tramites` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `numero_correlativo` VARCHAR(50) NOT NULL,
  `gestion` INT NOT NULL,
  `tipo_proceso_id` INT NOT NULL,
  `estado` ENUM(
    'CREADO', 
    'EN_ATENCION', 
    'ATENDIDO', 
    'EN_TRANSITO', 
    'POR_RECIBIR', 
    'RECIBIDO', 
    'BLOQUEADO', 
    'CONCLUIDO', 
    'ANULADO'
  ) NOT NULL DEFAULT 'EN_ATENCION',
  `remitente` VARCHAR(200) NOT NULL,
  `referencia` TEXT NOT NULL,
  `nro_hojas` INT NOT NULL DEFAULT 1,
  `nro_anexos` INT NOT NULL DEFAULT 0,
  `fecha_creacion` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_conclusion` DATETIME NULL,
  `fecha_limite_respuesta` DATE NULL,
  `creado_por` INT NOT NULL,
  `ubicacion_org_id` INT NOT NULL,
  `usuario_actual_id` INT NULL,
  `ubicacion_actual_id` INT NULL,
  `motivo_bloqueo` TEXT NULL,
  `motivo_anulacion` TEXT NULL,
  `activo` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_tramite_correlativo_gestion` (`numero_correlativo`, `gestion`),
  INDEX `idx_tramites_estado` (`estado`),
  INDEX `idx_tramites_gestion` (`gestion`),
  INDEX `idx_tramites_usuario_actual` (`usuario_actual_id`),
  CONSTRAINT `fk_tramite_tipo` FOREIGN KEY (`tipo_proceso_id`) REFERENCES `tipos_proceso` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tramite_creador` FOREIGN KEY (`creado_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tramite_ubicacion` FOREIGN KEY (`ubicacion_org_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tramite_usr_actual` FOREIGN KEY (`usuario_actual_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tramite_ubi_actual` FOREIGN KEY (`ubicacion_actual_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. TABLA: MOVIMIENTOS (Historial Inmutable, Trazabilidad, Proveídos y Derivaciones)
CREATE TABLE IF NOT EXISTS `movimientos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `tramite_id` INT NOT NULL,
  `orden` INT NOT NULL DEFAULT 1,
  `tipo_movimiento` ENUM(
    'INICIO', 
    'DERIVACION', 
    'RETROCESO', 
    'RECEPCION', 
    'BLOQUEO', 
    'DESBLOQUEO', 
    'CONCLUSION', 
    'ANULACION', 
    'REDIRECCION'
  ) NOT NULL,
  `actividad_nombre` VARCHAR(150) NOT NULL DEFAULT 'Atención de trámite',
  `usuario_origen_id` INT NOT NULL,
  `ubicacion_origen_id` INT NOT NULL,
  `usuario_destino_id` INT NULL,
  `ubicacion_destino_id` INT NULL,
  `estado_movimiento` VARCHAR(50) NOT NULL,
  `proveido` TEXT NULL,
  `instruccion` VARCHAR(255) NULL,
  `justificacion_retroceso` TEXT NULL,
  `fecha_recepcion` DATETIME NULL,
  `fecha_envio` DATETIME NULL,
  `tiempo_estimado_minutos` INT NOT NULL DEFAULT 0,
  `tiempo_transcurrido_minutos` INT NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX `idx_mov_tramite` (`tramite_id`),
  INDEX `idx_mov_origen` (`usuario_origen_id`),
  INDEX `idx_mov_destino` (`usuario_destino_id`),
  CONSTRAINT `fk_mov_tramite` FOREIGN KEY (`tramite_id`) REFERENCES `tramites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_mov_usr_origen` FOREIGN KEY (`usuario_origen_id`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mov_ubi_origen` FOREIGN KEY (`ubicacion_origen_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_mov_usr_dest` FOREIGN KEY (`usuario_destino_id`) REFERENCES `usuarios` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mov_ubi_dest` FOREIGN KEY (`ubicacion_destino_id`) REFERENCES `ubicaciones_org` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. TABLA: ADJUNTOS (Archivos y Documentos Digitales / PDFs)
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
  CONSTRAINT `fk_adj_tramite` FOREIGN KEY (`tramite_id`) REFERENCES `tramites` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_adj_movimiento` FOREIGN KEY (`movimiento_id`) REFERENCES `movimientos` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_adj_usuario` FOREIGN KEY (`subido_por`) REFERENCES `usuarios` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. TABLA: PARAMETROS (Configuración Global del Sistema)
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

SET FOREIGN_KEY_CHECKS = 1;
