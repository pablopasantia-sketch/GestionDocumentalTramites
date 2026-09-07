const bcrypt = require('bcryptjs');
const { pool, testConnection } = require('../config/db');
const { generateToken, verifyToken } = require('../utils/jwt');
const request = require('http');
const app = require('../app');

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

/**
 * Helper para hacer peticiones HTTP al servidor Express de prueba
 */
function makeRequest(serverPort, path, method = 'GET', body = null, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (postData) {
      headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = request.request({
      hostname: '127.0.0.1',
      port: serverPort,
      path: `/api/auth${path}`,
      method,
      headers
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('\n================================================================');
  console.log('       TEST AUTOMATIZADO: AUTENTICACIÓN JWT Y SESIÓN            ');
  console.log('              SISTEMA WAYKA — SPRINT 1 (RF-01)                  ');
  console.log('================================================================\n');

  // 1. Verificar conexión a base de datos
  const health = await testConnection();
  if (!health.connected) {
    console.error('❌ Base de datos no conectada');
    process.exit(1);
  }

  // 2. Iniciar servidor Express en puerto dinámico para pruebas
  const server = await new Promise((resolve) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
  });
  const port = server.address().port;

  try {
    // TEST 1: Login con credenciales válidas (admin)
    console.log('--- [1/6] Login con Credenciales Válidas (admin) ---');
    const loginRes = await makeRequest(port, '/login', 'POST', {
      login: 'admin',
      password: 'admin123'
    });
    assert(loginRes.status === 200, 'HTTP 200 al iniciar sesión con credenciales correctas');
    assert(loginRes.data.success === true, 'Respuesta success: true');
    assert(typeof loginRes.data.data.token === 'string', 'Token JWT generado en la respuesta');
    assert(loginRes.data.data.user.username === 'admin', 'Datos de usuario retornados correctamente');
    assert(loginRes.data.data.user.activeRole.rol_codigo === 'ADMIN_SISTEMA', 'Rol principal asignado por defecto (ADMIN_SISTEMA)');

    const adminToken = loginRes.data.data.token;

    // TEST 2: Rechazo de credenciales incorrectas
    console.log('\n--- [2/6] Validación de Credenciales Inválidas ---');
    const badPassRes = await makeRequest(port, '/login', 'POST', {
      login: 'admin',
      password: 'claveIncorrecta999'
    });
    assert(badPassRes.status === 401, 'HTTP 401 ante contraseña errónea');
    assert(badPassRes.data.success === false, 'Acceso denegado');

    const notFoundUserRes = await makeRequest(port, '/login', 'POST', {
      login: 'usuario_no_existe_2026',
      password: 'password123'
    });
    assert(notFoundUserRes.status === 401, 'HTTP 401 ante usuario inexistente');

    // TEST 3: Acceso a ruta protegida con JWT (/profile)
    console.log('\n--- [3/6] Verificación de Token JWT en Rutas Protegidas ---');
    const profileRes = await makeRequest(port, '/profile', 'GET', null, adminToken);
    assert(profileRes.status === 200, 'Acceso concedido a /profile con Bearer Token válido');
    assert(profileRes.data.data.user.login === 'admin', 'Perfil recuperado con éxito');

    const noTokenRes = await makeRequest(port, '/profile', 'GET', null, null);
    assert(noTokenRes.status === 401, 'Acceso rechazado (HTTP 401) sin token Authorization');

    const badTokenRes = await makeRequest(port, '/profile', 'GET', null, 'token_invalido_xyz');
    assert(badTokenRes.status === 401, 'Acceso rechazado (HTTP 401) con token manipulado');

    // TEST 4: Cambio dinámico de rol (Multi-Rol)
    console.log('\n--- [4/6] Soporte Multi-Rol: Alternar Rol Activo (switchRole) ---');
    const switchRes = await makeRequest(port, '/switch-role', 'POST', {
      rolId: 2, // ADMIN_WAYKA
      ubicacionOrgId: 6 // UTIC
    }, adminToken);

    assert(switchRes.status === 200, 'HTTP 200 al cambiar rol activo a ADMIN_WAYKA');
    assert(switchRes.data.data.activeRole.rol_codigo === 'ADMIN_WAYKA', 'Nuevo rol activo verificado: ADMIN_WAYKA');
    
    // Verificar que el nuevo token decodifica con el nuevo rol
    const newTokenDecoded = verifyToken(switchRes.data.data.token);
    assert(newTokenDecoded.roleCode === 'ADMIN_WAYKA', 'Token JWT actualizado firmado con nuevo rol');

    // TEST 5: Cambio de contraseña con validación de PIN (RF-01.3)
    console.log('\n--- [5/6] Cambio de Contraseña y Reglas de PIN ---');
    
    // Falla por contraseña actual errónea
    const badCurrentRes = await makeRequest(port, '/change-password', 'POST', {
      currentPassword: 'claveMala123',
      newPassword: 'NuevaClave2026'
    }, adminToken);
    assert(badCurrentRes.status === 400, 'Rechazo cuando la clave actual no coincide');

    // Falla por clave demasiado corta (< 6 caracteres)
    const shortPassRes = await makeRequest(port, '/change-password', 'POST', {
      currentPassword: 'admin123',
      newPassword: 'abc1'
    }, adminToken);
    assert(shortPassRes.status === 400, 'Rechazo cuando la nueva clave tiene menos de 6 caracteres');

    // Falla si no combina letras con números
    const noNumberPassRes = await makeRequest(port, '/change-password', 'POST', {
      currentPassword: 'admin123',
      newPassword: 'sololetras'
    }, adminToken);
    assert(noNumberPassRes.status === 400, 'Rechazo si la nueva clave no contiene números');

    // Cambio exitoso con PIN seguro alfanumérico
    const changeOkRes = await makeRequest(port, '/change-password', 'POST', {
      currentPassword: 'admin123',
      newPassword: 'Admin2026',
      confirmPassword: 'Admin2026'
    }, adminToken);
    assert(changeOkRes.status === 200, 'Contraseña cambiada exitosamente a "Admin2026"');

    // Verificar que la nueva clave funciona en login
    const loginWithNewPass = await makeRequest(port, '/login', 'POST', {
      login: 'admin',
      password: 'Admin2026'
    });
    assert(loginWithNewPass.status === 200, 'Inicio de sesión exitoso con la nueva contraseña');

    // Restaurar clave original para no alterar los fixtures de desarrollo (admin123)
    const restoreToken = loginWithNewPass.data.data.token;
    await makeRequest(port, '/change-password', 'POST', {
      currentPassword: 'Admin2026',
      newPassword: 'admin123'
    }, restoreToken);
    console.log('   ℹ️  Contraseña original de prueba restaurada (admin123)');

    // TEST 6: Login de otras cuentas demo (Ventanilla Única y Funcionario)
    console.log('\n--- [6/6] Verificación de Cuentas Demo de Ventanilla Única y Funcionario ---');
    const vuLogin = await makeRequest(port, '/login', 'POST', {
      login: 'mfernandez',
      password: 'password123'
    });
    assert(vuLogin.status === 200, 'Login exitoso de Responsable de Ventanilla Única (mfernandez)');
    assert(vuLogin.data.data.user.activeRole.rol_codigo === 'VENTANILLA_UNICA', 'Rol verificado: VENTANILLA_UNICA');

    const funcLogin = await makeRequest(port, '/login', 'POST', {
      login: 'cmamani',
      password: 'password123'
    });
    assert(funcLogin.status === 200, 'Login exitoso de Funcionario (cmamani)');
    assert(funcLogin.data.data.user.activeRole.rol_codigo === 'FUNCIONARIO', 'Rol verificado: FUNCIONARIO');

    console.log('\n================================================================');
    console.log(`🎉 ¡TODAS LAS PRUEBAS DE AUTENTICACIÓN PASARON! (${passedTests}/${totalTests})`);
    console.log('    Módulo de Autenticación JWT y Sesión 100% verificado.');
    console.log('================================================================\n');

  } catch (err) {
    console.error('\n❌ Error en pruebas de autenticación:', err);
    process.exit(1);
  } finally {
    server.close();
    await pool.end();
  }
}

if (require.main === module) {
  runAuthTests().catch((e) => {
    console.error('Fallo fatal:', e);
    process.exit(1);
  });
}

module.exports = runAuthTests;
