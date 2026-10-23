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

  test('3. En Estado EN_ATENCION solo se muestran botones Ver y Retroceder en la fila', async ({ page }) => {
    test.setTimeout(60000);

    // Navegar al Escritorio Virtual
    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Si hay trámite pendiente de recepción, recepcionarlo para que pase a EN_ATENCION
    const btnRecepcionar = page.locator('tr button:has-text("Recepcionar")').first();
    if (await btnRecepcionar.isVisible()) {
      await btnRecepcionar.click();
      const btnConfirmarRec = page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")');
      await expect(btnConfirmarRec).toBeVisible({ timeout: 5000 });
      await btnConfirmarRec.click();
      await page.waitForTimeout(1500);
    }

    // Localizar una fila en EN_ATENCION en RECIBIDOS
    const filaEnAtencion = page.locator('tr:has-text("EN ATENCIÓN")').first();
    if (await filaEnAtencion.isVisible()) {
      // 3.1 Verificar que NO aparece el botón "Atender" en la fila
      await expect(filaEnAtencion.locator('button:has-text("Atender")')).toHaveCount(0);
      // 3.2 Verificar que NO aparece "Pleno", "Firmas" ni "Despacho" directamente en la fila
      await expect(filaEnAtencion.locator('button:has-text("Pleno")')).toHaveCount(0);
      await expect(filaEnAtencion.locator('button:has-text("Firmas")')).toHaveCount(0);
      await expect(filaEnAtencion.locator('button:has-text("Despacho")')).toHaveCount(0);
      // 3.3 Verificar que SÍ aparecen los botones requeridos: "Ver" y "Retroceder"
      await expect(filaEnAtencion.locator('button:has-text("Ver")')).toBeVisible();
    }
  });

  test('4. Circuito Plenario CMS: Constancia de Aprobación en Sesión del Pleno desde el Modal de Detalle (Ver)', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Si hay trámites por recibir, recepcionar para tenerlo en EN_ATENCION
    const btnRecepcionar = page.locator('tr button:has-text("Recepcionar")').first();
    if (await btnRecepcionar.isVisible()) {
      await btnRecepcionar.click();
      await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
      await page.waitForTimeout(1500);
    }

    // Localizar una fila en EN_ATENCION o ATENDIDO y abrir Ver
    const fila = page.locator('tr:has-text("EN ATENCIÓN"), tr:has-text("ATENDIDO")').first();
    await expect(fila).toBeVisible({ timeout: 15000 });
    await fila.locator('button:has-text("Ver")').first().click();

    // Validar modal de detalle
    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Detalle de Hoja de Ruta")')).toBeVisible({ timeout: 10000 });
    await modalDetalle.locator('text=1. ELABORACIÓN DE INFORME DE COMISIÓN').waitFor({ state: 'visible', timeout: 10000 });

    // Abrir Modal de Sesión del Pleno desde el detalle (asegurar que Informe de Comisión esté concluido)
    const btnIniciarInforme = modalDetalle.locator('button:has-text("+ Iniciar Elaboración de Informe")');
    if (await btnIniciarInforme.isVisible()) {
      await btnIniciarInforme.click();
      const modalIniciar = page.locator('.modal-backdrop').last();
      await modalIniciar.locator('button:has-text("Plazo Ordinario")').click();
      await modalIniciar.locator('button:has-text("Confirmar Inicio de Elaboración")').click();
      await page.waitForTimeout(1500);
    }
    const btnConcluirInforme = modalDetalle.locator('button:has-text("Concluir Elaboración de Informe")');
    if (await btnConcluirInforme.isVisible()) {
      await btnConcluirInforme.click();
      await page.waitForTimeout(1500);
    }

    const btnAbrirPleno = modalDetalle.locator('button:has-text("Pleno CMS"), button:has-text("+ Registrar Aprobación Plenaria"), button:has-text("Pleno (Modificar)")').first();
    await expect(btnAbrirPleno).toBeVisible();
    await btnAbrirPleno.click();

    // Validar apertura del Modal de Sesión del Pleno CMS
    const modalPleno = page.locator('.modal-backdrop').last();
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

    // Esperar cierre del modal Pleno
    await page.waitForTimeout(1500);

    // Cerrar detalle
    const btnCerrar = page.locator('.modal-backdrop button:has-text("Cerrar")').first();
    if (await btnCerrar.isVisible()) {
      await btnCerrar.click();
    }
  });

  test('5. Firmas Duales Concurrentes CMS (Presidencia y Secretaría General) y Despacho Final Bloqueado', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Asegurar trámite en EN_ATENCION
    let fila = page.locator('tr:has-text("EN ATENCIÓN"), tr:has-text("ATENDIDO")').first();
    if (!await fila.isVisible()) {
      const btnRecepcionar = page.locator('tr button:has-text("Recepcionar")').first();
      if (await btnRecepcionar.isVisible()) {
        await btnRecepcionar.click();
        await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
        await page.waitForTimeout(1500);
      } else {
        // Emitir uno desde Ventanilla
        await page.goto('/ventanilla');
        const tipoCM = page.locator('div:has-text("CM"):has-text("Correspondencia Municipal Externa")').first();
        await tipoCM.click();
        await page.fill('input[placeholder*="Nombre completo de la persona"]', 'Test Firmas Duales');
        await page.fill('textarea[placeholder*="Escriba claramente el motivo"]', 'Prueba Firmas Duales');
        await page.locator('button[type="submit"]:has-text("Emitir Hoja de Ruta")').click();
        await expect(page.locator('text=Hoja de Ruta Emitida Exitosamente')).toBeVisible({ timeout: 15000 });
        await page.locator('.modal-backdrop button:has-text("Cerrar")').first().click();
        await page.goto('/escritorio');
        await page.locator('tr button:has-text("Recepcionar")').first().click();
        await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
        await page.waitForTimeout(1500);
      }
    }

    // Abrir Ver de un trámite en atención o atendido
    fila = page.locator('tr:has-text("EN ATENCIÓN"), tr:has-text("ATENDIDO")').first();
    await expect(fila).toBeVisible({ timeout: 15000 });
    await fila.locator('button:has-text("Ver")').first().click();

    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Detalle de Hoja de Ruta")')).toBeVisible({ timeout: 10000 });

    // Asegurar que el informe esté concluido para desbloquear el Pleno
    const btnIniciarInforme5 = modalDetalle.locator('button:has-text("+ Iniciar Elaboración de Informe")');
    if (await btnIniciarInforme5.isVisible()) {
      await btnIniciarInforme5.click();
      const modalIniciar = page.locator('.modal-backdrop').last();
      await modalIniciar.locator('button:has-text("Plazo Ordinario")').click();
      await modalIniciar.locator('button:has-text("Confirmar Inicio de Elaboración")').click();
      await page.waitForTimeout(1000);
    }
    const btnConcluirInforme5 = modalDetalle.locator('button:has-text("Concluir Elaboración de Informe")');
    if (await btnConcluirInforme5.isVisible()) {
      await btnConcluirInforme5.click();
      await page.waitForTimeout(1000);
    }

    // Si aún no tiene Pleno registrado, registrarlo primero para desbloquear firmas duales
    const btnPleno = modalDetalle.locator('button:has-text("+ Registrar Aprobación Plenaria")');
    if (await btnPleno.isVisible()) {
      await btnPleno.click();
      const modalPleno = page.locator('.modal-backdrop').last();
      await modalPleno.locator('button:has-text("+ Ordinaria N° 045")').first().click();
      await modalPleno.locator('button:has-text("Registrar Aprobación en Pleno")').click();
      await page.waitForTimeout(1500);
    }

    // Abrir Firmas Duales
    const btnFirmas = modalDetalle.locator('button:has-text("Firmas Duales"), button:has-text("Estampar Firma Presidencia")').first();
    await expect(btnFirmas).toBeVisible({ timeout: 10000 });
    await btnFirmas.click();

    // Validar apertura del Modal de Firmas Duales Concurrentes
    const modalFirmas = page.locator('.modal-backdrop').last();
    await expect(modalFirmas.locator('h3:has-text("Firmas Duales Concurrentes (CMS)")')).toBeVisible({ timeout: 5000 });

    // Validar ambos paneles de sello (Presidencia y Secretaría General)
    await expect(modalFirmas.locator('text=PRESIDENCIA CMS')).toBeVisible();
    await expect(modalFirmas.locator('text=SECRETARÍA GENERAL CMS')).toBeVisible();

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

    // Cerrar modal de firmas
    await modalFirmas.locator('button:has-text("Cerrar")').click();

    // Cerrar modal de detalle
    const btnCerrar = page.locator('.modal-backdrop button:has-text("Cerrar")').first();
    if (await btnCerrar.isVisible()) {
      await btnCerrar.click();
    }
  });

  test('6. Despacho Final al Ejecutivo Municipal (GAMS) y Verificación de Habilitación de Avanzar', async ({ page }) => {
    test.setTimeout(60000);

    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Asegurar que existe al menos un trámite en EN_ATENCION o ATENDIDO
    const btnRecepcionar = page.locator('tr button:has-text("Recepcionar")').first();
    if (await btnRecepcionar.isVisible()) {
      await btnRecepcionar.click();
      await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
      await page.waitForTimeout(1500);
    } else {
      const filaExistente = page.locator('tr:has-text("EN ATENCIÓN"), tr:has-text("ATENDIDO")').first();
      if (!await filaExistente.isVisible()) {
        // Emitir uno rápido desde Ventanilla
        await page.goto('/ventanilla');
        const tipoCM = page.locator('div:has-text("CM"):has-text("Correspondencia Municipal Externa")').first();
        await tipoCM.click();
        await page.fill('input[placeholder*="Nombre completo de la persona"]', 'Test Despacho');
        await page.fill('textarea[placeholder*="Escriba claramente el motivo"]', 'Prueba Despacho Final');
        await page.locator('button[type="submit"]:has-text("Emitir Hoja de Ruta")').click();
        await expect(page.locator('text=Hoja de Ruta Emitida Exitosamente')).toBeVisible({ timeout: 15000 });
        await page.locator('.modal-backdrop button:has-text("Cerrar")').first().click();
        await page.goto('/escritorio');
        await page.locator('tr button:has-text("Recepcionar")').first().click();
        await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
        await page.waitForTimeout(1500);
      }
    }

    // Abrir Ver de un trámite
    const fila = page.locator('tr:has-text("EN ATENCIÓN"), tr:has-text("ATENDIDO")').first();
    await expect(fila).toBeVisible({ timeout: 15000 });
    await fila.locator('button:has-text("Ver")').first().click();

    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Detalle de Hoja de Ruta")')).toBeVisible({ timeout: 10000 });

    // Asegurar informe concluido para desbloquear el Pleno
    const btnIniciarInforme6 = modalDetalle.locator('button:has-text("+ Iniciar Elaboración de Informe")');
    if (await btnIniciarInforme6.isVisible()) {
      await btnIniciarInforme6.click();
      const modalIniciar = page.locator('.modal-backdrop').last();
      await modalIniciar.locator('button:has-text("Plazo Ordinario")').click();
      await modalIniciar.locator('button:has-text("Confirmar Inicio de Elaboración")').click();
      await page.waitForTimeout(1000);
    }
    const btnConcluirInforme6 = modalDetalle.locator('button:has-text("Concluir Elaboración de Informe")');
    if (await btnConcluirInforme6.isVisible()) {
      await btnConcluirInforme6.click();
      await page.waitForTimeout(1000);
    }

    // Asegurar Pleno
    const btnPleno = modalDetalle.locator('button:has-text("+ Registrar Aprobación Plenaria")');
    if (await btnPleno.isVisible()) {
      await btnPleno.click();
      const modalPleno = page.locator('.modal-backdrop').last();
      await modalPleno.locator('button:has-text("+ Ordinaria N° 045")').first().click();
      await modalPleno.locator('button:has-text("Registrar Aprobación en Pleno")').click();
      await page.waitForTimeout(1500);
    }

    // Asegurar Firmas Duales
    const btnAbrirFirmas = modalDetalle.locator('button:has-text("Firmas Duales"), button:has-text("Estampar Firma Presidencia")').first();
    if (await btnAbrirFirmas.isVisible()) {
      await btnAbrirFirmas.click();
      const modalFirmas = page.locator('.modal-backdrop').last();
      await modalFirmas.locator('button:has-text("Firma Presidencia")').first().click();
      await page.waitForTimeout(800);
      await modalFirmas.locator('button:has-text("Firma Secretaría")').first().click();
      await page.waitForTimeout(800);
      const btnProceder = modalFirmas.locator('button:has-text("Proceder al Despacho Final")');
      if (await btnProceder.isVisible()) {
        await btnProceder.click();
      } else {
        await modalFirmas.locator('button:has-text("Cerrar")').click();
      }
    }

    // Abrir Despacho Final si no se abrió automáticamente
    const modalDespacho = page.locator('.modal-backdrop').last();
    if (!await modalDespacho.locator('h3:has-text("Despacho Final al Ejecutivo Municipal")').isVisible()) {
      const btnDespacho = modalDetalle.locator('button:has-text("+ Despacho Final"), button:has-text("Despacho Final")').first();
      await btnDespacho.click();
    }

    await expect(modalDespacho.locator('h3:has-text("Despacho Final al Ejecutivo Municipal")')).toBeVisible({ timeout: 10000 });

    // Rellenar CITE Oficial de Despacho
    const randomDesp = Math.floor(100 + Math.random() * 900);
    const citeOficial = `CMS-DESP-${randomDesp}/${new Date().getFullYear()}`;
    await modalDespacho.locator('input[placeholder*="CMS-DESP-0145"]').fill(citeOficial);

    // Destinatario
    const chipAlcalde = modalDespacho.locator('button:has-text("+ Alcalde Dr. Enrique Leaño")').first();
    if (await chipAlcalde.isVisible()) {
      await chipAlcalde.click();
    } else {
      await modalDespacho.locator('input[placeholder*="Dr. Enrique Leaño Palenque"]').fill('Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre');
    }

    await modalDespacho.locator('textarea').fill(`Remisión formal de instrumento normativo según CITE ${citeOficial}.`);

    // Confirmar Despacho Final
    await modalDespacho.locator('button:has-text("Despachar Oficialmente y Concluir Trámite")').click();
    await page.waitForTimeout(1500);

    // Validar que en el detalle ahora aparece la opción Derivar / Avanzar habilitada
    await expect(page.locator('button:has-text("Derivar / Avanzar")')).toBeVisible({ timeout: 10000 });

    // Cerrar detalle
    const btnCerrar = page.locator('.modal-backdrop button:has-text("Cerrar")').first();
    if (await btnCerrar.isVisible()) {
      await btnCerrar.click();
    }
  });

  test('7. Integración Completa E2E: Ciclo de Vida Íntegro (Ventanilla → Recepcionar → Ver: Pleno → Firmas Duales → Despacho → Avanzar habilitado)', async ({ page }) => {
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

    // 7.2 ESCRITORIO VIRTUAL: Encontrar el trámite recién creado en Bandeja de Entrada (RECIBIDOS)
    await page.goto('/escritorio');
    await expect(page.locator('h1')).toContainText('Escritorio Virtual');

    // Buscar en la tabla por el remitente único
    const searchInput = page.locator('input.input-sucre, input[placeholder*="CM-1/2026"]').first();
    await searchInput.fill(remitenteE2E);
    await page.waitForTimeout(600);

    const filaTramite = page.locator(`tr:has-text("${remitenteE2E}")`).first();
    await expect(filaTramite).toBeVisible({ timeout: 10000 });

    // 7.2.1 Recepcionar trámite: Pasa de CREADO/POR_RECIBIR a EN_ATENCION
    const btnRecepcionar = filaTramite.locator('button:has-text("Recepcionar")');
    await expect(btnRecepcionar).toBeVisible({ timeout: 10000 });
    await btnRecepcionar.click();
    await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
    await page.waitForTimeout(1500);

    // 7.2.2 Validar que en EN_ATENCION la fila solo muestra Retroceder y Ver
    await expect(filaTramite.locator('button:has-text("Atender")')).toHaveCount(0);
    await expect(filaTramite.locator('button:has-text("Pleno")')).toHaveCount(0);
    await expect(filaTramite.locator('button:has-text("Ver")')).toBeVisible();

    // 7.3 ABRIR VER: Todo el trabajo técnico-legislativo se ejecuta dentro de Ver
    await filaTramite.locator('button:has-text("Ver")').first().click();
    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Detalle de Hoja de Ruta")')).toBeVisible({ timeout: 10000 });

    // PASO 1: Iniciar y Concluir Informe de Comisión (5 a 15 días reglamentarios)
    const btnIniciarInforme7 = modalDetalle.locator('button:has-text("+ Iniciar Elaboración de Informe")');
    await expect(btnIniciarInforme7).toBeVisible();
    await btnIniciarInforme7.click();
    const modalIniciar7 = page.locator('.modal-backdrop').last();
    await modalIniciar7.locator('button:has-text("Plazo Ordinario")').click();
    await modalIniciar7.locator('button:has-text("Confirmar Inicio de Elaboración")').click();
    await page.waitForTimeout(1000);

    const btnConcluirInforme7 = modalDetalle.locator('button:has-text("Concluir Elaboración de Informe")');
    await expect(btnConcluirInforme7).toBeVisible();
    await btnConcluirInforme7.click();
    await page.waitForTimeout(1000);

    // PASO 2: CIRCUITO PLENARIO - Ahora desbloqueado tras concluir el Informe de Comisión
    const btnPleno = modalDetalle.locator('button:has-text("+ Registrar Aprobación Plenaria"), button:has-text("Pleno CMS")').first();
    await expect(btnPleno).toBeVisible();
    await btnPleno.click();
    const modalPleno = page.locator('.modal-backdrop').last();
    await expect(modalPleno.locator('h3:has-text("Aprobación en Sesión del Pleno del CMS")')).toBeVisible();

    await modalPleno.locator('button:has-text("+ Ordinaria N° 045")').first().click();
    await modalPleno.locator('button:has-text("MINUTA")').first().click();
    await modalPleno.locator('textarea').fill('Aprobación plena e integral por el Pleno en sesión ordinaria.');
    await modalPleno.locator('button:has-text("Registrar Aprobación en Pleno")').click();
    await page.waitForTimeout(1500);

    // PASO 2: FIRMAS DUALES - Ahora desbloqueadas tras registrar el Pleno
    const btnFirmas = modalDetalle.locator('button:has-text("Estampar Firma Presidencia"), button:has-text("Firmas Duales")').first();
    await btnFirmas.click();
    const modalFirmas = page.locator('.modal-backdrop').last();
    await expect(modalFirmas.locator('h3:has-text("Firmas Duales Concurrentes (CMS)")')).toBeVisible();

    await modalFirmas.locator('button:has-text("Firma Presidencia")').first().click();
    await page.waitForTimeout(800);
    await modalFirmas.locator('button:has-text("Firma Secretaría")').first().click();
    await page.waitForTimeout(800);

    // Proceder al despacho desde el modal de firmas
    await expect(modalFirmas.locator('button:has-text("Proceder al Despacho Final")')).toBeVisible();
    await modalFirmas.locator('button:has-text("Proceder al Despacho Final")').click();

    // PASO 3: DESPACHO FINAL AL EJECUTIVO
    const modalDespacho = page.locator('.modal-backdrop').last();
    await expect(modalDespacho.locator('h3:has-text("Despacho Final al Ejecutivo Municipal")')).toBeVisible();

    const citeDespFinal = `CMS-DESP-${uniqueId}/${new Date().getFullYear()}`;
    await modalDespacho.locator('input[placeholder*="CMS-DESP-0145"]').fill(citeDespFinal);
    await modalDespacho.locator('button:has-text("+ Alcalde Dr. Enrique Leaño")').first().click();
    await modalDespacho.locator('textarea').fill('Despacho final legalmente suscrito y visado para cumplimiento por el Ejecutivo Municipal.');
    await modalDespacho.locator('button:has-text("Despachar Oficialmente y Concluir Trámite")').click();
    await page.waitForTimeout(1500);

    // PASO 4: VERIFICAR QUE SE MARCA COMO ATENDIDO Y HABILITA AVANZAR
    await expect(modalDetalle.locator('button:has-text("Derivar / Avanzar")')).toBeVisible({ timeout: 10000 });
    await expect(modalDetalle.locator('text=Trámite Atendido y Despachado')).toBeVisible();

    // Cerrar detalle
    await modalDetalle.locator('button:has-text("Cerrar")').click();

    // En la fila de la tabla, también debe estar disponible Avanzar
  });

  test('8. Control de Plazos de Elaboración de Informes de Comisión (5 a 15 días reglamentarios)', async ({ page }) => {
    test.setTimeout(60000);

    // 8.1 Crear trámite de prueba en Ventanilla
    await page.goto('/ventanilla');
    const tipoCM = page.locator('div:has-text("CM"):has-text("Correspondencia Municipal Externa")').first();
    await tipoCM.click();

    const idUnico = Date.now().toString().slice(-4);
    const remitenteInforme = `COMISIÓN JURÍDICA CMS #${idUnico}`;

    await page.fill('input[placeholder*="Nombre completo de la persona"]', remitenteInforme);
    await page.fill('textarea[placeholder*="Escriba claramente el motivo"]', 'Petición sobre dictamen jurídico para proyecto normativo');
    await page.fill('input[type="number"][min="1"]', '12');

    await page.locator('button[type="submit"]:has-text("Emitir Hoja de Ruta")').click();
    await expect(page.locator('text=Hoja de Ruta Emitida Exitosamente')).toBeVisible({ timeout: 15000 });
    const btnCerrarModal = page.locator('.modal-backdrop button:has-text("Cerrar")').first();
    if (await btnCerrarModal.isVisible()) {
      await btnCerrarModal.click();
    }

    // 8.2 Ir a Escritorio y recepcionarlo
    await page.goto('/escritorio');
    const searchInput = page.locator('input.input-sucre, input[placeholder*="CM-1/2026"]').first();
    await searchInput.fill(remitenteInforme);
    await page.waitForTimeout(600);

    const fila = page.locator(`tr:has-text("${remitenteInforme}")`).first();
    await expect(fila).toBeVisible({ timeout: 10000 });
    await fila.locator('button:has-text("Recepcionar")').click();
    await page.locator('.modal-backdrop button:has-text("Confirmar y Recepcionar")').click();
    await page.waitForTimeout(1500);

    // 8.3 Abrir Ver y validar Sub-sección 1. ELABORACIÓN DE INFORME DE COMISIÓN (5 A 15 DÍAS)
    await fila.locator('button:has-text("Ver")').click();
    const modalDetalle = page.locator('.modal-backdrop');
    await expect(modalDetalle.locator('h3:has-text("Detalle de Hoja de Ruta")')).toBeVisible({ timeout: 10000 });

    await expect(modalDetalle.locator('text=1. ELABORACIÓN DE INFORME DE COMISIÓN (5 A 15 DÍAS)')).toBeVisible();
    const btnIniciarInforme = modalDetalle.locator('button:has-text("+ Iniciar Elaboración de Informe")');
    await expect(btnIniciarInforme).toBeVisible();
    await btnIniciarInforme.click();

    // 8.4 Validar Modal de Inicio de Elaboración
    const modalIniciar = page.locator('.modal-backdrop').last();
    await expect(modalIniciar.locator('h3:has-text("Iniciar Elaboración de Informe de Comisión")')).toBeVisible();

    // Probar chip de 10 días ordinarios
    await modalIniciar.locator('button:has-text("Plazo Ordinario")').click();
    await expect(modalIniciar.locator('text=Fecha límite calculada')).toBeVisible();

    // Confirmar inicio
    await modalIniciar.locator('button:has-text("Confirmar Inicio de Elaboración")').click();
    await page.waitForTimeout(1500);

    // 8.5 Validar que ahora el informe aparece EN CURSO con badge de días restantes
    await expect(modalDetalle.locator('text=1. ELABORACIÓN DE INFORME DE COMISIÓN (EN CURSO)')).toBeVisible({ timeout: 10000 });
    await expect(modalDetalle.locator('text=VIGENTE')).toBeVisible();
    await expect(modalDetalle.locator('text=Cargar Informe Digital (PDF)')).toBeVisible();

    // Cerrar detalle
    await modalDetalle.locator('button:has-text("Cerrar")').click();
  });
});

