import { test, expect } from '@playwright/test';

const API_URL = 'http://localhost:5000/api';

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

  // Esperar a que el cambio de rol se persista antes de navegar al hub
  await expect(page.locator('.user-tag-role')).toContainText('Administrador de Trámites');

  await page.goto('/admin');
  await expect(
    page.locator('h1:has-text("Gestión de Procesos, Tiempos SLA y Supervisión de Trámites")')
  ).toBeVisible({ timeout: 10000 });
}

test.describe('Hub de Trámites - Pestañas retiradas (Sprint 4 / Sprint 5)', () => {

  test.beforeEach(async ({ page }) => {
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });
    await ingresarComoAdminTramites(page);
  });

  test('1. Las pestañas retiradas no se muestran y las restantes siguen disponibles', async ({ page }) => {
    test.setTimeout(60000);

    // 1.1 Pestañas retiradas: Supervisión SLA, Métricas y Reporte Global
    await expect(page.locator('button:has-text("Supervisión SLA y Tiempos")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Métricas y Trazabilidad Municipal")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Reporte Global")')).toHaveCount(0);

    // 1.2 Pestañas que deben conservarse
    await expect(page.locator('button:has-text("Supervisión de Trámites")')).toBeVisible();
    await expect(page.locator('button:has-text("Tipos de Proceso y SLA")')).toBeVisible();
    await expect(page.locator('button:has-text("Pendientes por Funcionario (RF-12.7)")')).toBeVisible();
    await expect(page.locator('button:has-text("Búsqueda por Proceso y Fechas")')).toBeVisible();

    // 1.3 Las tarjetas KPI superiores se mantienen
    await expect(page.getByText('Trámites Totales', { exact: false })).toBeVisible();
    await expect(page.getByText('En Atención', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Concluidos', { exact: true }).first()).toBeVisible();
  });

  test('2. Los endpoints retirados responden 404 y los conservados siguen operativos', async ({ request }) => {
    // 2.1 Endpoints eliminados
    const supervisionSla = await request.get(`${API_URL}/tramites/supervision/sla`);
    expect(supervisionSla.status()).toBe(404);

    const reporteGlobal = await request.get(`${API_URL}/reportes/global`);
    expect(reporteGlobal.status()).toBe(404);

    // 2.2 Obtener token de un funcionario para verificar los endpoints conservados
    const login = await request.post(`${API_URL}/auth/login`, {
      data: { login: 'jcervantes', password: 'admin123' }
    });
    expect(login.ok()).toBeTruthy();
    const token = (await login.json()).data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // 2.3 Endpoint conservado: estadísticas del hub
    const stats = await request.get(`${API_URL}/tramites/stats`, { headers });
    expect(stats.ok()).toBeTruthy();
    expect((await stats.json()).success).toBe(true);

    // 2.4 Endpoint conservado: pendientes por funcionario
    const pendientes = await request.get(`${API_URL}/reportes/pendientes-funcionario`, {
      headers,
      params: { funcionario_id: 2 }
    });
    expect(pendientes.ok()).toBeTruthy();
    expect((await pendientes.json()).success).toBe(true);
  });
});
