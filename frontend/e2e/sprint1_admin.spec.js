import { test, expect } from '@playwright/test';

test.describe('Sprint 1 E2E - Módulo de Administración de Sistemas', () => {

  test.beforeEach(async ({ page }) => {
    // Configurar manejador automático para diálogos nativos window.confirm
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // 1. Acceder al sistema y autenticarse con cuenta de Administrador de Sistemas
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso Institucional');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección tras login exitoso
    await page.waitForURL('**/');
    
    // Navegar al Hub de Administración de Sistemas
    await page.goto('/admin');
    await expect(page.locator('h1:has-text("Gestión de Personas, Cuentas y Roles")')).toBeVisible({ timeout: 10000 });
  });

  test('1. Flujo Completo: Ciudadanos y Solicitantes (Crear, Buscar, Editar, Dar de Baja y Reactivar)', async ({ page }) => {
    test.setTimeout(60000);

    // Asegurar que estamos en la pestaña Ciudadanos y Solicitantes
    const tabPersonas = page.locator('button:has-text("Ciudadanos y Solicitantes")');
    await tabPersonas.click();

    // 1.1 Abrir modal de nuevo ciudadano y registrar
    const btnNuevo = page.locator('button:has-text("Nuevo Ciudadano")');
    await expect(btnNuevo).toBeVisible();
    await btnNuevo.click();

    await expect(page.locator('text=Registrar Nuevo Ciudadano / Solicitante')).toBeVisible();

    const randomCI = `${Math.floor(1000000 + Math.random() * 9000000)}`;
    const testNombre = `CIUDADANO_${randomCI.slice(-4)}`;
    const testPaterno = 'PRUEBA_E2E';

    const modalPersona = page.locator('.modal-backdrop');
    await modalPersona.locator('form input').nth(0).fill(testNombre);
    await modalPersona.locator('form input').nth(1).fill(testPaterno);
    await modalPersona.locator('form input').nth(2).fill('SUCRE');
    await modalPersona.locator('form input').nth(3).fill(randomCI);
    await modalPersona.locator('input[placeholder="Ej: 72881234"]').fill('71234567');
    await modalPersona.locator('input[type="email"]').fill(`test_${randomCI}@sucre.bo`);
    await modalPersona.locator('input[placeholder="Calle, Número, Zona"]').fill('Plaza 25 de Mayo #123');

    await modalPersona.locator('button[type="submit"]:has-text("Registrar Persona")').click();
    await expect(page.locator('text=registrada en el sistema exitosamente')).toBeVisible({ timeout: 10000 });

    // 1.2 Buscar ciudadano en la tabla y verificar estado Activo
    const searchInput = page.locator('input[placeholder*="Buscar ciudadano"]');
    await searchInput.fill(randomCI);

    const personaRow = page.locator(`tr:has(strong:has-text("${randomCI}"))`);
    await expect(personaRow).toBeVisible();
    await expect(personaRow.locator('span:has-text("Vigente")')).toBeVisible();

    // 1.3 Editar datos del ciudadano
    await personaRow.locator('button[title="Editar persona"]').click();
    await expect(page.locator('text=Editar Datos de Ciudadano / Solicitante')).toBeVisible();

    await page.locator('.modal-backdrop input[placeholder="Ej: 72881234"]').fill('78901234');
    await page.locator('.modal-backdrop input[placeholder="Calle, Número, Zona"]').fill('Av. Hernando Siles #500 Editado');
    await page.locator('.modal-backdrop button[type="submit"]:has-text("Actualizar Persona")').click();
    await expect(page.locator('text=actualizados exitosamente')).toBeVisible({ timeout: 10000 });

    // Verificar que los cambios se reflejan
    await searchInput.fill(randomCI);
    await expect(personaRow).toContainText('78901234');

    // 1.4 Dar de baja lógica al ciudadano
    await personaRow.locator('button[title="Dar de baja"]').click();
    await expect(page.locator('text=Confirmar Baja Lógica')).toBeVisible();
    await page.locator('.modal-dialog button:has-text("Confirmar Baja")').click();
    await expect(page.locator('text=fue dada de baja')).toBeVisible({ timeout: 10000 });

    // Al estar en el filtro por defecto de solo activos, no debe figurar
    await expect(personaRow).not.toBeVisible();

    // 1.5 Reactivación tras borrado lógico
    const filtroSelect = page.locator('select:has-text("Mostrar:")');
    await filtroSelect.selectOption('inactivos');
    await searchInput.fill(randomCI);

    const inactiveRow = page.locator(`tr:has(strong:has-text("${randomCI}"))`);
    await expect(inactiveRow).toBeVisible();
    await expect(inactiveRow.locator('span:has-text("Inactivo")')).toBeVisible();

    // Presionar botón de reactivación (el window.confirm se auto-acepta)
    await inactiveRow.locator('button[title="Reactivar persona"]').click();
    await expect(page.locator('text=reactivada exitosamente')).toBeVisible({ timeout: 10000 });

    // Volver a vigentes y confirmar que reaparece activo
    await filtroSelect.selectOption('activos');
    await searchInput.fill(randomCI);
    await expect(page.locator(`tr:has(strong:has-text("${randomCI}"))`)).toBeVisible();
    await expect(page.locator(`tr:has(strong:has-text("${randomCI}"))`).locator('span:has-text("Vigente")')).toBeVisible();
  });

  test('2. Flujo Completo: Personal y Cuentas de Acceso (Crear, Asignar/Quitar Roles, Editar, Reset Clave, Baja y Reactivación)', async ({ page }) => {
    test.setTimeout(60000);

    const tabPersonal = page.locator('button:has-text("Personal y Cuentas de Acceso")');
    await tabPersonal.click();

    // 2.1 Crear nuevo Funcionario con Cuenta de Acceso
    await page.locator('button:has-text("Nuevo Funcionario / Personal")').click();
    await expect(page.locator('text=Registrar Personal Municipal')).toBeVisible();

    const randomCI = `${Math.floor(2000000 + Math.random() * 7000000)}`;
    const testLogin = `usr_${randomCI.slice(-4)}`;
    const testNombre = `FUNC_${randomCI.slice(-4)}`;

    const modalPersonal = page.locator('.modal-backdrop');
    await modalPersonal.locator('input[placeholder="Ej: 1000001"]').fill(randomCI);
    await modalPersonal.locator('input[placeholder="Ej: CARLOS"]').fill(testNombre);
    await modalPersonal.locator('input[placeholder="Ej: MAMANI CONDORI"]').fill('PRUEBA E2E');
    await modalPersonal.locator('input[placeholder="Ej: 72881234"]').fill('76543210');
    await modalPersonal.locator('input[placeholder="funcionario@sucre.bo"]').fill(`${testLogin}@sucre.bo`);
    await modalPersonal.locator('input[placeholder="Ej: Av. Hernando Siles #450"]').fill('Calle Calvo #120');
    await modalPersonal.locator('input[placeholder="Ej: Encargado de Ventanilla Única"]').fill('Analista de Pruebas');

    // Cuenta de acceso
    await modalPersonal.locator('input[placeholder="ej: mfernandez"]').fill(testLogin);
    await modalPersonal.locator('input[placeholder="Mínimo 6 caracteres"]').fill('password123');

    await modalPersonal.locator('button[type="submit"]:has-text("Registrar Personal")').click();
    await expect(page.locator('text=Personal municipal registrado exitosamente')).toBeVisible({ timeout: 10000 });

    // 2.2 Buscar funcionario recién creado
    const searchInput = page.locator('input[placeholder*="Buscar personal"]');
    await searchInput.fill(testLogin);
    const userRow = page.locator(`tr:has-text("${testLogin}")`);
    await expect(userRow).toBeVisible();

    // 2.3 Modal de Roles: Asignar y Quitar rol
    await userRow.locator('button:has-text("Roles")').click();
    await expect(page.locator('text=Roles y Oficinas de Usuario')).toBeVisible();

    const selectRol = page.locator('.modal-dialog form select').nth(0);
    const selectOficina = page.locator('.modal-dialog form select').nth(1);
    await selectRol.selectOption({ index: 1 });
    await selectOficina.selectOption({ index: 1 });
    await page.locator('#es_principal_check').check();
    await page.locator('.modal-dialog form button[type="submit"]:has-text("Asignar Rol")').click();
    await expect(page.locator('text=Rol asignado al usuario exitosamente')).toBeVisible({ timeout: 10000 });

    // Verificar en lista de asignaciones y desasignar
    const roleRow = page.locator('.modal-dialog table tbody tr').first();
    await expect(roleRow).toBeVisible();
    await roleRow.locator('button[title="Desasignar rol"]').click();
    await expect(page.locator('text=Rol desasignado del usuario')).toBeVisible({ timeout: 10000 });

    // Cerrar modal de roles
    await page.locator('.modal-backdrop button.modal-close-btn').click();

    // 2.4 Editar datos de personal
    await searchInput.fill(testLogin);
    await userRow.locator('button[title="Editar datos de personal y asignación"]').click();
    await expect(page.locator('text=Editar Personal Municipal')).toBeVisible();
    await page.locator('.modal-dialog input[placeholder="Ej: Encargado de Ventanilla Única"]').fill('Auditor Senior E2E');
    await page.locator('.modal-dialog button[type="submit"]:has-text("Actualizar Personal")').click();
    await expect(page.locator('text=Personal municipal actualizado exitosamente')).toBeVisible({ timeout: 10000 });

    // 2.5 Restablecer contraseña
    await searchInput.fill(testLogin);
    await userRow.locator('button[title="Restablecer contraseña"]').click();
    await expect(page.locator('text=Restablecer credencial de acceso')).toBeVisible();
    await page.locator('.modal-dialog input[placeholder="Mínimo 6 caracteres"]').fill('nuevaClave2026');
    await page.locator('.modal-dialog button[type="submit"]:has-text("Guardar Nueva Contraseña")').click();
    await expect(page.locator('text=Contraseña restablecida exitosamente')).toBeVisible({ timeout: 10000 });

    // 2.6 Dar de baja lógica al funcionario
    await searchInput.fill(testLogin);
    await userRow.locator('button[title="Dar de baja funcionario"]').click();
    await expect(page.locator('text=Confirmar Baja Lógica')).toBeVisible();
    await page.locator('.modal-dialog button:has-text("Confirmar Baja")').click();
    await expect(page.locator('text=dado de baja')).toBeVisible({ timeout: 10000 });
    await expect(userRow).not.toBeVisible();

    // 2.7 Reactivar al funcionario
    const filtroSelect = page.locator('select:has-text("Mostrar:")');
    await filtroSelect.selectOption('inactivos');
    await searchInput.fill(testLogin);
    const inactiveUserRow = page.locator(`tr:has-text("${testLogin}")`);
    await expect(inactiveUserRow).toBeVisible();

    await inactiveUserRow.locator('button[title="Reactivar funcionario"]').click();
    await expect(page.locator('text=reactivado exitosamente')).toBeVisible({ timeout: 10000 });

    // Volver a activos y verificar presencia
    await filtroSelect.selectOption('activos');
    await searchInput.fill(testLogin);
    await expect(userRow).toBeVisible();
  });

  test('3. Flujo Completo: Estructura Institucional (Crear/Editar Unidad y Cargo, Árbol Visual, Eliminar)', async ({ page }) => {
    test.setTimeout(60000);

    const tabEstructura = page.locator('button:has-text("Estructura Institucional")');
    await tabEstructura.click();

    // 3.1 Registrar Nueva Unidad Orgánica
    await page.locator('button:has-text("Nueva Unidad")').click();
    await expect(page.locator('text=Nueva Unidad Orgánica')).toBeVisible();

    const uniqueId = `${Date.now().toString().slice(-4)}`;
    const codUnidad = `E2E${uniqueId}`;
    const nombUnidad = `UNIDAD PRUEBA ${codUnidad}`;

    const modalUnidad = page.locator('.modal-backdrop');
    await modalUnidad.locator('input[placeholder="Ej: GAM, ALCAL, RRHH"]').fill(codUnidad);
    await modalUnidad.locator('input[placeholder="Ej: RRHH, TI"]').fill(`U${uniqueId}`);
    await modalUnidad.locator('input[placeholder*="Ej: Recursos Humanos"]').fill(nombUnidad);
    await modalUnidad.locator('textarea[placeholder*="Descripción de las funciones"]').fill('Unidad creada automáticamente para pruebas E2E');
    await modalUnidad.locator('button[type="submit"]:has-text("Registrar Unidad")').click();
    await expect(page.locator('text=creada exitosamente')).toBeVisible({ timeout: 10000 });

    // 3.2 Verificar en Catálogo "Direcciones y Unidades"
    const btnDirecciones = page.locator('button:has-text("Direcciones y Unidades")');
    await btnDirecciones.click();
    const searchUnidad = page.locator('input[placeholder*="Buscar por código o nombre"]');
    await searchUnidad.fill(nombUnidad);
    const rowUnidad = page.locator(`table.table-sucre tr:has-text("${nombUnidad}")`);
    await expect(rowUnidad).toBeVisible();

    // 3.3 Verificar presencia en el "Árbol Jerárquico Visual"
    const btnArbol = page.locator('button:has-text("Árbol Jerárquico Visual")');
    await btnArbol.click();
    await expect(page.locator('text=Vista de Árbol Jerárquico')).toBeVisible();
    await page.locator('button:has-text("Expandir todo")').click();
    
    // Verificar dentro del contenedor del organigrama
    const treeContainer = page.locator('.card:has-text("Vista de Árbol Jerárquico")');
    await expect(treeContainer.locator(`span:has-text("${nombUnidad}")`).first()).toBeVisible();

    // 3.4 Editar Unidad Orgánica
    const btnDirectorios = page.locator('button:has-text("Directorio Institucional")');
    await btnDirectorios.click();
    await btnDirecciones.click();
    await searchUnidad.fill(nombUnidad);
    await rowUnidad.locator('button[title="Editar Unidad"]').click();
    await expect(page.locator('text=Editar Unidad Orgánica')).toBeVisible();

    const nombUnidadEditada = `${nombUnidad} EDITADA`;
    await page.locator('.modal-dialog input[placeholder*="Ej: Recursos Humanos"]').fill(nombUnidadEditada);
    await page.locator('.modal-dialog button[type="submit"]:has-text("Actualizar Unidad")').click();
    await expect(page.locator('text=actualizada exitosamente')).toBeVisible({ timeout: 10000 });

    // 3.5 Crear Cargo Institucional
    const btnCargos = page.locator('button:has-text("Cargos Institucionales")');
    await btnCargos.click();
    await page.locator('button:has-text("Nuevo Cargo")').click();
    await expect(page.locator('text=Nuevo Cargo Institucional')).toBeVisible();

    const cargoNombre = `ESPECIALISTA_${uniqueId}`;
    const modalCargo = page.locator('.modal-backdrop');
    await modalCargo.locator('select:has-text("-- Seleccionar Unidad")').selectOption({ index: 1 });
    await modalCargo.locator('input[placeholder="Ej. JEFE DE UNIDAD AMBIENTAL"]').fill(cargoNombre);
    await modalCargo.locator('button[type="submit"]:has-text("Guardar Cargo")').click();
    await expect(page.locator('text=registrado con éxito')).toBeVisible({ timeout: 10000 });

    // 3.6 Editar Cargo Institucional
    const searchCargo = page.locator('input[placeholder*="Buscar por cargo"]');
    await searchCargo.fill(cargoNombre);
    const rowCargo = page.locator(`table.table-sucre tr:has-text("${cargoNombre}")`);
    await expect(rowCargo).toBeVisible();

    await rowCargo.locator('button[title="Editar Cargo"]').click();
    await expect(page.locator('text=Editar Cargo Institucional')).toBeVisible();

    const cargoNombreEditado = `${cargoNombre}_EDITADO`;
    await page.locator('.modal-dialog input[placeholder="Ej. JEFE DE UNIDAD AMBIENTAL"]').fill(cargoNombreEditado);
    await page.locator('.modal-dialog button[type="submit"]:has-text("Actualizar Cargo")').click();
    await expect(page.locator('text=actualizado con éxito')).toBeVisible({ timeout: 10000 });

    // 3.7 Eliminar Cargo Institucional
    await searchCargo.fill(cargoNombreEditado);
    const rowCargoEditado = page.locator(`table.table-sucre tr:has-text("${cargoNombreEditado}")`);
    await rowCargoEditado.locator('button[title="Eliminar Cargo"]').click();
    await expect(page.locator('text=Confirmar Eliminación')).toBeVisible();
    await page.locator('.modal-dialog button:has-text("Sí, Eliminar")').click();
    await expect(page.locator('text=No se encontraron cargos institucionales que coincidan').or(page.locator('text=eliminado exitosamente'))).toBeVisible({ timeout: 10000 });

    // 3.8 Eliminar Unidad Orgánica
    await btnDirecciones.click();
    await searchUnidad.fill(nombUnidadEditada);
    const rowUnidadModificada = page.locator(`table.table-sucre tr:has-text("${nombUnidadEditada}")`);
    await expect(rowUnidadModificada).toBeVisible();

    await rowUnidadModificada.locator('button[title="Desactivar / Eliminar Unidad"]').click();
    await expect(page.locator('text=Confirmar Eliminación')).toBeVisible();
    await page.locator('.modal-dialog button:has-text("Sí, Eliminar")').click();
    await expect(page.locator('text=dada de baja exitosamente').or(page.locator('text=correctamente'))).toBeVisible({ timeout: 10000 });
  });

});
