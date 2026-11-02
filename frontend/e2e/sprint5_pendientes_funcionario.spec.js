import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5000/api';

/**
 * Crea un trámite pendiente asignado al funcionario jcervantes (id 2)
 * para garantizar que el reporte tenga datos en la gestión actual.
 */
async function crearTramitePendiente(request) {
  const login = await request.post(`${API_URL}/auth/login`, {
    data: { login: 'jcervantes', password: 'admin123' }
  });
  expect(login.ok()).toBeTruthy();
  const token = (await login.json()).data.token;

  const respuesta = await request.post(`${API_URL}/tramites`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      tipo_proceso_id: 4,
      remitente: 'PRUEBA E2E RF-12.7',
      institucion_remitente: 'Gobierno Autónomo Municipal de Sucre',
      cite_externo: `E2E-RF127-${Date.now()}`,
      referencia: 'Trámite de prueba para el reporte de pendientes por funcionario',
      prioridad: 'ALTA',
      nro_hojas: 1,
      nro_anexos: 0
    }
  });
  expect(respuesta.ok()).toBeTruthy();
  return (await respuesta.json()).data;
}

test.describe('Sprint 5 E2E - Pendientes por Funcionario (RF-12.7)', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // 1. Autenticación institucional
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso Institucional');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/');

    // 2. Cambiar al rol activo ADMIN_TRAMITES (multi-rol)
    await page.click('button[title="Opciones de perfil y sesión"]');
    const rolAdminTramites = page.locator('button:has-text("Administrador de Trámites")');
    await expect(rolAdminTramites).toBeVisible();
    await rolAdminTramites.click();

    // 3. Ingresar al Hub de Supervisión de Trámites
    await page.goto('/admin');
    await expect(
      page.locator('h1:has-text("Gestión de Procesos, Tiempos SLA y Supervisión de Trámites")')
    ).toBeVisible({ timeout: 10000 });
  });

  test('1. Genera el resumen semanal y el detalle de pendientes del funcionario', async ({ page, request }) => {
    test.setTimeout(60000);

    const tramite = await crearTramitePendiente(request);
    expect(tramite.numero_correlativo).toBeTruthy();

    // 1.1 Abrir la pestaña del reporte
    const tabPendientes = page.locator('button:has-text("Pendientes por Funcionario (RF-12.7)")');
    await expect(tabPendientes).toBeVisible();
    await tabPendientes.click();

    // 1.2 Verificar cabecera del panel
    await expect(page.locator('h2:has-text("Pendientes por Funcionario")')).toBeVisible();
    await expect(page.locator('span:has-text("RF-12.7 · ESCRITORIO VIRTUAL")')).toBeVisible();

    // 1.3 Seleccionar al funcionario JUAN PABLO CERVANTES ZAMBRANA
    const selectFuncionario = page.locator('select').first();
    await expect(selectFuncionario).toBeVisible({ timeout: 15000 });
    const opcionCervantes = selectFuncionario.locator('option:has-text("CERVANTES")').first();
    await expect(opcionCervantes).toHaveCount(1, { timeout: 15000 });
    const valorCervantes = await opcionCervantes.getAttribute('value');
    await selectFuncionario.selectOption(valorCervantes);

    // 1.4 Generar el reporte
    await page.click('button:has-text("Generar reporte")');
    await expect(page.locator('button:has-text("Generar reporte")')).toBeEnabled({ timeout: 20000 });

    // 1.5 Verificar ficha del funcionario y tarjetas KPI
    await expect(page.locator('h2:has-text("Pendientes por Funcionario")')).toBeVisible();
    await expect(page.getByText('Pendientes Totales', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('En Atención', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('En Movimiento', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Vencidos', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Trámites activos en su bandeja')).toBeVisible();

    // 1.6 Verificar el resumen semanal por estado
    await expect(page.locator('h3:has-text("Resumen Semanal por Estado")')).toBeVisible();
    await expect(page.locator('th:has-text("Anterior")')).toBeVisible();
    await expect(page.locator('th:has-text("Esta semana")')).toBeVisible();
    await expect(page.locator('th:has-text("Hoy")')).toBeVisible();
    await expect(page.locator('td:has-text("TOTAL")')).toBeVisible();

    // 1.7 Verificar el detalle de pendientes
    await expect(page.locator('h3:has-text("Detalle de Trámites Pendientes")')).toBeVisible();
    const filaTramite = page.locator(`table tbody tr:has-text("${tramite.numero_correlativo}")`);
    await expect(filaTramite).toBeVisible({ timeout: 15000 });
    await expect(filaTramite.locator('td:has-text("PRUEBA E2E RF-12.7")')).toBeVisible();

    // 1.8 Regenerar con "Todas las gestiones"
    const selectGestion = page.locator('select').nth(1);
    await selectGestion.selectOption('');
    await page.click('button:has-text("Generar reporte")');
    await expect(page.locator('button:has-text("Generar reporte")')).toBeEnabled({ timeout: 20000 });
    await expect(page.locator('p:has-text("Todas las gestiones")')).toBeVisible();

    // 1.9 Limpiar el reporte
    await page.click('button:has-text("Limpiar")');
    await expect(page.locator('h2:has-text("Pendientes por Funcionario")')).toBeVisible();
    await expect(page.locator('h3:has-text("Detalle de Trámites Pendientes")')).toHaveCount(0);
  });

  test('2. La pestaña no está disponible para el rol ADMIN_SISTEMA', async ({ page }) => {
    await page.click('button[title="Opciones de perfil y sesión"]');
    await page.locator('button:has-text("Administrador de Sistema")').click();
    await page.goto('/admin');

    await expect(page.locator('h1:has-text("Gestión de Personas, Cuentas y Roles")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Pendientes por Funcionario (RF-12.7)")')).toHaveCount(0);
  });
});
