-- ==============================================================================
-- SISTEMA WAYKA MVP - DATOS SEMILLA INICIALES (SEED DATA)
-- ==============================================================================

USE `wayka_db`;

-- 1. ROLES DEL SISTEMA
INSERT INTO `roles` (`id`, `codigo`, `nombre`, `descripcion`, `activo`) VALUES
(1, 'ADMIN_SISTEMA', 'Administrador de Sistema', 'Gestión de usuarios, personas, organigrama y parámetros base del sistema', 1),
(2, 'ADMIN_WAYKA', 'Administrador de Wayka', 'Gestión operativa de trámites, anulación, redirección y reportes de transparencia', 1),
(3, 'VENTANILLA_UNICA', 'Ventanilla Única', 'Recepción de trámites, registro de correspondencias, emisión de hojas de ruta y bloqueo', 1),
(4, 'FUNCIONARIO', 'Funcionario', 'Atención de trámites, proveídos, adjuntos y derivación en escritorio virtual', 1)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `descripcion` = VALUES(`descripcion`);

-- 2. UBICACIONES ORGÁNICAS BASE (Organigrama Institucional)
INSERT INTO `ubicaciones_org` (`id`, `codigo`, `nombre`, `sigla`, `padre_id`, `nivel`, `descripcion`, `activo`) VALUES
(1, 'DIR-GEN', 'Dirección General Ejecutiva', 'DGE', NULL, 1, 'Máxima Autoridad Ejecutiva de la institución', 1),
(2, 'SEC-GEN', 'Secretaría General', 'SG', 1, 2, 'Secretaría y Despacho General', 1),
(3, 'VENT-UNI', 'Ventanilla Única de Correspondencia', 'VU', 2, 3, 'Recepción y despacho central de documentos', 1),
(4, 'DIR-JUR', 'Dirección Jurídica', 'DJ', 1, 2, 'Asesoría y dictámenes legales', 1),
(5, 'DIR-ADM', 'Dirección Administrativa Financiera', 'DAF', 1, 2, 'Gestión de recursos humanos, materiales y financieros', 1),
(6, 'UNI-SIS', 'Unidad de Tecnologías de Información y Sistemas', 'UTIC', 5, 3, 'Soporte y desarrollo de sistemas informáticos', 1)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`), `sigla` = VALUES(`sigla`);

-- 3. PERSONA ADMINISTRADOR INICIAL
INSERT INTO `personas` (`id`, `nombres`, `apellido_paterno`, `apellido_materno`, `ci`, `ci_expedido`, `sexo`, `estado_civil`, `telefono`, `email`, `empresa_telefonica`, `direccion`, `activo`) VALUES
(1, 'Administrador', 'Sistema', 'Wayka', '1000001', 'LP', 'M', 'SOLTERO', '70012345', 'admin@wayka.gob.bo', 'ENTEL', 'Oficina Central', 1),
(2, 'María', 'Fernández', 'Rojas', '2000002', 'LP', 'F', 'SOLTERA', '70054321', 'mfernandez@wayka.gob.bo', 'TIGO', 'Av. Central #123', 1),
(3, 'Carlos', 'Mamani', 'Quispe', '3000003', 'LP', 'M', 'CASADO', '70098765', 'cmamani@wayka.gob.bo', 'ENTEL', 'Calle Comercio #456', 1)
ON DUPLICATE KEY UPDATE `nombres` = VALUES(`nombres`), `email` = VALUES(`email`);

-- 4. USUARIOS INICIALES (Contraseña por defecto: admin123 para admin, user123 para otros)
-- Hash bcrypt para 'admin123': $2b$10$wNqg1Fv7oAeoFvx9d/O42uV3h47jJqjL99s4r0d8P2C9o2h8H0V7m
INSERT INTO `usuarios` (`id`, `persona_id`, `login`, `password_hash`, `cargo`, `activo`) VALUES
(1, 1, 'admin', '$2b$10$7Z8VqNf3B3O.C2L5.s9NneK6Qe8Z7nL2hK.xZl9Kq4Vd1jGv8N0K6', 'Administrador Principal', 1),
(2, 2, 'mfernandez', '$2b$10$7Z8VqNf3B3O.C2L5.s9NneK6Qe8Z7nL2hK.xZl9Kq4Vd1jGv8N0K6', 'Responsable de Ventanilla Única', 1),
(3, 3, 'cmamani', '$2b$10$7Z8VqNf3B3O.C2L5.s9NneK6Qe8Z7nL2hK.xZl9Kq4Vd1jGv8N0K6', 'Analista de Sistemas', 1)
ON DUPLICATE KEY UPDATE `login` = VALUES(`login`), `cargo` = VALUES(`cargo`);

-- 5. ASIGNACIÓN USUARIO - ROLES
INSERT INTO `usuario_roles` (`usuario_id`, `rol_id`, `ubicacion_org_id`, `nivel_acceso`, `fecha_expiracion`, `es_principal`, `activo`) VALUES
(1, 1, 6, 'CONTROL_TOTAL', '2030-12-31', 1, 1),
(1, 2, 6, 'CONTROL_TOTAL', '2030-12-31', 0, 1),
(2, 3, 3, 'CONTROL_TOTAL', '2030-12-31', 1, 1),
(3, 4, 6, 'CONTROL_TOTAL', '2030-12-31', 1, 1)
ON DUPLICATE KEY UPDATE `nivel_acceso` = VALUES(`nivel_acceso`);

-- 6. TIPOS DE PROCESO INICIALES
INSERT INTO `tipos_proceso` (`id`, `codigo`, `nombre`, `descripcion`, `tipo_categoria`, `ubicacion_org_id`, `correlativo_seq`, `tiempo_estimado_horas`, `activo`) VALUES
(1, 'SV', 'Solicitud de Vacaciones', 'Trámite interno para la solicitud y aprobación de vacaciones de personal', 'TRAMITE', 5, 0, 48, 1),
(2, 'CM', 'Compra Menor', 'Trámite de adquisición de bienes o servicios menores', 'TRAMITE', 5, 0, 72, 1),
(3, 'CORR-EXT', 'Correspondencia Externa', 'Recepción y derivación de notas, cartas y solicitudes de instituciones externas', 'CORRESPONDENCIA', 3, 0, 24, 1),
(4, 'MEMO', 'Memorándum Interno', 'Comunicaciones oficiales y circulares entre unidades', 'CORRESPONDENCIA', 2, 0, 24, 1)
ON DUPLICATE KEY UPDATE `nombre` = VALUES(`nombre`);

-- 7. PARÁMETROS GENERALES DEL SISTEMA
INSERT INTO `parametros` (`clave`, `valor`, `tipo_dato`, `descripcion`, `editable`) VALUES
('INSTITUCION_NOMBRE', 'Entidad Pública Wayka', 'STRING', 'Nombre oficial de la institución que utiliza el sistema', 1),
('INSTITUCION_SIGLA', 'WAYKA-EP', 'STRING', 'Sigla de la institución', 1),
('GESTION_ACTIVA', '2026', 'INTEGER', 'Gestión fiscal/año calendario activo para trámites', 1),
('FORMATO_CORRELATIVO', '{CODIGO}-{NUMERO}/{GESTION}', 'STRING', 'Plantilla para la generación de la Hoja de Ruta', 1),
('LONGITUD_PIN_MIN', '6', 'INTEGER', 'Longitud mínima de contraseña/PIN', 0),
('LONGITUD_PIN_MAX', '10', 'INTEGER', 'Longitud máxima de contraseña/PIN', 0),
('MAX_ADJUNTOS_SIZE_MB', '25', 'INTEGER', 'Tamaño máximo por archivo adjunto en Megabytes', 1)
ON DUPLICATE KEY UPDATE `valor` = VALUES(`valor`), `descripcion` = VALUES(`descripcion`);
