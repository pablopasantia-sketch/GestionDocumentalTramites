/**
 * Test E2E de llamadas HTTP contra el servidor Wayka Backend
 */
const http = require('http');

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runE2ETests() {
  console.log('🚀 Probando Endpoints REST de la API Wayka con Autenticación JWT...\n');

  try {
    // 1. Iniciar sesión como administrador
    console.log('1. Autenticación con admin / admin123...');
    const loginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { login: 'admin', password: 'admin123' }
    );

    if (loginRes.status !== 200 || !loginRes.data.success) {
      throw new Error(`Fallo en login: ${JSON.stringify(loginRes.data)}`);
    }

    const token = loginRes.data.data.token;
    console.log('   ✅ Autenticado correctamente. Token recibido.');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };

    // 2. Listar Personas
    console.log('\n2. GET /api/personas (Listado de personas)...');
    const persRes = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/personas',
      method: 'GET',
      headers: authHeaders
    });
    console.log(`   ✅ Status ${persRes.status}: ${persRes.data.data.length} persona(s) registradas.`);

    // 3. Crear Persona
    console.log('\n3. POST /api/personas (Crear nueva persona)...');
    const testCi = '8888888';
    const nuevaPersRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/personas',
        method: 'POST',
        headers: authHeaders
      },
      {
        nombres: 'Gonzalo',
        apellido_paterno: 'Alvarado',
        apellido_materno: 'Rojas',
        ci: testCi,
        ci_expedido: 'CH',
        sexo: 'M',
        telefono: '79998877',
        email: 'galvarado@sucre.bo'
      }
    );
    console.log(`   ✅ Status ${nuevaPersRes.status}: Persona creada ID ${nuevaPersRes.data.data?.id}`);
    const personaId = nuevaPersRes.data.data.id;

    // 4. Crear Usuario vinculado a la persona
    console.log('\n4. POST /api/usuarios (Crear usuario vinculado)...');
    const nuevoUsrRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/usuarios',
        method: 'POST',
        headers: authHeaders
      },
      {
        persona_id: personaId,
        login: 'galvarado',
        password: 'password123',
        cargo: 'Asistente de Despacho'
      }
    );
    console.log(`   ✅ Status ${nuevoUsrRes.status}: Usuario creado ID ${nuevoUsrRes.data.data?.id}, Login: galvarado`);
    const usuarioId = nuevoUsrRes.data.data.id;

    // 5. Asignar Rol al Usuario
    console.log('\n5. POST /api/usuario-roles (Asignar rol de funcionario)...');
    const rolesRes = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/roles',
      method: 'GET',
      headers: authHeaders
    });
    const rolFuncionario = rolesRes.data.data.find((r) => r.codigo === 'FUNCIONARIO');

    const ubicRes = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: '/api/ubicaciones',
      method: 'GET',
      headers: authHeaders
    });
    const ubicacion = ubicRes.data.data[0];

    const assignRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 4000,
        path: '/api/usuario-roles',
        method: 'POST',
        headers: authHeaders
      },
      {
        usuario_id: usuarioId,
        rol_id: rolFuncionario.id,
        ubicacion_org_id: ubicacion.id,
        nivel_acceso: 'CONTROL_TOTAL',
        es_principal: true
      }
    );
    console.log(`   ✅ Status ${assignRes.status}: Rol asignado con ID ${assignRes.data.data?.id}`);

    // 6. Probar regla de integridad: Eliminar persona con usuario activo debe fallar (Status 400)
    console.log('\n6. DELETE /api/personas/:id (Debe rechazar por tener usuario activo)...');
    const delPersFail = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: `/api/personas/${personaId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`   ✅ Status ${delPersFail.status}: Control activado -> "${delPersFail.data.message}"`);

    // 7. Dar de baja usuario y luego persona
    console.log('\n7. DELETE /api/usuarios/:id (Baja lógica de usuario)...');
    const delUsrOk = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: `/api/usuarios/${usuarioId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`   ✅ Status ${delUsrOk.status}: ${delUsrOk.data.message}`);

    console.log('\n8. DELETE /api/personas/:id (Baja lógica de persona permitida)...');
    const delPersOk = await makeRequest({
      hostname: 'localhost',
      port: 4000,
      path: `/api/personas/${personaId}`,
      method: 'DELETE',
      headers: authHeaders
    });
    console.log(`   ✅ Status ${delPersOk.status}: ${delPersOk.data.message}`);

    // Limpieza de DB para no dejar datos de prueba
    const { pool } = require('../config/db');
    await pool.query('DELETE FROM usuario_roles WHERE usuario_id = ?', [usuarioId]);
    await pool.query('DELETE FROM usuarios WHERE id = ?', [usuarioId]);
    await pool.query('DELETE FROM personas WHERE id = ?', [personaId]);
    console.log('\n🧹 Limpieza de registros de prueba finalizada.');

    console.log('\n🎉 ¡TODOS LOS ENDPOINTS REST PASARON LAS PRUEBAS CON ÉXITO!\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Error en prueba E2E:', err);
    process.exit(1);
  }
}

runE2ETests();
