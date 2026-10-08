import { test, expect } from '@playwright/test';

test.describe('Sprint 2 E2E - Core del Proceso y Trámites Externos (DB_TRAMITES_EXTERNOS)', () => {

  test.beforeEach(async ({ page }) => {
    // Configurar manejador automático para diálogos nativos window.confirm / alert
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Autenticación institucional con cuenta de Administrador de Sistema
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso Institucional');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección tras login exitoso
    await page.waitForURL('**/');
  });

  test('1. Catálogo Institucional y Ciclo CRUD de Tipos de Trámite Externo (CM, CDE1, CDE2, CDH1)', async ({ page }) => {
    test.setTimeout(60000);

    // 1.1 Navegar al Hub de Administración y a la pestaña Trámites Externos
    await page.goto('/admin');
    await expect(page.locator('h1:has-text("Gestión de Personas, Cuentas y Roles")')).toBeVisible({ timeout: 10000 });

    const tabTiposExternos = page.locator('button:has-text("Trámites Externos")');
    await expect(tabTiposExternos).toBeVisible();
    await tabTiposExternos.click();

    // 1.2 Verificar que el catálogo institucional cargue los tipos oficiales requeridos
    await expect(page.locator('h3:has-text("Catálogo Oficial de Hojas de Ruta y Correspondencia Externa")')).toBeVisible();
    
    // Validar existencia de tipos preestablecidos de la Gaceta Municipal
    await expect(page.locator('tr:has-text("CM")')).toBeVisible();
    await expect(page.locator('tr:has-text("Correspondencia Municipal Externa")')).toBeVisible();
    await expect(page.locator('tr:has-text("CDE1")')).toBeVisible();
    await expect(page.locator('tr:has-text("Contratos Institucionales")')).toBeVisible();
    await expect(page.locator('tr:has-text("CDE2")')).toBeVisible();
    await expect(page.locator('tr:has-text("Convenios Interinstitucionales")')).toBeVisible();
    await expect(page.locator('tr:has-text("CDH1")')).toBeVisible();
    await expect(page.locator('tr:has-text("Condecoraciones y Distinciones")')).toBeVisible();

    // 1.3 Crear un nuevo Tipo de Trámite Externo
    const btnNuevo = page.locator('button:has-text("Nuevo Tipo Externo")');
    await expect(btnNuevo).toBeVisible();
    await btnNuevo.click();

    const modalTipo = page.locator('.modal-backdrop');
    await expect(modalTipo.locator('h2:has-text("Nuevo Tipo de Trámite Externo")')).toBeVisible();

    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const testCodigo = `CTE${randomSuffix}`;
    const testNombre = `PERITAJES Y AUDITORIAS EXTERNAS ${randomSuffix}`;
    const testDesc = `Flujo oficial de auditorías técnicas y peritajes municipales para la gestión ${new Date().getFullYear()}`;

    await modalTipo.locator('input[placeholder*="Ej. CM"]').fill(testCodigo);
    await modalTipo.locator('input[placeholder*="Ej. Correspondencia Municipal"]').fill(testNombre);
    await modalTipo.locator('textarea').fill(testDesc);
    await modalTipo.locator('input[type="number"]').fill('36');

    // Seleccionar unidad responsable si hay opciones disponibles en el select
    const selectUbicacion = modalTipo.locator('select');
    const ubicacionOptionsCount = await selectUbicacion.locator('option').count();
    if (ubicacionOptionsCount > 1) {
      await selectUbicacion.selectOption({ index: 1 });
    }

    await modalTipo.locator('button[type="submit"]:has-text("Registrar Trámite")').click();
    await expect(page.locator(`text=Trámite externo '${testCodigo} - ${testNombre}' registrado con éxito`)).toBeVisible({ timeout: 10000 });

    // 1.4 Buscar el tipo recién creado en el filtro de la tabla
    const searchInput = page.locator('input[placeholder*="Buscar por código"]');
    await searchInput.fill(testCodigo);
    await page.waitForTimeout(400);

    const createdRow = page.locator(`tr:has-text("${testCodigo}")`);
    await expect(createdRow).toBeVisible();
    await expect(createdRow).toContainText('36 hrs');
    await expect(createdRow.locator('.badge-vigente')).toContainText('VIGENTE');

    // 1.5 Editar el tipo de trámite recién creado
    await createdRow.locator('button[title*="Editar"]').click();
    await expect(modalTipo.locator('h2:has-text("Editar Tipo de Trámite Externo")')).toBeVisible();

    const updatedNombre = `${testNombre} - MODIFICADO`;
    await modalTipo.locator('input[placeholder*="Ej. Correspondencia Municipal"]').fill(updatedNombre);
    await modalTipo.locator('input[type="number"]').fill('48');

    await modalTipo.locator('button[type="submit"]:has-text("Actualizar Trámite")').click();
    await expect(page.locator(`text=actualizado con éxito`)).toBeVisible({ timeout: 10000 });

    // Verificar datos actualizados en la tabla
    await expect(page.locator(`tr:has-text("${testCodigo}")`)).toContainText(updatedNombre);
    await expect(page.locator(`tr:has-text("${testCodigo}")`)).toContainText('48 hrs');

    // 1.6 Dar de baja lógica (Inactivar)
    const rowToDeactivate = page.locator(`tr:has-text("${testCodigo}")`);
    await rowToDeactivate.locator('button[title*="Dar de baja"]').click();

    const confirmModal = page.locator('.modal-backdrop');
    await expect(confirmModal.locator('h2:has-text("Dar de Baja Trámite")')).toBeVisible();
    await confirmModal.locator('button:has-text("Sí, Dar de Baja")').click();

    await expect(page.locator(`text=dado de baja exitosamente`)).toBeVisible({ timeout: 10000 });

    // 1.7 Filtrar por dados de baja y verificar estado inactivo
    const filterSelect = page.locator('select:has-text("Mostrar:")');
    await filterSelect.selectOption('inactivos');
    await page.waitForTimeout(400);

    const inactiveRow = page.locator(`tr:has-text("${testCodigo}")`);
    await expect(inactiveRow).toBeVisible();
    await expect(inactiveRow.locator('.badge-alerta')).toContainText('INACTIVO');

    // 1.8 Reactivar el trámite externo
    await inactiveRow.locator('button[title*="Reactivar"]').click();
    await expect(confirmModal.locator('h2:has-text("Reactivar Trámite")')).toBeVisible();
    await confirmModal.locator('button:has-text("Sí, Reactivar")').click();

    await expect(page.locator(`text=reactivado exitosamente`)).toBeVisible({ timeout: 10000 });

    // Volver al filtro de activos y confirmar presencia vigente
    await filterSelect.selectOption('activos');
    await searchInput.fill(testCodigo);
    await expect(page.locator(`tr:has-text("${testCodigo}") .badge-vigente`)).toContainText('VIGENTE');
  });

  test('2. Integración DB_TRAMITES_EXTERNOS: Búsqueda y Autocompletado desde TEmpleados por CI', async ({ page }) => {
    test.setTimeout(45000);

    // Navegar a Administración -> Ciudadanos y Solicitantes
    await page.goto('/admin');
    await page.click('button:has-text("Ciudadanos y Solicitantes")');

    // Abrir modal de nuevo ciudadano
    await page.click('button:has-text("Nuevo Ciudadano")');
    const modal = page.locator('.modal-backdrop');
    await expect(modal.locator('text=Registrar Nuevo Ciudadano / Solicitante')).toBeVisible();

    // Probar el buscador integrado de padrón de personal municipal (TEmpleados)
    const inputCiPadrón = modal.locator('input[placeholder*="Ingrese CI del funcionario"]');
    await expect(inputCiPadrón).toBeVisible();

    // Buscar funcionario existente por CI (2000002 correspondiente a María Fernández)
    await inputCiPadrón.fill('2000002');
    await modal.locator('button:has-text("Buscar en Padrón")').click();

    // Validar tarjeta de coincidencia encontrada
    await expect(modal.locator('text=MARIA FERNANDEZ ROJAS')).toBeVisible({ timeout: 5000 });
    await expect(modal.locator('text=CI: 2000002')).toBeVisible();

    // Aplicar autocompletado
    const btnAuto = modal.locator('button:has-text("Autocompletar Formulario")');
    await expect(btnAuto).toBeVisible();
    await btnAuto.click();

    // Validar que los campos del formulario se hayan poblado automáticamente
    const inputNombres = modal.locator('label:has-text("Nombres") + input');
    const inputPaterno = modal.locator('label:has-text("Apellido Paterno") + input');
    const inputCi = modal.locator('label:has-text("Cédula de Identidad") + input');

    await expect(inputNombres).toHaveValue('MARIA');
    await expect(inputPaterno).toHaveValue('FERNANDEZ');
    await expect(inputCi).toHaveValue('2000002');

    // Cerrar modal sin guardar para no alterar registros preexistentes
    await modal.locator('button:has-text("Cancelar")').click();
    await expect(modal).not.toBeVisible();
  });

  test('3. Flujo Completo en Ventanilla Única: Cascada Institucional, Adjunto PDF y Emisión con Correlativo Anual', async ({ page }) => {
    test.setTimeout(60000);

    // 3.1 Navegar al módulo oficial de Ventanilla Única
    await page.goto('/ventanilla');
    await expect(page.locator('h1:has-text("Recepción y Emisión de Hojas de Ruta Externas")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.badge-sucre:has-text("VENTANILLA ÚNICA Y DESPACHOS MUNICIPALES")')).toBeVisible();

    // Verificar pestaña activa "Emitir Nueva Hoja de Ruta"
    await expect(page.locator('button.btn-primary:has-text("Emitir Nueva Hoja de Ruta")')).toBeVisible();

    // 3.2 Seleccionar Tipo de Trámite Externo: Correspondencia Municipal Externa (CM)
    const cardTipoCM = page.locator('div:has-text("CM"):has-text("Correspondencia Municipal Externa")').last();
    await expect(cardTipoCM).toBeVisible();
    await cardTipoCM.click();

    // Verificar que el widget lateral calcule y previsualice el correlativo anual
    const cardCorrelativo = page.locator('.card:has-text("Hoja de Ruta Institucional")');
    await expect(cardCorrelativo).toBeVisible();
    await expect(cardCorrelativo).toContainText('CM-');
    await expect(cardCorrelativo).toContainText(`${new Date().getFullYear()}`);

    // 3.3 Completar Datos del Remitente y Procedencia
    const randomCI = Math.floor(2000000 + Math.random() * 7000000);
    const remitenteInstitucion = 'Colegio de Arquitectos de Chuquisaca - CACH';
    const remitenteCite = `CACH-DIR-P-${randomCI.toString().slice(-4)}`;
    const remitenteNombre = `Arq. Fernando Arancibia Vargas (${randomCI.toString().slice(-4)})`;
    const referenciaAsunto = `Solicitud de revisión técnica y visado de proyecto de restauración patrimonial zona central`;

    await page.fill('input[placeholder*="Ministerio de Planificación"]', remitenteInstitucion);
    await page.fill('input[placeholder*="CITE-MPD-042/2026"]', remitenteCite);
    await page.fill('input[placeholder*="Nombre completo de la persona que remite"]', remitenteNombre);

    // 3.4 Completar Asunto, Fojas y Nivel de Prioridad
    await page.fill('textarea[placeholder*="Escriba claramente el motivo"]', referenciaAsunto);
    await page.fill('input[type="number"][min="1"]', '12');
    await page.fill('input[type="number"][min="0"]', '3');
    await page.selectOption('select.form-select', 'ALTA');

    // 3.5 Probar Selectores Institucionales en Cascada (TUnidad -> TCargo)
    const selectUnidad = page.locator('label:has-text("Unidad Institucional") + * select, select:has(option:has-text("DIRECCION"))').first();
    await expect(selectUnidad).toBeVisible();

    // Seleccionar una unidad institucional (por ejemplo la segunda opción válida)
    const opcionesUnidad = await selectUnidad.locator('option').all();
    expect(opcionesUnidad.length).toBeGreaterThan(1);
    await selectUnidad.selectOption({ index: 1 });

    // Esperar a que el selector dependiente de Cargo Institucional cargue y se habilite
    const selectCargo = page.locator('label:has-text("Cargo Institucional") + * select, select:has(option:has-text("DIRECTOR")), select:has(option:has-text("ENCARGADO"))').first();
    await expect(selectCargo).toBeEnabled({ timeout: 5000 });

    const opcionesCargo = await selectCargo.locator('option').all();
    if (opcionesCargo.length > 1) {
      await selectCargo.selectOption({ index: 1 });
    }

    // 3.6 Probar Asignación de Funcionario desde Padrón TEmpleados
    const searchEmpleadoInput = page.locator('input[placeholder*="Ingrese CI del funcionario"]');
    await searchEmpleadoInput.fill('6000006');
    await page.locator('button:has-text("Buscar en Padrón")').click();

    await expect(page.locator('text=JUAN CARLOS SANCHEZ MENDOZA').first()).toBeVisible({ timeout: 5000 });
    await page.locator('button:has-text("Autocompletar Formulario")').click();

    // Validar que se muestre la confirmación del funcionario destinatario
    await expect(page.locator('text=Funcionario Destinatario Seleccionado')).toBeVisible();
    await expect(page.locator('text=JUAN CARLOS SANCHEZ MENDOZA (CI: 6000006)')).toBeVisible();

    // 3.7 Seleccionar Decreto/Instrucción Sugerida
    const btnInstruccion = page.locator('button:has-text("Para informe técnico y recomendación legal pertinente")');
    await btnInstruccion.click();

    await page.fill(
      'textarea[placeholder*="Instrucciones específicas"]',
      'Ingresado por ventanilla central con memorial en original, planimetrías y CD con respaldo digital.'
    );

    // 3.8 Adjuntar Documento Digital de Respaldo en formato PDF (RF-07)
    // Crear un buffer PDF válido para la subida
    const dummyPdfBuffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (Memorial Respaldo Arquitectos) /Author (CACH) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );

    const fileInput = page.locator('input[type="file"][accept*=".pdf"]');
    await fileInput.setInputFiles({
      name: 'memorial_restauracion_patrimonial.pdf',
      mimeType: 'application/pdf',
      buffer: dummyPdfBuffer
    });

    // Validar que el archivo adjunto se reconozca en la interfaz
    await expect(page.locator('text=memorial_restauracion_patrimonial.pdf')).toBeVisible();

    // 3.9 Emitir Hoja de Ruta Oficial
    const btnEmitir = page.locator('button[type="submit"]:has-text("Emitir Hoja de Ruta")');
    await expect(btnEmitir).toBeEnabled();
    await btnEmitir.click();

    // 3.10 Validar Modal de Hoja de Ruta Emitida Exitosamente
    const modalComprobante = page.locator('.modal-backdrop');
    await expect(modalComprobante.locator('h3:has-text("Hoja de Ruta Emitida Exitosamente")')).toBeVisible({ timeout: 15000 });
    await expect(modalComprobante.locator('text=Gobierno Autónomo Municipal de Sucre')).toBeVisible();

    // Validar Correlativo Oficial generado (formato: CM-X/YYYY)
    const printableArea = modalComprobante.locator('#printable-hoja-ruta');
    await expect(printableArea).toBeVisible();
    const emittedText = await printableArea.innerText();
    const correlativoMatch = emittedText.match(/CM-\d+\/\d{4}/);
    expect(correlativoMatch).toBeTruthy();
    const cleanCorrelativo = correlativoMatch[0];

    // Validar datos en el comprobante oficial
    await expect(modalComprobante).toContainText(remitenteNombre);
    await expect(modalComprobante).toContainText(remitenteInstitucion);
    await expect(modalComprobante).toContainText('12'); // Fojas
    await expect(modalComprobante).toContainText('memorial_restauracion_patrimonial.pdf');

    // Cerrar el modal de comprobante
    await modalComprobante.locator('button:has-text("Cerrar")').click();
    await expect(modalComprobante).not.toBeVisible();

    // 3.11 Verificar en el Libro Diario / Historial de Recepciones
    const tabHistorial = page.locator('button:has-text("Correspondencias Recepcionadas")');
    await tabHistorial.click();

    await expect(page.locator('h3:has-text("Libro Diario de Recepciones en Ventanilla Única")')).toBeVisible();

    // Buscar el correlativo recién emitido en el buscador del libro diario
    const searchLibro = page.locator('input[placeholder*="Buscar por correlativo"]');
    await searchLibro.fill(cleanCorrelativo);
    await page.waitForTimeout(400);

    // Validar que figure en la tabla con sus atributos oficiales
    const rowHistorial = page.locator(`tr:has-text("${cleanCorrelativo}")`);
    await expect(rowHistorial).toBeVisible();
    await expect(rowHistorial).toContainText(remitenteNombre);
    await expect(rowHistorial).toContainText('12 fojas');
    await expect(rowHistorial.locator('text=1 PDF')).toBeVisible();

    // 3.12 Abrir modal de detalle desde el libro diario con el botón "Ver"
    await rowHistorial.locator('button:has-text("Ver")').click();
    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Hoja de Ruta Emitida Exitosamente")')).toBeVisible();
    await expect(modalDetalle).toContainText(cleanCorrelativo);
    await expect(modalDetalle).toContainText('memorial_restauracion_patrimonial.pdf');

    // Cerrar modal final
    await modalDetalle.locator('button:has-text("Cerrar")').click();
    await expect(modalDetalle).not.toBeVisible();
  });

});
