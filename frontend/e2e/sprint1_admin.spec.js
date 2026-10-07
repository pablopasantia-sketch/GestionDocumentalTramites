import { test, expect } from '@playwright/test';

test.describe('Sprint 1 E2E - Módulo de Administración de Sistemas', () => {

  test.beforeEach(async ({ page }) => {
    // 1. Acceder al sistema y autenticarse con cuenta de Administrador de Sistemas
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso Institucional');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección al escritorio o inicio
    await page.waitForURL('**/');
    
    // Navegar explícitamente a /admin (Hub de Administración de Sistemas)
    await page.goto('/admin');
    await expect(page.locator('h1:has-text("Gestión de Personas, Cuentas y Roles")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Flujo Completo: Ciudadanos y Solicitantes (Crear, Buscar, Filtrar)', async ({ page }) => {
    // Asegurar que estamos en la pestaña Ciudadanos y Solicitantes
    const tabPersonas = page.locator('button:has-text("Ciudadanos y Solicitantes")');
    await tabPersonas.click();

    // 1.1 Abrir modal de nuevo ciudadano
    const btnNuevo = page.locator('button:has-text("Nuevo Ciudadano")');
    await expect(btnNuevo).toBeVisible();
    await btnNuevo.click();

    await expect(page.locator('text=Registrar Nuevo Ciudadano / Solicitante')).toBeVisible();

    // Generar un CI único para la prueba
    const randomCI = `${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testNombre = `CIUDADANO_TEST_${Date.now().toString().slice(-4)}`;
    const testPaterno = 'PRUEBA_E2E';

    // 1.2 Completar el formulario
    // Nombres
    await page.locator('form input').nth(0).fill(testNombre);
    // Apellido Paterno
    await page.locator('form input').nth(1).fill(testPaterno);
    // Apellido Materno
    await page.locator('form input').nth(2).fill('SUCRE');
    // CI
    await page.locator('form input').nth(3).fill(randomCI);
    // Teléfono
    await page.locator('input[placeholder="Ej: 72881234"]').fill('71234567');
    // Email
    await page.locator('input[type="email"]').fill(`test_${randomCI}@sucre.bo`);
    // Dirección
    await page.locator('input[placeholder="Calle, Número, Zona"]').fill('Plaza 25 de Mayo #123');

    // Guardar
    await page.locator('button[type="submit"]:has-text("Registrar Persona")').click();

    // 1.3 Verificar que se registró y aparece en la tabla
    const searchInput = page.locator('input[placeholder*="Buscar ciudadano"]');
    await expect(searchInput).toBeVisible();
    await searchInput.fill(randomCI);

    // Debe mostrar la fila con el CI y Nombre recién creados (usar exact match en strong para evitar conflicto con email)
    await expect(page.locator(`strong:has-text("${randomCI}")`)).toBeVisible();
    await expect(page.locator(`text=${testNombre}`)).toBeVisible();
    await expect(page.locator('span:has-text("Vigente")').first()).toBeVisible();
  });

  test('2. Flujo Completo: Personal y Cuentas de Acceso (Listar, Filtrar, Asignación)', async ({ page }) => {
    // 2.1 Navegar a la pestaña Personal y Cuentas de Acceso
    const tabPersonal = page.locator('button:has-text("Personal y Cuentas de Acceso")');
    await tabPersonal.click();

    // Verificar tabla de personal
    await expect(page.locator('th:has-text("Funcionario Municipal")')).toBeVisible();
    await expect(page.locator('th:has-text("Acceso & Roles")')).toBeVisible();

    // 2.2 Buscar funcionario sembrado (mfernandez)
    const searchInput = page.locator('input[placeholder*="Buscar personal"]');
    await searchInput.fill('mfernandez');

    // Validar coincidencia en la tabla
    await expect(page.locator('text=mfernandez').first()).toBeVisible();
    await expect(page.locator('text=Ventanilla Única').first()).toBeVisible();

    // 2.3 Abrir modal de Roles del primer resultado filtrado (mfernandez)
    const btnRoles = page.locator('tr:has-text("mfernandez") button:has-text("Roles")');
    await btnRoles.click();

    // Verificar modal de roles
    await expect(page.locator('text=Roles y Oficinas de Usuario')).toBeVisible();
    await expect(page.locator('text=Asignaciones Actuales')).toBeVisible();

    // Cerrar modal
    await page.locator('.modal-backdrop button.modal-close-btn').click();
  });

  test('3. Flujo Completo: Estructura Institucional (Catálogos TUnidad/TCargo y Árbol Visual)', async ({ page }) => {
    // 3.1 Navegar a la pestaña Estructura Institucional
    const tabEstructura = page.locator('button:has-text("Estructura Institucional")');
    await tabEstructura.click();

    // 3.2 Verificar sub-pestaña de Catálogos Oficiales (TUnidad y TCargo)
    await expect(page.locator('button:has-text("Directorio Institucional")')).toBeVisible();
    await expect(page.locator('button:has-text("Direcciones y Unidades")')).toBeVisible();
    await expect(page.locator('button:has-text("Cargos Institucionales")')).toBeVisible();

    // Verificar que la tabla de unidades cargó
    await expect(page.locator('table.table-sucre th:has-text("Nombre de la Unidad")')).toBeVisible();
    await expect(page.locator('table.table-sucre tbody tr').first()).toBeVisible();

    // 3.3 Cambiar a sub-pestaña Cargos Institucionales
    const btnCargos = page.locator('button:has-text("Cargos Institucionales")');
    await btnCargos.click();
    await expect(page.locator('table.table-sucre th:has-text("Nombre del Cargo Oficial")')).toBeVisible();
    await expect(page.locator('table.table-sucre tbody tr').first()).toBeVisible();

    // 3.4 Cambiar a la vista de Árbol Jerárquico Visual
    const btnArbol = page.locator('button:has-text("Árbol Jerárquico Visual")');
    await btnArbol.click();

    await expect(page.locator('text=Vista de Árbol Jerárquico')).toBeVisible();
    await expect(page.locator('button:has-text("Expandir todo")')).toBeVisible();

    // Expandir todo el organigrama
    await page.locator('button:has-text("Expandir todo")').click();
    await expect(page.locator('.card:has-text("Vista de Árbol")')).toBeVisible();
  });

});
