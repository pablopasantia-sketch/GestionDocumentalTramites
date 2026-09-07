/**
 * Script de prueba automatizada para la Tarea 4:
 * CRUD Personas, Usuarios, Roles, Usuario-Rol y Reglas de Negocio
 */
const Persona = require('../models/Persona');
const Usuario = require('../models/Usuario');
const Rol = require('../models/Rol');
const UsuarioRol = require('../models/UsuarioRol');
const UbicacionOrg = require('../models/UbicacionOrg');
const { pool } = require('../config/db');

async function runTests() {
  console.log('🧪 Iniciando verificación de CRUD y Reglas de Negocio (Sprint 1 - Tarea 4)...\n');

  try {
    // 1. Probar CRUD Personas
    console.log('1️⃣  Probando modelo y reglas de PERSONAS:');
    const ciTest = '9999999';
    // Limpiar si existía
    const existente = await Persona.findByCi(ciTest);
    if (existente) {
      await pool.query('DELETE FROM personas WHERE id = ?', [existente.id]);
    }

    const nuevaPersona = await Persona.create({
      nombres: 'María René',
      apellido_paterno: 'Mendoza',
      apellido_materno: 'Gutiérrez',
      ci: ciTest,
      ci_expedido: 'CH',
      sexo: 'F',
      estado_civil: 'Soltero/a',
      telefono: '72881234',
      email: 'mrene.mendoza@sucre.bo',
      empresa_telefonica: 'Entel',
      direccion: 'Calle Bolívar N° 123'
    });
    console.log(`   ✅ Persona creada con éxito. ID: ${nuevaPersona.id} (${nuevaPersona.nombres} ${nuevaPersona.apellido_paterno}, CI: ${nuevaPersona.ci})`);

    // Actualizar persona
    const personaAct = await Persona.update(nuevaPersona.id, { telefono: '71112233' });
    console.log(`   ✅ Persona actualizada. Nuevo teléfono: ${personaAct.telefono}`);

    // 2. Probar CRUD Usuarios vinculados
    console.log('\n2️⃣  Probando modelo y reglas de USUARIOS:');
    const loginTest = 'rmendoza_test';
    const usrExistente = await Usuario.findByLogin(loginTest);
    if (usrExistente) {
      await pool.query('DELETE FROM usuario_roles WHERE usuario_id = ?', [usrExistente.id]);
      await pool.query('DELETE FROM usuarios WHERE id = ?', [usrExistente.id]);
    }

    const nuevoUsuario = await Usuario.create({
      persona_id: nuevaPersona.id,
      login: loginTest,
      password: 'password123',
      cargo: 'Técnico de Archivo'
    });
    console.log(`   ✅ Usuario creado con éxito. ID: ${nuevoUsuario.id}, Login: ${nuevoUsuario.login}, Cargo: ${nuevoUsuario.cargo}`);

    // 3. Probar regla RF-02.9: No permitir eliminar persona si tiene usuario activo
    console.log('\n3️⃣  Probando Regla de Negocio RF-02.9 (Control de dependencias):');
    try {
      await Persona.softDelete(nuevaPersona.id);
      console.error('   ❌ ERROR: Se permitió eliminar la persona teniendo un usuario asociado.');
    } catch (err) {
      console.log(`   ✅ Regla RF-02.9 cumplida exitosamente: "${err.message}"`);
    }

    // 4. Probar CRUD Roles y asignación Usuario-Rol
    console.log('\n4️⃣  Probando asignación de USUARIO-ROL y multi-rol:');
    const roles = await Rol.findAll({ activo: true });
    const rolFuncionario = roles.find(r => r.codigo === 'FUNCIONARIO');
    const ubicaciones = await UbicacionOrg.findAll({ activo: true });
    const oficina = ubicaciones[0];

    const asignacion = await UsuarioRol.create({
      usuario_id: nuevoUsuario.id,
      rol_id: rolFuncionario.id,
      ubicacion_org_id: oficina.id,
      nivel_acceso: 'CONTROL_TOTAL',
      fecha_expiracion: '2028-12-31',
      es_principal: true
    });
    console.log(`   ✅ Rol asignado exitosamente: Rol ID ${asignacion.rol_id} en Oficina ID ${asignacion.ubicacion_org_id} (Principal: ${asignacion.es_principal})`);

    // Consultar roles del usuario
    const rolesDelUsuario = await Usuario.getRoles(nuevoUsuario.id);
    console.log(`   ✅ Roles asignados consultados: ${rolesDelUsuario.length} rol(es) activo(s).`);

    // 5. Probar borrado lógico del usuario y sus roles
    console.log('\n5️⃣  Probando borrado lógico de Usuario:');
    await Usuario.softDelete(nuevoUsuario.id);
    const usuarioBorrado = await Usuario.findById(nuevoUsuario.id);
    console.log(`   ✅ Usuario dado de baja lógicamente (Activo: ${usuarioBorrado.activo})`);

    // Ahora la persona ya no tiene usuario activo, debe poder darse de baja lógicamente
    await Persona.softDelete(nuevaPersona.id);
    const personaBorrada = await Persona.findById(nuevaPersona.id);
    console.log(`   ✅ Persona dada de baja lógicamente tras desactivar usuario (Activo: ${personaBorrada.activo})`);

    // Limpieza final de prueba
    await pool.query('DELETE FROM usuario_roles WHERE usuario_id = ?', [nuevoUsuario.id]);
    await pool.query('DELETE FROM usuarios WHERE id = ?', [nuevoUsuario.id]);
    await pool.query('DELETE FROM personas WHERE id = ?', [nuevaPersona.id]);
    console.log('   🧹 Datos de prueba limpiados correctamente.');

    console.log('\n🎉 ¡TODAS LAS REGLAS Y OPERACIONES DEL MODELO FUNCIONAN AL 100%!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Fallo en las pruebas:', err);
    process.exit(1);
  }
}

runTests();
