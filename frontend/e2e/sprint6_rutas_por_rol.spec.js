import { test, expect } from '@playwright/test';

// =============================================================================
// E2E — Sprint 6: rutas fijas alineadas con el ROL ACTIVO del JWT.
//
// Valida la matriz única de permisos:
//   /ventanilla  -> solo VENTANILLA_UNICA
//   /escritorio  -> FUNCIONARIO, VENTANILLA_UNICA, ADMIN_TRAMITES
//   /admin       -> ADMIN_SISTEMA, ADMIN_TRAMITES
//   /status      -> solo ADMIN_SISTEMA
//   /, /consulta, /buscar, /login -> públicas
//
// Los roles secundarios (user.roles) NO deben habilitar ninguna ruta.
// =============================================================================

const RUTAS_PROTEGIDAS = ['/ventanilla', '/escritorio', '/admin', '/status'];
const ENCABEZADO_PUBLICO = /Portal Ciudadano de Trámites y Seguimiento Municipal/i;
const ACCESO_RESTRINGIDO = 'Acceso Restringido por Rol';

test.describe('Sprint 6 E2E - Rutas fijas por rol activo', () => {
  const login = async (page, username) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('gestion_doc_token');
      localStorage.removeItem('gestion_doc_user');
      sessionStorage.clear();
    });
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible();
    await page.fill('#username', username);
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');
  };

  const nombreRolPorCodigo = {
    ADMIN_SISTEMA: 'Administrador de Sistema',
    ADMIN_TRAMITES: 'Administrador de Trámites',
    FUNCIONARIO: 'Funcionario',
    VENTANILLA_UNICA: 'Ventanilla Única',
  };

  const cambiarRol = async (page, codigoRol) => {
    await page.click('button[title="Opciones de perfil y sesión"]');
    const botonRol = page.getByTestId(`cambiar-rol-${codigoRol}`);
    await expect(botonRol).toBeVisible();
    await botonRol.click();
    await expect(page.locator('.user-tag-role')).toContainText(nombreRolPorCodigo[codigoRol]);
  };

  const esperarAccesoRestringido = async (page) => {
    await expect(page.getByRole('heading', { name: ACCESO_RESTRINGIDO })).toBeVisible();
  };

  const verificarDenegadas = async (page, rutas) => {
    for (const ruta of rutas) {
      await page.goto(ruta);
      await esperarAccesoRestringido(page);
    }
  };

  const verificarPermitidas = async (page, casos) => {
    for (const [ruta, encabezado] of casos) {
      await page.goto(ruta);
      await expect(page.getByRole('heading', { name: encabezado })).toBeVisible({ timeout: 15000 });
    }
  };

  test('1. Usuario anónimo: rutas protegidas van a /login y las públicas siguen abiertas', async ({ page }) => {
    for (const ruta of RUTAS_PROTEGIDAS) {
      await page.goto(ruta);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('heading', { name: /Acceso Institucional/i })).toBeVisible();
    }

    for (const ruta of ['/', '/consulta', '/buscar']) {
      await page.goto(ruta);
      await expect(page).toHaveURL(ruta === '/' ? /\/$/ : new RegExp(`${ruta}$`));
      await expect(page.getByRole('heading', { name: ENCABEZADO_PUBLICO })).toBeVisible();
    }

    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /Acceso Institucional/i })).toBeVisible();
  });

  test('2. ADMIN_SISTEMA: /admin y /status permitidos; /ventanilla y /escritorio denegados', async ({ page }) => {
    await login(page, 'admin');
    await expect(page.locator('.user-tag-role')).toContainText('Administrador de Sistema');

    await verificarPermitidas(page, [
      ['/admin', /Gestión de Personas, Cuentas y Roles/i],
      ['/status', /Estado del Entorno y Base de Datos SQL Server/i],
    ]);

    await expect(page.getByRole('link', { name: 'Admin. Sistemas' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Diagnóstico BD' })).toBeVisible();

    await verificarDenegadas(page, ['/ventanilla', '/escritorio']);
    await expect(page.getByRole('link', { name: 'Ventanilla Única' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Escritorio Virtual' })).toHaveCount(0);
  });

  test('3. ADMIN_TRAMITES como rol activo: /admin y /escritorio; sin /ventanilla ni /status', async ({ page }) => {
    await login(page, 'jcervantes');
    await expect(page.locator('.user-tag-role')).toContainText('Funcionario');

    // jcervantes tiene ADMIN_TRAMITES como rol secundario: no debe abrir /admin.
    await page.goto('/admin');
    await esperarAccesoRestringido(page);

    await cambiarRol(page, 'ADMIN_TRAMITES');
    await verificarPermitidas(page, [
      ['/admin', /Gestión de Procesos, Tiempos SLA y Supervisión de Trámites/i],
      ['/escritorio', /Escritorio Virtual de Trámites y Bandejas/i],
    ]);

    await expect(page.getByRole('link', { name: 'Supervisión de Trámites' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Diagnóstico BD' })).toHaveCount(0);

    await verificarDenegadas(page, ['/ventanilla', '/status']);
  });

  test('4. VENTANILLA_UNICA como rol activo: /ventanilla y /escritorio; sin /admin ni /status', async ({ page }) => {
    await login(page, 'cargo054');

    // El rol VENTANILLA_UNICA es secundario hasta que se selecciona explícitamente.
    await page.goto('/ventanilla');
    await esperarAccesoRestringido(page);

    await cambiarRol(page, 'VENTANILLA_UNICA');
    await verificarPermitidas(page, [
      ['/ventanilla', /Recepción y Emisión de Hojas de Ruta Externas/i],
      ['/escritorio', /Escritorio Virtual de Trámites y Bandejas/i],
    ]);

    await expect(page.getByRole('link', { name: 'Ventanilla Única' })).toBeVisible();
    await verificarDenegadas(page, ['/admin', '/status']);
  });

  test('5. FUNCIONARIO: solo /escritorio entre las rutas restringidas', async ({ page }) => {
    await login(page, 'jcervantes');

    await verificarPermitidas(page, [
      ['/escritorio', /Escritorio Virtual de Trámites y Bandejas/i],
    ]);
    await verificarDenegadas(page, ['/ventanilla', '/admin', '/status']);

    await expect(page.getByRole('link', { name: 'Escritorio Virtual' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ventanilla Única' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Admin. Sistemas' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Supervisión de Trámites' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Diagnóstico BD' })).toHaveCount(0);
  });

  test('6. Cambiar a un rol que no habilita la ruta actual redirige a / (Ventanilla)', async ({ page }) => {
    await login(page, 'cargo054');
    await cambiarRol(page, 'VENTANILLA_UNICA');
    await page.goto('/ventanilla');
    await expect(
      page.getByRole('heading', { name: /Recepción y Emisión de Hojas de Ruta Externas/i })
    ).toBeVisible();

    await cambiarRol(page, 'FUNCIONARIO');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: ENCABEZADO_PUBLICO })).toBeVisible();
    await expect(page.getByRole('heading', { name: ACCESO_RESTRINGIDO })).toHaveCount(0);
  });

  test('7. Cambiar a ADMIN_TRAMITES desde /status redirige a /', async ({ page }) => {
    await login(page, 'admin');
    await page.goto('/status');
    await expect(
      page.getByRole('heading', { name: /Estado del Entorno y Base de Datos SQL Server/i })
    ).toBeVisible();

    await cambiarRol(page, 'ADMIN_TRAMITES');

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole('heading', { name: ENCABEZADO_PUBLICO })).toBeVisible();
    await expect(page.getByRole('heading', { name: ACCESO_RESTRINGIDO })).toHaveCount(0);
  });
});
