import { test, expect } from '@playwright/test';

test.describe('Sprint 5 E2E - Reporte Global de Trámites (RF-12.1)', () => {

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

  test('1. Genera el reporte global con inicio, movimientos y conclusiones del período', async ({ page }) => {
    test.setTimeout(60000);

    // 1.1 Abrir la pestaña del reporte global
    const tabReporte = page.locator('button:has-text("Reporte Global (RF-12.1)")');
    await expect(tabReporte).toBeVisible();
    await tabReporte.click();

    // 1.2 Verificar cabecera y alcance global
    await expect(page.locator('h2:has-text("Reporte Global de Trámites")')).toBeVisible();
    await expect(page.locator('span:has-text("ALCANCE GLOBAL")')).toBeVisible();

    // 1.3 Verificar las tres tarjetas KPI
    await expect(page.getByText('Iniciados', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Movidos', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Concluidos', { exact: true }).first()).toBeVisible();

    // 1.4 Verificar la serie diaria y el desglose por tipo
    await expect(page.locator('h3:has-text("Evolución del Período")')).toBeVisible();
    await expect(page.locator('h3:has-text("Desglose por Tipo de Proceso")')).toBeVisible();

    // La BD de desarrollo contiene al menos un trámite de tipo CM en la gestión actual
    await expect(page.locator('table tbody tr:has-text("CM")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('td:has-text("TOTAL DEL PERÍODO")')).toBeVisible();

    // 1.5 Regenerar el reporte con los filtros actuales
    await page.click('button:has-text("Generar reporte")');
    await expect(page.locator('button:has-text("Generar reporte")')).toBeEnabled({ timeout: 15000 });
    await expect(page.locator('h2:has-text("Reporte Global de Trámites")')).toBeVisible();

    // 1.6 Aplicar filtro por oficina y verificar cambio de alcance
    const selectOficina = page.locator('select').nth(1);
    const opcionesOficina = await selectOficina.locator('option').count();
    if (opcionesOficina > 1) {
      const valorOficina = await selectOficina.locator('option').nth(1).getAttribute('value');
      await selectOficina.selectOption(valorOficina);
      await page.click('button:has-text("Generar reporte")');
      await expect(page.locator('span:has-text("OFICINA:")')).toBeVisible({ timeout: 15000 });
    }
  });

  test('2. La pestaña del reporte no está disponible para el rol ADMIN_SISTEMA', async ({ page }) => {
    // Volver al rol ADMIN_SISTEMA (por defecto tras el login) y comprobar que el hub de trámites no se muestra
    await page.click('button[title="Opciones de perfil y sesión"]');
    await page.locator('button:has-text("Administrador de Sistema")').click();
    await page.goto('/admin');

    await expect(page.locator('h1:has-text("Gestión de Personas, Cuentas y Roles")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Reporte Global (RF-12.1)")')).toHaveCount(0);
  });
});
