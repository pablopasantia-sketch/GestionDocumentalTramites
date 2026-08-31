const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/db');

async function seedDb() {
  console.log('🌱 Sembrando datos iniciales en la Base de Datos Wayka...');

  try {
    const health = await testConnection();
    if (!health.connected) {
      throw new Error(`No se pudo conectar a la base de datos: ${health.message}`);
    }

    // 1. Roles del Sistema
    console.log('🔹 Insertando roles del sistema...');
    const roles = [
      { id: 1, codigo: 'ADMIN_SISTEMA', nombre: 'Administrador de Sistema', descripcion: 'Gestión de usuarios, personas, organigrama y parámetros base del sistema' },
      { id: 2, codigo: 'ADMIN_WAYKA', nombre: 'Administrador de Wayka', descripcion: 'Gestión operativa de trámites, anulación, redirección y reportes de transparencia' },
      { id: 3, codigo: 'VENTANILLA_UNICA', nombre: 'Ventanilla Única', descripcion: 'Recepción de trámites, registro de correspondencias, emisión de hojas de ruta y bloqueo' },
      { id: 4, codigo: 'FUNCIONARIO', nombre: 'Funcionario', descripcion: 'Atención de trámites, proveídos, adjuntos y derivación en escritorio virtual' }
    ];

    for (const r of roles) {
      await pool.query(`
        INSERT INTO roles (id, codigo, nombre, descripcion, activo)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion);
      `, [r.id, r.codigo, r.nombre, r.descripcion]);
    }

    // 2. Ubicaciones Orgánicas (Organigrama)
    console.log('🔹 Insertando organigrama base (ubicaciones orgánicas)...');
    const ubicaciones = [
      { id: 1, codigo: 'DIR-GEN', nombre: 'Dirección General Ejecutiva', sigla: 'DGE', padre_id: null, nivel: 1, descripcion: 'Máxima Autoridad Ejecutiva' },
      { id: 2, codigo: 'SEC-GEN', nombre: 'Secretaría General', sigla: 'SG', padre_id: 1, nivel: 2, descripcion: 'Secretaría y Despacho General' },
      { id: 3, codigo: 'VENT-UNI', nombre: 'Ventanilla Única de Correspondencia', sigla: 'VU', padre_id: 2, nivel: 3, descripcion: 'Recepción y despacho central' },
      { id: 4, codigo: 'DIR-JUR', nombre: 'Dirección Jurídica', sigla: 'DJ', padre_id: 1, nivel: 2, descripcion: 'Asesoría y dictámenes legales' },
      { id: 5, codigo: 'DIR-ADM', nombre: 'Dirección Administrativa Financiera', sigla: 'DAF', padre_id: 1, nivel: 2, descripcion: 'Gestión administrativa y financiera' },
      { id: 6, codigo: 'UNI-SIS', 'nombre': 'Unidad de Tecnologías y Sistemas', sigla: 'UTIC', padre_id: 5, nivel: 3, descripcion: 'Sistemas y soporte tecnológico' }
    ];

    for (const u of ubicaciones) {
      await pool.query(`
        INSERT INTO ubicaciones_org (id, codigo, nombre, sigla, padre_id, nivel, descripcion, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), sigla = VALUES(sigla), padre_id = VALUES(padre_id), nivel = VALUES(nivel);
      `, [u.id, u.codigo, u.nombre, u.sigla, u.padre_id, u.nivel, u.descripcion]);
    }

    // 3. Personas Iniciales
    console.log('🔹 Insertando personas de prueba...');
    const personas = [
      { id: 1, nombres: 'Administrador', ap_pat: 'Sistema', ap_mat: 'Wayka', ci: '1000001', exp: 'LP', sexo: 'M', ec: 'SOLTERO', tel: '70012345', email: 'admin@wayka.gob.bo', emp: 'ENTEL' },
      { id: 2, nombres: 'María', ap_pat: 'Fernández', ap_mat: 'Rojas', ci: '2000002', exp: 'LP', sexo: 'F', ec: 'SOLTERA', tel: '70054321', email: 'mfernandez@wayka.gob.bo', emp: 'TIGO' },
      { id: 3, nombres: 'Carlos', ap_pat: 'Mamani', ap_mat: 'Quispe', ci: '3000003', exp: 'LP', sexo: 'M', ec: 'CASADO', tel: '70098765', email: 'cmamani@wayka.gob.bo', emp: 'ENTEL' }
    ];

    for (const p of personas) {
      await pool.query(`
        INSERT INTO personas (id, nombres, apellido_paterno, apellido_materno, ci, ci_expedido, sexo, estado_civil, telefono, email, empresa_telefonica, activo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE nombres = VALUES(nombres), email = VALUES(email), telefono = VALUES(telefono);
      `, [p.id, p.nombres, p.ap_pat, p.ap_mat, p.ci, p.exp, p.sexo, p.ec, p.tel, p.email, p.emp]);
    }

    // 4. Usuarios con Contraseñas Hasheadas con BCrypt
    console.log('🔹 Insertando usuarios con hash bcrypt seguro...');
    const defaultPassword = 'password123'; // Clave por defecto para desarrollo
    const adminPassword = 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    const userHash = await bcrypt.hash(defaultPassword, 10);

    const usuarios = [
      { id: 1, persona_id: 1, login: 'admin', pass: adminHash, cargo: 'Administrador General' },
      { id: 2, persona_id: 2, login: 'mfernandez', pass: userHash, cargo: 'Responsable Ventanilla Única' },
      { id: 3, persona_id: 3, login: 'cmamani', pass: userHash, cargo: 'Analista de Sistemas' }
    ];

    for (const usr of usuarios) {
      await pool.query(`
        INSERT INTO usuarios (id, persona_id, login, password_hash, cargo, activo)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), cargo = VALUES(cargo);
      `, [usr.id, usr.persona_id, usr.login, usr.pass, usr.cargo]);
    }

    // 5. Asignación Usuario - Roles
    console.log('🔹 Asignando roles a los usuarios...');
    const usuarioRoles = [
      { usr: 1, rol: 1, ubi: 6, acceso: 'CONTROL_TOTAL', principal: 1 }, // Admin -> Admin Sistema
      { usr: 1, rol: 2, ubi: 6, acceso: 'CONTROL_TOTAL', principal: 0 }, // Admin -> Admin Wayka
      { usr: 2, rol: 3, ubi: 3, acceso: 'CONTROL_TOTAL', principal: 1 }, // mfernandez -> Ventanilla Única
      { usr: 3, rol: 4, ubi: 6, acceso: 'CONTROL_TOTAL', principal: 1 }  // cmamani -> Funcionario
    ];

    for (const ur of usuarioRoles) {
      await pool.query(`
        INSERT INTO usuario_roles (usuario_id, rol_id, ubicacion_org_id, nivel_acceso, fecha_expiracion, es_principal, activo)
        VALUES (?, ?, ?, ?, '2030-12-31', ?, 1)
        ON DUPLICATE KEY UPDATE nivel_acceso = VALUES(nivel_acceso), es_principal = VALUES(es_principal);
      `, [ur.usr, ur.rol, ur.ubi, ur.acceso, ur.principal]);
    }

    // 6. Tipos de Proceso
    console.log('🔹 Insertando tipos de proceso base...');
    const procesos = [
      { id: 1, codigo: 'SV', nombre: 'Solicitud de Vacaciones', desc: 'Trámite interno de RRHH para solicitud de vacaciones', cat: 'TRAMITE', ubi: 5, horas: 48 },
      { id: 2, codigo: 'CM', nombre: 'Compra Menor', desc: 'Adquisición de bienes o servicios menores', cat: 'TRAMITE', ubi: 5, horas: 72 },
      { id: 3, codigo: 'CORR-EXT', nombre: 'Correspondencia Externa', desc: 'Recepción y derivación de notas institucionales', cat: 'CORRESPONDENCIA', ubi: 3, horas: 24 },
      { id: 4, codigo: 'MEMO', nombre: 'Memorándum Interno', desc: 'Comunicaciones internas oficiales entre unidades', cat: 'CORRESPONDENCIA', ubi: 2, horas: 24 }
    ];

    for (const proc of procesos) {
      await pool.query(`
        INSERT INTO tipos_proceso (id, codigo, nombre, descripcion, tipo_categoria, ubicacion_org_id, correlativo_seq, tiempo_estimado_horas, activo)
        VALUES (?, ?, ?, ?, ?, ?, 0, ?, 1)
        ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), descripcion = VALUES(descripcion), tiempo_estimado_horas = VALUES(tiempo_estimado_horas);
      `, [proc.id, proc.codigo, proc.nombre, proc.desc, proc.cat, proc.ubi, proc.horas]);
    }

    // 7. Parámetros del Sistema
    console.log('🔹 Insertando parámetros del sistema...');
    const params = [
      { clave: 'INSTITUCION_NOMBRE', valor: 'Entidad Pública Wayka', tipo: 'STRING', desc: 'Nombre de la entidad' },
      { clave: 'INSTITUCION_SIGLA', valor: 'WAYKA-EP', tipo: 'STRING', desc: 'Sigla institucional' },
      { clave: 'GESTION_ACTIVA', valor: '2026', tipo: 'INTEGER', desc: 'Gestión fiscal activa' },
      { clave: 'FORMATO_CORRELATIVO', valor: '{CODIGO}-{NUMERO}/{GESTION}', tipo: 'STRING', desc: 'Plantilla Hoja de Ruta' },
      { clave: 'LONGITUD_PIN_MIN', valor: '6', tipo: 'INTEGER', desc: 'Longitud mínima PIN' },
      { clave: 'LONGITUD_PIN_MAX', valor: '10', tipo: 'INTEGER', desc: 'Longitud máxima PIN' },
      { clave: 'MAX_ADJUNTOS_SIZE_MB', valor: '25', tipo: 'INTEGER', desc: 'Tamaño máximo adjuntos en MB' }
    ];

    for (const p of params) {
      await pool.query(`
        INSERT INTO parametros (clave, valor, tipo_dato, descripcion, editable)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE valor = VALUES(valor), descripcion = VALUES(descripcion);
      `, [p.clave, p.valor, p.tipo, p.desc]);
    }

    console.log('\n🎉 ¡Sembrado de datos iniciales completado exitosamente!');
    console.log('📌 Usuarios disponibles para prueba:');
    console.log('   - admin / admin123 (Roles: Admin de Sistema, Admin de Wayka)');
    console.log('   - mfernandez / password123 (Rol: Ventanilla Única)');
    console.log('   - cmamani / password123 (Rol: Funcionario)');
  } catch (error) {
    console.error('\n❌ Error al sembrar datos iniciales:', error.message);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  seedDb().then(() => process.exit(0));
}

module.exports = seedDb;
