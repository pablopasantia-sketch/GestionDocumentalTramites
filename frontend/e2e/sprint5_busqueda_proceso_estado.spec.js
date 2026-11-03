import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5000/api';
const CORRELATIVO_BASE = 'CM-1/2026';

/**
 * Autenticación institucional con el usuario admin y cambio al rol
 * ADMIN_TRAMITES, que es el único que accede al Hub de Trámites.
 */
async function ingresarComoAdminTramites(page) {
  await page.goto('/login');
  await expect(page.locator('h1')).toContainText('Acceso Institucional');

  await page.fill('#username', 'admin');
  await page.fill('#password', 'admin123');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/');

  await page.click('button[title="Opciones de perfil y sesión"]');
  const rolAdminTramites = page.locator('button:has-text("Administrador de Trámites")');
  await expect(rolAdminTramites).toBeVisible();
  await rolAdminTramites.click();

  await page.goto('/admin');
  await expect(
    page.locator('h1:has-text("Gestión de Procesos, Tiempos SLA y Supervisión de Trámites")')
  ).toBeVisible({ timeout: 10000 });
}

  async function abrirBusqueda(page) {
  const tab = page.locator('button:has-text("Búsqueda por Proceso y Fechas")');
  await expect(tab).toBeVisible();
  await tab.click();
  await expect(page.locator('h2:has-text("Búsqueda por Proceso y Estado/Fechas")')).toBeVisible({ timeout: 10000 });
}

async function buscar(page) {
  const boton = page.locator('button:has-text("Buscar")');
  await boton.click();
  await expect(page.locator('button:has-text("Buscar")')).toBeEnabled({ timeout: 20000 });
}

test.describe('Sprint 5 E2E - Búsqueda por Proceso y Estado/Fechas (RF-12.2 / RF-12.4)', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await ingresarComoAdminTramites(page);
  });

  test('1. Busca por proceso, tipo, estado y gestión', async ({ page }) => {
    test.setTimeout(90000);

    // 1.1 Abrir la pestaña y verificar el estado inicial (sin búsqueda automática)
    await abrirBusqueda(page);
    await expect(page.locator('span:has-text("RF-12.2 · RF-12.4")')).toBeVisible();
    await expect(page.getByText('Defina los criterios y presione Buscar')).toBeVisible();

    // 1.2 Búsqueda general: debe encontrar el expediente de la base de desarrollo
    await buscar(page);
    await expect(page.locator('h3:has-text("Resultados de la Búsqueda")')).toBeVisible();
    await expect(page.getByText('Coincidencias', { exact: true })).toBeVisible();

    const fila = page.locator(`table tbody tr:has-text("${CORRELATIVO_BASE}")`).first();
    await expect(fila).toBeVisible({ timeout: 15000 });

    // 1.3 Datos referenciales, actividad actual, responsable y fecha de ingreso a bandeja
    await expect(page.locator('th:has-text("Actividad actual")')).toBeVisible();
    await expect(page.locator('th:has-text("Responsable")')).toBeVisible();
    await expect(page.locator('th:has-text("Ingreso bandeja")')).toBeVisible();

    await expect(fila.getByText('CM', { exact: true })).toBeVisible();
    await expect(fila.locator('td:has-text("Concluido")')).toBeVisible();
    await expect(fila.locator('td:has-text("JUAN PABLO CERVANTES ZAMBRANA")')).toBeVisible();
    await expect(fila.locator('td:has-text("Presidencia del Concejo Municipal")')).toBeVisible();
    await expect(fila.locator('td:has-text("30/10/2026")').first()).toBeVisible();

    // 1.4 Filtro por número de proceso/correlativo
    const inputCorrelativo = page.locator('input[placeholder="Ej: CM-1/2026"]');
    await inputCorrelativo.fill('CM-1');
    await buscar(page);
    await expect(fila).toBeVisible({ timeout: 15000 });

    // 1.5 Filtro por tipo de proceso (Correspondencia Municipal Externa = CM)
    const selectTipo = page.locator('select').nth(0);
    const opcionCM = selectTipo.locator('option:has-text("CM —")').first();
    await expect(opcionCM).toHaveCount(1, { timeout: 15000 });
    await selectTipo.selectOption(await opcionCM.getAttribute('value'));
    await buscar(page);
    await expect(fila).toBeVisible({ timeout: 15000 });

    // 1.6 Filtro por estado: un estado sin coincidencias debe mostrar el vacío controlado
    const selectEstado = page.locator('select').nth(1);
    await selectEstado.selectOption('ANULADO');
    await buscar(page);
    await expect(page.getByText('Sin resultados')).toBeVisible({ timeout: 15000 });

    // 1.7 Filtro por estado con coincidencias
    await selectEstado.selectOption('CONCLUIDO');
    await buscar(page);
    await expect(fila).toBeVisible({ timeout: 15000 });

    // 1.8 Filtro por gestión
    const selectGestion = page.locator('select').nth(2);
    await selectGestion.selectOption('2026');
    await buscar(page);
    await expect(fila).toBeVisible({ timeout: 15000 });

    // 1.9 Los filtros de fecha y búsqueda general ya no forman parte del panel
    await expect(page.locator('input[type="date"]')).toHaveCount(0);
    await expect(page.locator('input[placeholder="Búsqueda general..."]')).toHaveCount(0);

    // 1.10 Limpiar restablece los filtros y el estado inicial
    await page.locator('button:has-text("Limpiar")').click();
    await expect(page.getByText('Defina los criterios y presione Buscar')).toBeVisible();
    await expect(page.locator('table tbody')).toHaveCount(0);
  });

  test('2. La trazabilidad del resultado reutiliza el modal existente', async ({ page }) => {
    test.setTimeout(60000);

    await abrirBusqueda(page);
    await buscar(page);

    const fila = page.locator(`table tbody tr:has-text("${CORRELATIVO_BASE}")`).first();
    await expect(fila).toBeVisible({ timeout: 15000 });

    await fila.locator('button:has-text("Trazabilidad")').click();
    await expect(page.locator(`h2:has-text("Expediente: ${CORRELATIVO_BASE}")`)).toBeVisible({ timeout: 15000 });
    await expect(page.locator('h3:has-text("Línea de Tiempo de Movimientos")')).toBeVisible();
  });

  test('3. La Hoja de Ruta del resultado reutiliza el modal existente', async ({ page }) => {
    test.setTimeout(60000);

    await abrirBusqueda(page);
    await buscar(page);

    const fila = page.locator(`table tbody tr:has-text("${CORRELATIVO_BASE}")`).first();
    await expect(fila).toBeVisible({ timeout: 15000 });

    await fila.locator('button:has-text("Hoja de Ruta")').click();
    await expect(
      page.getByText('HOJA DE RUTA DE TRÁMITES Y CORRESPONDENCIA')
    ).toBeVisible({ timeout: 15000 });
  });

  test('4. La pestaña no está disponible para el rol ADMIN_SISTEMA', async ({ page }) => {
    await page.click('button[title="Opciones de perfil y sesión"]');
    await page.locator('button:has-text("Administrador de Sistema")').click();
    await page.goto('/admin');

    await expect(page.locator('h1:has-text("Gestión de Personas, Cuentas y Roles")')).toBeVisible({ timeout: 10000 });
    await expect(
      page.locator('button:has-text("Búsqueda por Proceso y Fechas")')
    ).toHaveCount(0);
  });
});

test.describe('Sprint 5 API - Búsqueda por Proceso y Estado/Fechas', () => {

  test('5. Valida autenticación, rango de fechas y alcance por oficina', async ({ request }) => {
    // 5.1 Sin token: 401
    const sinToken = await request.get(`${API_URL}/tramites/busqueda-avanzada`);
    expect(sinToken.status()).toBe(401);

    // 5.2 Token ADMIN_TRAMITES para consultas globales
    const loginAdmin = await request.post(`${API_URL}/auth/login`, {
      data: { login: 'admin', password: 'admin123' }
    });
    expect(loginAdmin.ok()).toBeTruthy();
    const tokenAdmin = (await loginAdmin.json()).data.token;

    const rangoInvalido = await request.get(
      `${API_URL}/tramites/busqueda-avanzada?fecha_desde=2026-11-01&fecha_hasta=2026-10-01`,
      { headers: { Authorization: `Bearer ${tokenAdmin}` } }
    );
    expect(rangoInvalido.status()).toBe(400);

    // 5.2.1 Un rango histórico amplio (más de 366 días) es válido
    const rangoAmplio = await request.get(
      `${API_URL}/tramites/busqueda-avanzada?gestion=2026&fecha_desde=2022-11-01&fecha_hasta=2024-11-05`,
      { headers: { Authorization: `Bearer ${tokenAdmin}` } }
    );
    expect(rangoAmplio.status()).toBe(200);
    expect((await rangoAmplio.json()).success).toBeTruthy();

    const global = await request.get(`${API_URL}/tramites/busqueda-avanzada?gestion=2026`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` }
    });
    expect(global.ok()).toBeTruthy();
    const globalJson = await global.json();
    expect(globalJson.success).toBeTruthy();
    expect(globalJson.data.total).toBeGreaterThan(0);

    // 5.3 Un usuario no administrador queda limitado a su ubicación orgánica,
    // incluso si intenta forzar otra oficina mediante query string.
    const loginFuncionario = await request.post(`${API_URL}/auth/login`, {
      data: { login: 'jcervantes', password: 'admin123' }
    });
    expect(loginFuncionario.ok()).toBeTruthy();
    const tokenFuncionario = (await loginFuncionario.json()).data.token;

    const restringido = await request.get(
      `${API_URL}/tramites/busqueda-avanzada?ubicacion_org_id=999&gestion=2026`,
      { headers: { Authorization: `Bearer ${tokenFuncionario}` } }
    );
    expect(restringido.ok()).toBeTruthy();
    const restringidoJson = await restringido.json();
    expect(restringidoJson.success).toBeTruthy();
    for (const item of restringidoJson.data.items) {
      expect(item.ubicacion_actual_id).toBe(1);
    }
  });
});
