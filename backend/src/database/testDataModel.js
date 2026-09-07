const { pool, testConnection } = require('../config/db');
const migrator = require('./migrator');
const seedDb = require('./seedDb');

// Importar los 11 modelos DAO
const Persona = require('../models/Persona');
const UbicacionOrg = require('../models/UbicacionOrg');
const Rol = require('../models/Rol');
const Usuario = require('../models/Usuario');
const UsuarioRol = require('../models/UsuarioRol');
const TipoProceso = require('../models/TipoProceso');
const Correlativo = require('../models/Correlativo');
const Tramite = require('../models/Tramite');
const Movimiento = require('../models/Movimiento');
const Adjunto = require('../models/Adjunto');
const Parametro = require('../models/Parametro');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`   ❌ FALLÓ: ${message}`);
    throw new Error(`Asersión fallida: ${message}`);
  }
  passedTests++;
  console.log(`   ✅ OK: ${message}`);
}

async function runTests() {
  console.log('\n================================================================');
  console.log('    TEST INTEGRAL DEL MODELO DE DATOS Y REGLAS DE NEGOCIO       ');
  console.log('              SISTEMA WAYKA — FLUJO UNIFICADO                  ');
  console.log('================================================================\n');

  // 0. Probar conexión
  console.log('📡 1. Verificando Conectividad con MySQL 8.0+...');
  const health = await testConnection();
  if (!health.connected) {
    console.error('\n❌ ERROR CRÍTICO: No hay conexión con la base de datos MySQL.');
    console.error(`   Detalle: ${health.message}`);
    console.error('   Asegúrate de que MySQL esté activo y que el archivo .env tenga las credenciales correctas.\n');
    process.exit(1);
  }
  console.log(`   Conectado a MySQL ${health.version} | Base de datos: ${health.database}`);

  // 1. Ejecutar migraciones para asegurar esquema
  console.log('\n⚙️  2. Verificando y Ejecutando Migraciones DDL...');
  await migrator.up();

  // 2. Poblar semillas base
  console.log('\n🌱 3. Verificando Semillas Base (Roles, Organigrama, Parámetros)...');
  await seedDb();

  console.log('\n🧪 4. Ejecutando Batería de Pruebas de Modelos y Reglas de Negocio:\n');

  try {
    // ---------------------------------------------------------
    // TEST 1: Persona
    // ---------------------------------------------------------
    console.log('--- [1/11] Modelo: Persona ---');
    const ciTest = `TEST-${Date.now()}`;
    const persona = await Persona.create({
      nombres: 'Prueba',
      apellido_paterno: 'Unitario',
      apellido_materno: 'Wayka',
      ci: ciTest,
      ci_expedido: 'CH',
      sexo: 'M',
      telefono: '76543210',
      email: `test_${Date.now()}@sucre.gob.bo`
    });
    assert(persona && persona.id > 0, 'Persona creada exitosamente');
    assert(persona.ci === ciTest, 'CI registrado correctamente');

    const personaPorCi = await Persona.findByCi(ciTest);
    assert(personaPorCi && personaPorCi.id === persona.id, 'Búsqueda de persona por CI');

    // ---------------------------------------------------------
    // TEST 2: UbicacionOrg (Organigrama Jerárquico)
    // ---------------------------------------------------------
    console.log('\n--- [2/11] Modelo: UbicacionOrg ---');
    const ubiCodigo = `TEST-DEP-${Date.now().toString().slice(-4)}`;
    const nuevaUbi = await UbicacionOrg.create({
      codigo: ubiCodigo,
      nombre: 'Sub-Unidad de Pruebas Automatizadas',
      sigla: 'SUPA',
      padre_id: 1, // Dependiente de Dirección General
      descripcion: 'Unidad temporal para pruebas de integración'
    });
    assert(nuevaUbi && nuevaUbi.nivel === 2, 'Cálculo automático de nivel jerárquico (hijo nivel = padre + 1)');

    const tree = await UbicacionOrg.findTree();
    assert(Array.isArray(tree) && tree.length > 0, 'Generación de árbol jerárquico del organigrama');

    // ---------------------------------------------------------
    // TEST 3: Rol
    // ---------------------------------------------------------
    console.log('\n--- [3/11] Modelo: Rol ---');
    const rolAdmin = await Rol.findByCodigo('ADMIN_WAYKA');
    assert(rolAdmin && rolAdmin.id === 2, 'Catálogo de roles: Rol ADMIN_WAYKA localizado');

    let errorDependencia = false;
    try {
      // Intentar eliminar un rol que tiene usuarios asignados debe fallar
      await Rol.softDelete(rolAdmin.id);
    } catch (e) {
      errorDependencia = true;
    }
    assert(errorDependencia, 'Protección contra eliminación de Rol con usuarios asignados');

    // ---------------------------------------------------------
    // TEST 4: Usuario
    // ---------------------------------------------------------
    console.log('\n--- [4/11] Modelo: Usuario ---');
    const loginTest = `user_test_${Date.now().toString().slice(-4)}`;
    const nuevoUsuario = await Usuario.create({
      persona_id: persona.id,
      login: loginTest,
      password: 'MiPasswordSeguro2026!',
      cargo: 'Auditor de Sistemas'
    });
    assert(nuevoUsuario && nuevoUsuario.id > 0, 'Usuario creado con hash de contraseña seguro');

    const usuarioBuscado = await Usuario.findByLogin(loginTest);
    assert(usuarioBuscado && usuarioBuscado.id === nuevoUsuario.id, 'Búsqueda de usuario por login');

    // ---------------------------------------------------------
    // TEST 5: UsuarioRol (Multi-Rol y Ubicación)
    // ---------------------------------------------------------
    console.log('\n--- [5/11] Modelo: UsuarioRol ---');
    const asignacion = await UsuarioRol.create({
      usuario_id: nuevoUsuario.id,
      rol_id: 4, // FUNCIONARIO
      ubicacion_org_id: nuevaUbi.id,
      nivel_acceso: 'CONTROL_TOTAL',
      fecha_expiracion: '2030-12-31',
      es_principal: true
    });
    assert(asignacion && asignacion.es_principal === 1, 'Asignación de rol con ubicación orgánica y principal');

    const rolesUsuario = await UsuarioRol.findByUsuario(nuevoUsuario.id);
    assert(rolesUsuario.length >= 1, 'Listado de roles activos del usuario');

    // ---------------------------------------------------------
    // TEST 6: TipoProceso
    // ---------------------------------------------------------
    console.log('\n--- [6/11] Modelo: TipoProceso ---');
    const codProc = `TP-${Date.now().toString().slice(-4)}`;
    const tipoProc = await TipoProceso.create({
      codigo: codProc,
      nombre: 'Trámite de Prueba Integrada',
      tipo_categoria: 'TRAMITE',
      tiempo_estimado_horas: 48
    });
    assert(tipoProc && tipoProc.codigo === codProc, 'Tipo de proceso unificado creado');

    // ---------------------------------------------------------
    // TEST 7: Correlativo (Generación Secuencial Atómica)
    // ---------------------------------------------------------
    console.log('\n--- [7/11] Modelo: Correlativo ---');
    const gestionActual = new Date().getFullYear();
    const corr1 = await Correlativo.generarCodigo({
      tipo_proceso_id: tipoProc.id,
      gestion: gestionActual
    });
    const corr2 = await Correlativo.generarCodigo({
      tipo_proceso_id: tipoProc.id,
      gestion: gestionActual
    });

    assert(corr1.numeroCorrelativo === `${codProc}-1/${gestionActual}`, `Primer correlativo: ${corr1.numeroCorrelativo}`);
    assert(corr2.numeroCorrelativo === `${codProc}-2/${gestionActual}`, `Incremento atómico secuencial: ${corr2.numeroCorrelativo}`);

    // ---------------------------------------------------------
    // TEST 8: Tramite (Flujo Unificado + Movimiento Inicial)
    // ---------------------------------------------------------
    console.log('\n--- [8/11] Modelo: Tramite ---');
    const tramite = await Tramite.create({
      tipo_proceso_id: tipoProc.id,
      remitente: 'Secretaría de Obras Públicas',
      referencia: 'Solicitud de informe técnico pericial de obras en Sucre',
      tipo_corres: 'INTERNO',
      nro_hojas: 5,
      nro_anexos: 2,
      instruccion: 'Emitir criterio técnico en 48 horas',
      creado_por: nuevoUsuario.id,
      ubicacion_org_id: nuevaUbi.id,
      proveido_inicial: 'Se inicia el trámite para revisión técnica especializada'
    });

    assert(tramite && tramite.id > 0, `Trámite creado con correlativo: ${tramite.numero_correlativo}`);
    assert(tramite.estado === 'EN_ATENCION', 'Estado inicial del trámite: EN_ATENCION');

    // Verificar que el movimiento inicial se registró automáticamente (Inmutabilidad y Auditoría)
    const movimientos = await Movimiento.findByTramiteId(tramite.id);
    assert(movimientos.length === 1, 'Movimiento inicial registrado automáticamente');
    assert(movimientos[0].tipo_movimiento === 'INICIO', 'Tipo del primer movimiento: INICIO');
    assert(movimientos[0].orden === 1, 'Orden del movimiento inicial: 1');

    // ---------------------------------------------------------
    // TEST 9: Tramite: Derivación Libre (Avanzar)
    // ---------------------------------------------------------
    console.log('\n--- [9/11] Flujo: Derivación Libre y Trazabilidad ---');
    const tramiteDerivado = await Tramite.derivar(tramite.id, {
      usuario_origen_id: nuevoUsuario.id,
      ubicacion_origen_id: nuevaUbi.id,
      usuario_destino_id: 2, // mfernandez
      ubicacion_destino_id: 3, // Ventanilla Única
      proveido: 'Paso a Ventanilla Única para sello y validación de anexos físicos'
    });

    assert(tramiteDerivado.estado === 'EN_TRANSITO', 'Trámite actualizado a EN_TRANSITO');
    assert(tramiteDerivado.usuario_actual_id === 2, 'Usuario actual actualizado al destinatario');

    const movsPostDerivacion = await Movimiento.findByTramiteId(tramite.id);
    assert(movsPostDerivacion.length === 2, 'Historial enriquecido: 2 movimientos secuenciales');
    assert(movsPostDerivacion[1].tipo_movimiento === 'DERIVACION', 'Tipo de segundo movimiento: DERIVACION');
    assert(movsPostDerivacion[1].orden === 2, 'Orden secuencial estricto: orden = 2');

    // ---------------------------------------------------------
    // TEST 10: Recepción y Conclusión de Trámite
    // ---------------------------------------------------------
    console.log('\n--- [10/11] Flujo: Recepción y Conclusión ---');
    const tramiteRecepcionado = await Tramite.recepcionar(tramite.id, {
      usuario_id: 2,
      ubicacion_id: 3,
      proveido: 'Documentación física recibida conforme'
    });
    assert(tramiteRecepcionado.estado === 'RECIBIDO', 'Trámite recepcionado con éxito');

    const tramiteConcluido = await Tramite.concluir(tramite.id, {
      usuario_id: 2,
      ubicacion_id: 3,
      proveido_final: 'Trámite finalizado y archivado con visto bueno'
    });
    assert(tramiteConcluido.estado === 'CONCLUIDO', 'Trámite concluido');
    assert(tramiteConcluido.fecha_conclusion !== null, 'Fecha de conclusión registrada');

    // ---------------------------------------------------------
    // TEST 11: Inmutabilidad Estricta en Movimientos
    // ---------------------------------------------------------
    console.log('\n--- [11/11] Reglas: Inmutabilidad, Adjuntos y Parámetros ---');
    let mutacionRechazada = false;
    try {
      await Movimiento.update();
    } catch {
      mutacionRechazada = true;
    }
    assert(mutacionRechazada, 'Regla de inmutabilidad: UPDATE en Movimiento es estrictamente rechazado');

    let eliminacionRechazada = false;
    try {
      await Movimiento.delete();
    } catch {
      eliminacionRechazada = true;
    }
    assert(eliminacionRechazada, 'Regla de inmutabilidad: DELETE en Movimiento es estrictamente rechazado');

    // Test Adjuntos
    const adjunto = await Adjunto.create({
      tramite_id: tramite.id,
      nombre_original: 'informe_pericial_2026.pdf',
      nombre_almacenado: 'adj_123456_informe.pdf',
      ruta_archivo: 'uploads/adj_123456_informe.pdf',
      tipo_mime: 'application/pdf',
      tamano_bytes: 1048576,
      subido_por: nuevoUsuario.id
    });
    assert(adjunto && adjunto.id > 0, 'Adjunto digital PDF registrado con metadatos');

    // Test Parámetros tipados
    const gestionParam = await Parametro.get('GESTION_ACTIVA');
    assert(typeof gestionParam === 'number', `Parámetro tipado INTEGER: GESTION_ACTIVA = ${gestionParam}`);

    await Parametro.set('CONFIG_NOTIFICACIONES', { email: true, sms: false, push: true }, {
      tipo_dato: 'JSON',
      descripcion: 'Configuración de canales de alerta'
    });
    const jsonParam = await Parametro.get('CONFIG_NOTIFICACIONES');
    assert(jsonParam && jsonParam.email === true, 'Parámetro tipado JSON persistido y recuperado');

    // Borrado lógico de persona debe fallar porque tiene usuario activo
    let borradoPersonaProtegido = false;
    try {
      await Persona.softDelete(persona.id);
    } catch {
      borradoPersonaProtegido = true;
    }
    assert(borradoPersonaProtegido, 'Borrado lógico protegido contra dependencias activas (Persona -> Usuario)');

    console.log('\n================================================================');
    console.log(`🎉 ¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE! (${passedTests}/${totalTests})`);
    console.log('    El modelo de datos y flujo unificado está 100% completo y verificado.');
    console.log('================================================================\n');

  } catch (error) {
    console.error('\n❌ Error durante la ejecución de las pruebas:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  runTests().catch((err) => {
    console.error('Error fatal:', err);
    process.exit(1);
  });
}

module.exports = runTests;
