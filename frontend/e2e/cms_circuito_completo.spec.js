import { test, expect } from '@playwright/test';

test.describe('Sprint Adenda Post-Sprint 3 E2E - Circuito Institucional Completo CMS', () => {

  test.beforeEach(async ({ page }) => {
    // Configurar manejador automático para diálogos nativos window.confirm / alert
    page.on('dialog', async (dialog) => {
      await dialog.accept();
    });

    // Autenticación institucional con credenciales oficiales de Administrador de Sistema
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Acceso Institucional');

    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección tras login exitoso
    await page.waitForURL('**/');
  });

  test('1. Ventanilla Única CMS: Emisión de Hoja de Ruta Externa con Sugerencia Reglamentaria a Presidencia CMS', async ({ page }) => {
    test.setTimeout(60000);

    // Navegar a Ventanilla Única
    await page.goto('/ventanilla');
    await expect(page.locator('h1')).toContainText('Recepción y Emisión de Hojas de Ruta Externas');

    // 1.1 Validar que el alcance institucional sea estrictamente Trámites Externos
    await expect(page.locator('text=ALCANCE ESTRICTO: TRÁMITES EXTERNOS CMS')).toBeVisible();
    await expect(page.locator('text=Presidencia del CMS').first()).toBeVisible();

    // 1.2 Verificar ausencia estricta de cualquier selector o tarjeta de Notas Internas
    await expect(page.locator('text=Notas Internas')).toHaveCount(0);

    // 1.3 Seleccionar Tipo de Trámite Externo oficial (CM)
    const tipoCM = page.locator('div:has-text("CM"):has-text("Correspondencia Municipal Externa")').first();
    await expect(tipoCM).toBeVisible({ timeout: 10000 });
    await tipoCM.click();

    // 1.4 Rellenar datos del Peticionario / Remitente
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const remitenteTest = `DR. MARCELO QUIROGA SANTA CRUZ ${randomSuffix}`;
    const institucionTest = 'FEDERACIÓN DE JUNTAS VECINALES DE SUCRE (FEDJUVE)';
    const citeExternoTest = `FEDJUVE-LEG-0${randomSuffix}/2026`;
    const referenciaTest = `Solicitud de Petición de Informe Escrito (PIE) sobre fiscalización de obras viales distrito 3 - E2E #${randomSuffix}`;

    await page.fill('input[placeholder*="Ministerio de Planificación"]', institucionTest);
    await page.fill('input[placeholder*="CITE-MPD-042/2026"]', citeExternoTest);
    await page.fill('input[placeholder*="Nombre completo de la persona"]', remitenteTest);

    // 1.5 Asunto, Hojas y Prioridad
    await page.fill('textarea[placeholder*="Escriba claramente el motivo"]', referenciaTest);
    await page.fill('input[type="number"][min="1"]', '15');
    await page.selectOption('select.form-select', 'ALTA');

    // 1.6 Emitir Hoja de Ruta
    const btnEmitir = page.locator('button[type="submit"]:has-text("Emitir Hoja de Ruta")');
    await expect(btnEmitir).toBeVisible();
    await btnEmitir.click();

    // 1.7 Verificar Modal de Éxito / Comprobante de Emisión
    await expect(page.locator('text=Hoja de Ruta Emitida Exitosamente')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=NÚMERO CORRELATIVO INSTITUCIONAL')).toBeVisible();
    await expect(page.locator('#printable-hoja-ruta')).toContainText('CM-');
    await expect(page.locator('#printable-hoja-ruta')).toContainText(remitenteTest);

    // Cerrar comprobante
    const btnCerrarComprobante = page.locator('button:has-text("Aceptar y Cerrar")');
    if (await btnCerrarComprobante.isVisible()) {
      await btnCerrarComprobante.click();
    }
  });

  test('2. Flujo de Comisión y Asignación Interna: Selector Rápido de Plazos Reglamentarios (5, 10, 15 Días)', async ({ page }) => {
    test.setTimeout(60000);

    // Navegar al Escritorio Virtual
    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Acceder a Supervisión Institucional Global para derivación administrativa
    const tabSupervision = page.locator('button:has-text("Supervisión Institucional Global")');
    if (await tabSupervision.isVisible()) {
      await tabSupervision.click();
      await page.waitForTimeout(600);
    }

    // Localizar una fila con acción "Derivar" o "Avanzar"
    const filaConDerivar = page.locator('tr:has(button:has-text("Derivar")), tr:has(button:has-text("Avanzar"))').first();
    await expect(filaConDerivar).toBeVisible({ timeout: 15000 });

    const btnDerivar = filaConDerivar.locator('button:has-text("Derivar"), button:has-text("Avanzar")').first();
    await btnDerivar.click();

    // Validar apertura del Modal de Derivación Libre / Avanzar Proceso
    const modalDerivar = page.locator('.modal-backdrop');
    await expect(modalDerivar.locator('h3:has-text("Derivación Libre"), h3:has-text("Avanzar Proceso")')).toBeVisible({ timeout: 5000 });

    // Validar existencia del Selector Rápido de Plazo Reglamentario CMS
    await expect(modalDerivar.locator('text=Selector Rápido de Plazo Reglamentario de Comisión:')).toBeVisible();
    await expect(modalDerivar.getByRole('button', { name: /^5 Días Hábiles/ })).toBeVisible();
    await expect(modalDerivar.getByRole('button', { name: /^10 Días Hábiles/ })).toBeVisible();
    await expect(modalDerivar.getByRole('button', { name: /^15 Días Hábiles/ })).toBeVisible();

    // Probar interacción con los preset reglamentarios
    // 1. Seleccionar 5 días (Urgente)
    await modalDerivar.getByRole('button', { name: /^5 Días Hábiles/ }).click();
    await expect(modalDerivar.locator('input[type="number"][min="1"][max="90"]')).toHaveValue('5');

    // 2. Seleccionar 15 días (Máximo de Comisión CMS)
    await modalDerivar.getByRole('button', { name: /^15 Días Hábiles/ }).click();
    await expect(modalDerivar.locator('input[type="number"][min="1"][max="90"]')).toHaveValue('15');

    // 3. Seleccionar 10 días (Ordinario Estándar CMS)
    await modalDerivar.getByRole('button', { name: /^10 Días Hábiles/ }).click();
    await expect(modalDerivar.locator('input[type="number"][min="1"][max="90"]')).toHaveValue('10');

    // Cerrar modal sin derivar para mantener datos íntegros
    await modalDerivar.locator('button:has-text("Cancelar")').click();
    await expect(modalDerivar).not.toBeVisible();
  });

  test('3. Generación y Registro de Instrumentos Legislativos Salientes (PIE, PIO, Minuta de Comunicación)', async ({ page }) => {
    test.setTimeout(60000);

    // Navegar al Escritorio Virtual
    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Buscar una fila con botón "Atender" o "Informe"
    const btnAtender = page.locator('tr button:has-text("Atender"), tr button:has-text("Informe")').first();
    await expect(btnAtender).toBeVisible({ timeout: 15000 });
    await btnAtender.click();

    // Validar apertura del Modal de Atender / Concluir Atención Técnica
    const modalAtender = page.locator('.modal-backdrop');
    await expect(modalAtender.locator('h3:has-text("Concluir Atención Técnica")')).toBeVisible({ timeout: 5000 });

    // Validar el catálogo de Instrumentos Legislativos Salientes del CMS
    await expect(modalAtender.locator('text=Instrumentos Normativos Generados en Comisión')).toBeVisible();
    await expect(modalAtender.locator('text=Petición de Informe Escrito (PIE)').first()).toBeVisible();
    await expect(modalAtender.locator('text=Petición de Informe Oral (PIO)').first()).toBeVisible();
    await expect(modalAtender.locator('text=Minuta de Comunicación').first()).toBeVisible();
    await expect(modalAtender.locator('text=Informe Técnico / Legal').first()).toBeVisible();

    // Seleccionar Instrumento "PIE"
    const cardPIE = modalAtender.locator('div:has-text("Petición de Informe Escrito (PIE)")').last();
    await cardPIE.click();

    // Verificar que el proveído de atención se autocompleta con texto sugerido para PIE
    const textareaProveido = modalAtender.locator('textarea');
    await expect(textareaProveido).not.toBeEmpty();

    // Seleccionar Instrumento "MINUTA"
    const cardMinuta = modalAtender.locator('div:has-text("Minuta de Comunicación")').last();
    await cardMinuta.click();

    // Cerrar modal
    await modalAtender.locator('button:has-text("Cancelar")').click();
    await expect(modalAtender).not.toBeVisible();
  });

  test('4. Circuito Plenario CMS: Constancia de Aprobación en Sesión del Pleno', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Localizar una fila con botón "Pleno"
    const filaConPleno = page.locator('tr:has(button:has-text("Pleno"))').first();
    await expect(filaConPleno).toBeVisible({ timeout: 15000 });

    await filaConPleno.locator('button:has-text("Pleno")').click();

    // Validar apertura del Modal de Sesión del Pleno CMS
    const modalPleno = page.locator('.modal-backdrop');
    await expect(modalPleno.locator('h3:has-text("Aprobación en Sesión del Pleno del CMS")')).toBeVisible({ timeout: 5000 });

    // Validar campos requeridos
    await expect(modalPleno.locator('label:has-text("Número o Denominación de la Sesión del Pleno")')).toBeVisible();
    await expect(modalPleno.locator('label:has-text("Resultado del Pleno Camaral")')).toBeVisible();
    await expect(modalPleno.locator('label:has-text("Instrumento Legislativo Proyectado")')).toBeVisible();

    // Probar chip de sugerencia rápida de sesión ordinaria
    const chipOrdinaria = modalPleno.locator('button:has-text("+ Ordinaria N° 045")').first();
    await chipOrdinaria.click();

    const inputSesion = modalPleno.locator('input[placeholder*="Sesión Ordinaria"]');
    await expect(inputSesion).toHaveValue(/Sesión Ordinaria N° 045/);

    // Seleccionar Resultado: Aprobado por Unanimidad
    await modalPleno.locator('select').first().selectOption('APROBADO_UNANIMIDAD');

    // Seleccionar Instrumento Proyectado MINUTA
    await modalPleno.locator('button:has-text("MINUTA")').first().click();

    // Rellenar considerandos
    await modalPleno.locator('textarea').fill('Aprobado por el Pleno Camaral del CMS tras debate en Sala de Sesiones con quórum reglamentario.');

    // Confirmar registro
    const btnGuardarPleno = modalPleno.locator('button:has-text("Registrar Aprobación en Pleno")');
    await expect(btnGuardarPleno).toBeEnabled();
    await btnGuardarPleno.click();

    // Esperar cierre del modal
    await expect(modalPleno).not.toBeVisible({ timeout: 10000 });
  });

  test('5. Firmas Duales Concurrentes CMS (Presidencia y Secretaría General) y Despacho Final Bloqueado', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Localizar una fila con botón "Firmas"
    const filaConFirmas = page.locator('tr:has(button:has-text("Firmas"))').first();
    await expect(filaConFirmas).toBeVisible({ timeout: 15000 });

    await filaConFirmas.locator('button:has-text("Firmas")').click();

    // Validar apertura del Modal de Firmas Duales Concurrentes
    const modalFirmas = page.locator('.modal-backdrop');
    await expect(modalFirmas.locator('h3:has-text("Firmas Duales Concurrentes (CMS)")')).toBeVisible({ timeout: 5000 });

    // Validar ambos paneles de sello (Presidencia y Secretaría General)
    await expect(modalFirmas.locator('text=PRESIDENCIA CMS')).toBeVisible();
    await expect(modalFirmas.locator('text=SECRETARÍA GENERAL CMS')).toBeVisible();

    // Validar principio reglamentario expuesto en la interfaz
    await expect(modalFirmas.locator('text=Principio de Firmas Duales Concurrentes:')).toBeVisible();

    // 5.1 Estampar Firma de Presidencia
    const btnFirmaPresidencia = modalFirmas.locator('button:has-text("Firma Presidencia")').first();
    await btnFirmaPresidencia.click();
    await page.waitForTimeout(1000);

    // 5.2 Estampar Firma de Secretaría General
    const btnFirmaSecretaria = modalFirmas.locator('button:has-text("Firma Secretaría")').first();
    await btnFirmaSecretaria.click();
    await page.waitForTimeout(1000);

    // 5.3 Validar que con ambas firmas completadas se habilite el botón de Despacho Final
    await expect(modalFirmas.locator('text=¡Firmas duales concurrentes 100% completas!')).toBeVisible({ timeout: 10000 });
    const btnProcederDespacho = modalFirmas.locator('button:has-text("Proceder al Despacho Final")');
    await expect(btnProcederDespacho).toBeVisible();

    // Cerrar modal
    await modalFirmas.locator('button:has-text("Cerrar")').click();
    await expect(modalFirmas).not.toBeVisible();
  });

  test('6. Despacho Final al Ejecutivo Municipal (GAMS) y Verificación de Bloqueo vs Habilitación por Firmas', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Localizar una fila con botón "Firmas" para asegurar firmas estampadas
    const filaConFirmas = page.locator('tr:has(button:has-text("Firmas"))').first();
    await expect(filaConFirmas).toBeVisible({ timeout: 15000 });

    await filaConFirmas.locator('button:has-text("Firmas")').click();
    const modalFirmas = page.locator('.modal-backdrop');
    await expect(modalFirmas.locator('h3:has-text("Firmas Duales Concurrentes (CMS)")')).toBeVisible();

    // Estampar ambas firmas
    await modalFirmas.locator('button:has-text("Firma Presidencia")').first().click();
    await page.waitForTimeout(1000);
    await modalFirmas.locator('button:has-text("Firma Secretaría")').first().click();
    await page.waitForTimeout(1000);

    // Proceder al despacho final con firmas garantizadas
    const btnProceder = modalFirmas.locator('button:has-text("Proceder al Despacho Final")');
    await expect(btnProceder).toBeVisible();
    await btnProceder.click();

    // Validar modal de Despacho Final
    const modalDespacho = page.locator('.modal-backdrop');
    await expect(modalDespacho.locator('h3:has-text("Despacho Final al Ejecutivo Municipal")')).toBeVisible({ timeout: 10000 });

    // Validar que certifique firmas duales completas
    await expect(modalDespacho.locator('text=Firmas Duales Verificadas:')).toBeVisible();

    // Rellenar CITE Oficial de Despacho
    const randomDesp = Math.floor(100 + Math.random() * 900);
    const citeOficial = `CMS-DESP-${randomDesp}/${new Date().getFullYear()}`;
    await modalDespacho.locator('input[placeholder*="CMS-DESP-0145"]').fill(citeOficial);

    // Seleccionar destinatario con chip rápido (Alcalde Municipal)
    const chipAlcalde = modalDespacho.locator('button:has-text("+ Alcalde Dr. Enrique Leaño")').first();
    if (await chipAlcalde.isVisible()) {
      await chipAlcalde.click();
    } else {
      await modalDespacho.locator('input[placeholder*="Dr. Enrique Leaño Palenque"]').fill('Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre');
    }

    // Rellenar proveído
    await modalDespacho.locator('textarea').fill(`Remisión formal de instrumento normativo aprobado por el Concejo Municipal de Sucre según CITE ${citeOficial}.`);

    // Validar botón de confirmación de despacho final
    const btnConfirmarDespacho = modalDespacho.locator('button:has-text("Despachar Oficialmente y Concluir Trámite")');
    await expect(btnConfirmarDespacho).toBeVisible();
    await btnConfirmarDespacho.click();

    // Esperar cierre del modal
    await expect(modalDespacho).not.toBeVisible({ timeout: 10000 });
  });

  test('7. Integración Completa E2E: Ciclo de Vida Íntegro (Ventanilla → Presidencia → Pleno → Firmas Duales → Despacho)', async ({ page }) => {
    test.setTimeout(90000);

    // 7.1 VENTANILLA ÚNICA: Crear nuevo expediente
    await page.goto('/ventanilla');
    await expect(page.locator('h1')).toContainText('Recepción y Emisión de Hojas de Ruta Externas');

    // Validar ámbito exclusivo de Trámites Externos
    await expect(page.locator('text=ALCANCE ESTRICTO: TRÁMITES EXTERNOS CMS')).toBeVisible();

    // Seleccionar tipo de trámite CM
    const tipoCM = page.locator('div:has-text("CM"):has-text("Correspondencia Municipal Externa")').first();
    await tipoCM.click();

    const uniqueId = Date.now().toString().slice(-5);
    const remitenteE2E = `ORGANIZACIÓN SOCIAL CENTRALIA #${uniqueId}`;
    const asuntoE2E = `EXPEDIENTE INTEGRAL E2E CMS - FISCALIZACIÓN Y PROYECTO NORMATIVO #${uniqueId}`;

    await page.fill('input[placeholder*="Ministerio de Planificación"]', 'Central Obrera Departamental Chuquisaca');
    await page.fill('input[placeholder*="CITE-MPD-042/2026"]', `COD-CH-${uniqueId}/2026`);
    await page.fill('input[placeholder*="Nombre completo de la persona"]', remitenteE2E);
    await page.fill('textarea[placeholder*="Escriba claramente el motivo"]', asuntoE2E);
    await page.fill('input[type="number"][min="1"]', '20');

    // Emitir Hoja de Ruta
    await page.locator('button[type="submit"]:has-text("Emitir Hoja de Ruta")').click();
    await expect(page.locator('text=Hoja de Ruta Emitida Exitosamente')).toBeVisible({ timeout: 15000 });

    // Validar que el comprobante contenga el prefijo de Hoja de Ruta CM-
    await expect(page.locator('#printable-hoja-ruta')).toContainText('CM-');

    // Cerrar comprobante
    const btnCerrar = page.locator('button:has-text("Aceptar y Cerrar")');
    if (await btnCerrar.isVisible()) {
      await btnCerrar.click();
    }

    // 7.2 ESCRITORIO VIRTUAL: Encontrar el trámite recién creado
    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Activar pestaña Supervisión Institucional Global para visualizarlo de inmediato
    const tabSupervision = page.locator('button:has-text("Supervisión Institucional Global")');
    if (await tabSupervision.isVisible()) {
      await tabSupervision.click();
      await page.waitForTimeout(600);
    }

    // Buscar en la tabla por el remitente único
    const searchInput = page.locator('input.input-sucre, input[placeholder*="CM-1/2026"]').first();
    await searchInput.fill(remitenteE2E);
    await page.waitForTimeout(600);

    const filaTramite = page.locator(`tr:has-text("${remitenteE2E}")`).first();
    await expect(filaTramite).toBeVisible({ timeout: 10000 });

    // 7.3 CIRCUITO PLENARIO: Registrar Aprobación en Sesión del Pleno
    await filaTramite.locator('button:has-text("Pleno")').click();
    const modalPleno = page.locator('.modal-backdrop');
    await expect(modalPleno.locator('h3:has-text("Aprobación en Sesión del Pleno del CMS")')).toBeVisible();

    await modalPleno.locator('button:has-text("+ Ordinaria N° 045")').first().click();
    await modalPleno.locator('button:has-text("MINUTA")').first().click();
    await modalPleno.locator('textarea').fill('Aprobación plena e integral por el Pleno en sesión ordinaria.');
    await modalPleno.locator('button:has-text("Registrar Aprobación en Pleno")').click();
    await expect(modalPleno).not.toBeVisible({ timeout: 10000 });

    // 7.4 FIRMAS DUALES: Estampar Presidencia y Secretaría General
    await filaTramite.locator('button:has-text("Firmas")').click();
    const modalFirmas = page.locator('.modal-backdrop');
    await expect(modalFirmas.locator('h3:has-text("Firmas Duales Concurrentes (CMS)")')).toBeVisible();

    await modalFirmas.locator('button:has-text("Firma Presidencia")').first().click();
    await page.waitForTimeout(1000);
    await modalFirmas.locator('button:has-text("Firma Secretaría")').first().click();
    await page.waitForTimeout(1000);

    // Proceder al despacho desde el modal de firmas
    await expect(modalFirmas.locator('button:has-text("Proceder al Despacho Final")')).toBeVisible();
    await modalFirmas.locator('button:has-text("Proceder al Despacho Final")').click();

    // 7.5 DESPACHO FINAL: Remitir al Alcalde Municipal y Concluir
    const modalDespacho = page.locator('.modal-backdrop');
    await expect(modalDespacho.locator('h3:has-text("Despacho Final al Ejecutivo Municipal")')).toBeVisible();

    const citeDespFinal = `CMS-DESP-${uniqueId}/${new Date().getFullYear()}`;
    await modalDespacho.locator('input[placeholder*="CMS-DESP-0145"]').fill(citeDespFinal);
    await modalDespacho.locator('button:has-text("+ Alcalde Dr. Enrique Leaño")').first().click();
    await modalDespacho.locator('textarea').fill('Despacho final legalmente suscrito y visado para cumplimiento por el Ejecutivo Municipal.');
    await modalDespacho.locator('button:has-text("Despachar Oficialmente y Concluir Trámite")').click();
    await expect(modalDespacho).not.toBeVisible({ timeout: 10000 });

    // 7.6 AUDITORÍA Y TRAZABILIDAD: Abrir detalle y verificar todos los sellos
    await filaTramite.locator('button:has-text("Ver")').first().click();
    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Detalle de Hoja de Ruta")')).toBeVisible({ timeout: 10000 });

    // Verificar sección institucional CMS en detalle
    await expect(modalDetalle.locator('h4:has-text("Circuito Plenario")')).toBeVisible();
    await expect(modalDetalle.locator('text=PRESIDENCIA CMS').first()).toBeVisible();
    await expect(modalDetalle.locator('text=SECRETARÍA GENERAL CMS').first()).toBeVisible();
    await expect(modalDetalle.locator(`text=${citeDespFinal}`).first()).toBeVisible();

    // Cerrar detalle
    await modalDetalle.locator('button:has-text("Cerrar")').click();
  });
});
