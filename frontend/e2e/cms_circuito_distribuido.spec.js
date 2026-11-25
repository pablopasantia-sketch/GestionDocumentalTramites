import { test, expect } from '@playwright/test';
import { DESTINATARIO_FINAL_DEFAULT } from '../src/utils/flujoExterno';

// =============================================================================
// E2E — Circuito externo distribuido del Concejo Municipal de Sucre
//
// Recorre la cadena completa con usuarios reales:
//   cargo054 -> jcervantes -> cargo032 -> cargo023 -> ddavalos
//   -> jcervantes (1.ª firma) -> mavendano (2.ª firma y despacho final)
//
// Además valida la custodia estricta y que el backend rechace transiciones
// no permitidas aunque la UI fuese manipulada.
// =============================================================================

const API_BASE = process.env.E2E_API_URL || 'http://localhost:5000/api';

const PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n' +
  '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n' +
  'trailer<</Root 1 0 R>>\n%%EOF',
  'utf8'
);

test.describe('Circuito externo distribuido CMS', () => {
  test.describe.configure({ mode: 'serial' });

  let tramiteId = null;
  let referencia = null;
  let correlativo = null;

  const sufijo = Date.now().toString().slice(-8);
  const marcaTiempo = `E2E-CIRCUITO-${sufijo}`;

  const fila = (page) => page.locator('tbody tr').filter({ hasText: referencia });

  const login = async (page, username) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('gestion_doc_token');
      localStorage.removeItem('gestion_doc_user');
      sessionStorage.clear();
    });
    await page.goto('/login');
    await page.reload();

    await expect(page.locator('#username')).toBeVisible({ timeout: 15000 });
    await page.fill('#username', username);
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });

    const token = await page.evaluate(() => localStorage.getItem('gestion_doc_token'));
    expect(token, `El login de ${username} no persistió el token`).toBeTruthy();
    return token;
  };

  const irAEscritorio = async (page, username) => {
    const token = await login(page, username);
    await page.goto('/escritorio');
    await expect(
      page.getByRole('heading', { name: /Escritorio Virtual de Trámites y Bandejas/i })
    ).toBeVisible({ timeout: 20000 });
    return token;
  };

  const irASupervisionComoAdmin = async (page) => {
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.removeItem('gestion_doc_token');
      localStorage.removeItem('gestion_doc_user');
      sessionStorage.clear();
    });
    await page.goto('/login');
    await expect(page.locator('#username')).toBeVisible({ timeout: 15000 });
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/', { timeout: 20000 });

    // El usuario admin es multi-rol: hay que seleccionar Administrador de Trámites.
    await page.click('button[title="Opciones de perfil y sesión"]');
    const rolAdminTramites = page.locator('button:has-text("Administrador de Trámites")');
    await expect(rolAdminTramites).toBeVisible();
    await rolAdminTramites.click();
    await expect(page.locator('.user-tag-role')).toContainText('Administrador de Trámites');

    const token = await page.evaluate(() => localStorage.getItem('gestion_doc_token'));
    expect(token, 'El cambio de rol no persistió el token de ADMIN_TRAMITES').toBeTruthy();

    await page.goto('/admin');
    await expect(
      page.locator('h1:has-text("Gestión de Procesos, Tiempos SLA y Supervisión de Trámites")')
    ).toBeVisible({ timeout: 20000 });
    return token;
  };

  const esperarFila = async (page) => {
    await expect(fila(page)).toHaveCount(1, { timeout: 20000 });
    return fila(page);
  };

  // Tras el Despacho Final el concluido debe salir de Recibidos y aparecer en
  // Despachados (migración 048), sin acciones ejecutables en ninguna de ellas.
  const verificarConcluidoEnDespachados = async (page, cite) => {
    await expect(fila(page)).toHaveCount(0, { timeout: 20000 });

    await page.getByRole('button', { name: /Bandeja de Despachados/ }).click();
    const rowDespachado = await esperarFila(page);
    await expect(rowDespachado).toContainText('CONCLUIDO');
    await expect(rowDespachado).toContainText(cite);
    await expect(rowDespachado.getByTestId('btn-despacho-final')).toHaveCount(0);
    await expect(rowDespachado.getByTestId('btn-firmar-secretaria')).toHaveCount(0);
    await expect(rowDespachado.getByTestId('btn-recepcionar')).toHaveCount(0);
    return rowDespachado;
  };

  const recepcionar = async (page, proveido) => {
    const row = await esperarFila(page);
    await expect(row.getByTestId('btn-recepcionar')).toBeVisible({ timeout: 15000 });
    // Sin recepción previa no debe mostrarse la acción de derivar.
    await expect(row.getByTestId('btn-derivar')).toHaveCount(0);

    await row.getByTestId('btn-recepcionar').click();
    const modal = page.getByTestId('modal-recepcionar');
    await expect(modal).toBeVisible();
    await page.getByTestId('recepcion-proveido').fill(proveido);

    const respuesta = page.waitForResponse(
      (r) => r.url().includes('/recepcionar') && r.request().method() === 'POST'
    );
    await page.getByTestId('btn-confirmar-recepcion').click();
    const res = await respuesta;
    expect(res.ok(), await res.text()).toBeTruthy();
    await expect(modal).toBeHidden({ timeout: 15000 });
  };

  const derivar = async (page, { destino, funcionario, proveido, plazo, destinoFijo = false }) => {
    const row = await esperarFila(page);
    await expect(row.getByTestId('btn-derivar')).toBeVisible({ timeout: 15000 });
    await row.getByTestId('btn-derivar').click();

    const modal = page.getByTestId('modal-derivar');
    await expect(modal).toBeVisible();

    if (destinoFijo) {
      // La derivación desde comisión ya no vuelve a pedir plazo, instrumentos
      // ni PDF: todo eso se registró en el modal Atender / Informe.
      await expect(page.getByTestId('derivar-pdf')).toHaveCount(0);
      await expect(page.locator('[data-testid^="instrumento-"]')).toHaveCount(0);
    }

    if (plazo) {
      await expect(page.getByTestId(`plazo-${plazo}`)).toBeVisible();
      await page.getByTestId(`plazo-${plazo}`).click();
    }

    if (destino) {
      const selector = page.getByTestId('derivar-destino');
      // Cuando la etapa solo admite un destino el select se muestra deshabilitado
      // y ya viene preseleccionado con ese valor.
      if (await selector.isEnabled()) {
        await selector.selectOption(destino);
      } else {
        await expect(selector.locator('option')).toHaveCount(1);
        await expect(selector).toHaveValue(destino);
      }
    }

    if (funcionario) {
      const selector = page.getByTestId('derivar-funcionario');
      await expect(
        selector.locator(`option[value="${funcionario}"]`)
      ).toHaveCount(1, { timeout: 15000 });
      await selector.selectOption(funcionario);
    }

    await page.getByTestId('derivar-proveido').fill(proveido);

    const respuesta = page.waitForResponse(
      (r) => r.url().includes('/derivar') && r.request().method() === 'POST'
    );
    await page.getByTestId('derivar-submit').click();
    const res = await respuesta;
    expect(res.ok(), await res.text()).toBeTruthy();
    await expect(modal).toBeHidden({ timeout: 15000 });
  };

  const atenderComision = async (page, proveido) => {
    const row = await esperarFila(page);
    await row.getByTestId('btn-atender-comision').click();

    const modal = page.getByTestId('modal-atender-comision');
    await expect(modal).toBeVisible();

    await page.getByTestId('instrumento-PIE').locator('input').check();
    await page.getByTestId('instrumento-MINUTA').locator('input').check();
    await page.getByTestId('atender-pdf').setInputFiles({
      name: `informe-comision-${sufijo}.pdf`,
      mimeType: 'application/pdf',
      buffer: PDF_BUFFER,
    });
    await page.getByTestId('atender-proveido').fill(proveido);

    const respuesta = page.waitForResponse(
      (r) => r.url().includes('/concluir-informe') && r.request().method() === 'POST'
    );
    await page.getByTestId('atender-comision').click();
    const res = await respuesta;
    expect(res.ok(), await res.text()).toBeTruthy();
    await expect(modal).toBeHidden({ timeout: 30000 });
  };

  test('1. Ventanilla Única emite la Hoja de Ruta externa hacia Presidencia', async ({ page }) => {
    test.setTimeout(90000);
    await login(page, 'cargo054');
    await page.goto('/ventanilla');

    await expect(
      page.getByRole('heading', { name: /Recepción y Emisión de Hojas de Ruta Externas/i })
    ).toBeVisible({ timeout: 20000 });

    referencia = `${marcaTiempo} — Solicitud de obra y mejoramiento urbano`;
    await page.getByText('Correspondencia Municipal Externa', { exact: true }).first().click();

    await page
      .getByPlaceholder('Nombre completo de la persona que remite o firma la nota')
      .fill('Junta Vecinal E2E');
    await page
      .getByPlaceholder('Escriba claramente el motivo o síntesis del trámite o solicitud ingresada...')
      .fill(referencia);

    const respuesta = page.waitForResponse(
      (r) => r.url().endsWith('/tramites') && r.request().method() === 'POST'
    );
    await page.getByRole('button', { name: /Emitir Hoja de Ruta/i }).click();
    const res = await respuesta;
    expect(res.ok(), await res.text()).toBeTruthy();

    const body = await res.json();
    tramiteId = body?.data?.id;
    correlativo = body?.data?.numero_correlativo;
    expect(tramiteId, 'La emisión no devolvió el id del trámite').toBeTruthy();

    await expect(page.getByText(/Hoja de Ruta|emitid/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('2. Custodia estricta: COPPOT no ve ni puede derivar un trámite de Presidencia', async ({ page }) => {
    test.setTimeout(60000);
    const token = await irAEscritorio(page, 'cargo032');

    // La bandeja propia no debe contener el expediente, que sigue en Presidencia.
    await expect(fila(page)).toHaveCount(0, { timeout: 15000 });

    // Aunque se llame al backend directamente, la custodia debe rechazar la operación.
    const respuesta = await page.request.post(`${API_BASE}/tramites/${tramiteId}/derivar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        cod_u_destino: 8,
        proveido: 'Intento no autorizado de derivación directa.',
        dias_plazo: 10,
      },
    });
    expect(respuesta.status()).toBe(400);
    const body = await respuesta.json();
    expect(body.message).toMatch(/custodia|pendiente de recepción|no tiene custodia/i);
  });

  test('3. Presidencia recepciona y deriva a la Comisión COPPOT con plazo de 5 días', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'jcervantes');
    await recepcionar(page, 'Recepcionado por Presidencia para análisis político.');

    // El detalle debe mostrar solo la etapa vigente (Paso 2) y sus acciones.
    const rowPresidencia = await esperarFila(page);
    await rowPresidencia.getByTestId('btn-ver').click();
    const modalDetalle = page
      .locator('.modal-backdrop')
      .filter({ has: page.getByTestId('panel-etapa-actual') });
    await expect(modalDetalle).toBeVisible();
    await expect(modalDetalle.getByTestId('etapa-actual-paso')).toHaveText('PASO 2 DE 8');
    await expect(modalDetalle.getByTestId('btn-derivar')).toBeVisible();
    await expect(modalDetalle.getByTestId('btn-atender-comision')).toHaveCount(0);
    await expect(modalDetalle.getByTestId('btn-atender-pleno')).toHaveCount(0);
    await expect(modalDetalle.getByTestId('btn-firmar-presidencia')).toHaveCount(0);
    await expect(modalDetalle.getByTestId('btn-firmar-secretaria')).toHaveCount(0);
    await expect(modalDetalle.getByTestId('btn-despacho-final')).toHaveCount(0);
    await modalDetalle.getByRole('button', { name: 'Cerrar' }).click();
    await expect(modalDetalle).toBeHidden();

    await derivar(page, {
      destino: '8',
      plazo: 5,
      proveido: 'Se remite a la Comisión C.O.P.P.O.T. para su tratamiento técnico.',
    });

    // Al derivar, el expediente sale de la bandeja de Presidencia.
    await expect(fila(page)).toHaveCount(0, { timeout: 15000 });

    // Quien derivó no debe recibir instrucciones de atención del informe:
    // desde su bandeja de despachados solo ve el estado del expediente.
    await page.getByRole('button', { name: /Bandeja de Despachados/ }).click();
    const rowDespachado = await esperarFila(page);
    await rowDespachado.getByTestId('btn-ver').click();
    const modalDespachado = page
      .locator('.modal-backdrop')
      .filter({ has: page.getByTestId('panel-etapa-actual') });
    await expect(modalDespachado).toBeVisible();
    await expect(modalDespachado).not.toContainText('Informe pendiente');
    await expect(modalDespachado).toContainText('a la espera de su recepción e informe');
    await modalDespachado.getByRole('button', { name: 'Cerrar' }).click();
    await expect(modalDespachado).toBeHidden();
  });

  test('4. COPPOT recepciona con plazo activo, emite informe y remite directo a AGP', async ({ page }) => {
    test.setTimeout(120000);
    const token = await irAEscritorio(page, 'cargo032');
    await recepcionar(page, 'Recepcionado por la Presidencia de la Comisión C.O.P.P.O.T.');

    // El plazo elegido en Presidencia (5 días hábiles) arranca al recepcionar
    // en comisión, no al derivar ni al concluir el informe.
    const detalleRecepcion = await page.request.get(`${API_BASE}/tramites/${tramiteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detalleRecepcion.ok()).toBeTruthy();
    const cuerpoRecepcion = await detalleRecepcion.json();
    expect(cuerpoRecepcion.data.paso_actual).toBe(3);
    expect(cuerpoRecepcion.data.dias_plazo_informe).toBe(5);
    expect(cuerpoRecepcion.data.fecha_inicio_informe).toBeTruthy();
    expect(cuerpoRecepcion.data.fecha_limite_respuesta).toBeTruthy();

    const rowComision = await esperarFila(page);
    await expect(rowComision.getByTestId('btn-atender-comision')).toBeVisible({ timeout: 15000 });
    // Sin informe concluido la acción de derivar no debe mostrarse.
    await expect(rowComision.getByTestId('btn-derivar')).toHaveCount(0);

    // A la comisión destinataria sí se le muestra la instrucción de informe.
    await rowComision.getByTestId('btn-ver').click();
    const modalComision = page
      .locator('.modal-backdrop')
      .filter({ has: page.getByTestId('panel-etapa-actual') });
    await expect(modalComision).toContainText('Informe pendiente');
    await expect(modalComision).toContainText('Atender / Informe');
    await modalComision.getByRole('button', { name: 'Cerrar' }).click();
    await expect(modalComision).toBeHidden();

    // Aunque se llame a la API directamente, el backend debe rechazar la remisión.
    const intentoApi = await page.request.post(`${API_BASE}/tramites/${tramiteId}/derivar`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        cod_u_destino: 12,
        proveido: 'Intento de remisión a AGP sin informe de comisión concluido.',
        instrumentos_generados: 'MINUTA',
        dias_plazo: 10,
      },
    });
    expect(intentoApi.status()).toBe(400);
    const errorApi = await intentoApi.json();
    expect(errorApi.message).toMatch(/concluir la elaboración del informe/i);

    await atenderComision(
      page,
      'La comisión concluye el análisis técnico y remite el informe con instrumentos generados.'
    );

    const rowInforme = await esperarFila(page);
    await expect(rowInforme.getByTestId('btn-derivar')).toBeVisible({ timeout: 15000 });
    await expect(rowInforme.getByTestId('btn-atender-comision')).toHaveCount(0);

    // La comisión deriva de forma rígida a AGP: no vuelve a pedir plazo,
    // instrumentos ni PDF, y no puede quedarse en la misma unidad.
    await derivar(page, {
      destino: 'unidad-12',
      destinoFijo: true,
      proveido: 'Se remite directamente a Asesoría General del Pleno con el informe y los instrumentos de la comisión.',
    });

    // El expediente ya no queda en la comisión: pasa a AGP (paso 4, unidad 12).
    await expect(fila(page)).toHaveCount(0, { timeout: 15000 });
    const detalleAgp = await page.request.get(`${API_BASE}/tramites/${tramiteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detalleAgp.ok()).toBeTruthy();
    const cuerpoAgp = await detalleAgp.json();
    expect(cuerpoAgp.data.paso_actual).toBe(4);
    expect(cuerpoAgp.data.ubicacion_actual_id).toBe(12);
    expect(cuerpoAgp.data.estado).toBe('POR_RECIBIR');
  });

  test('5. Asesoría General del Pleno recepciona y remite al Pleno del Concejo', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'cargo023');
    await recepcionar(page, 'Recepcionado por Asesoría General del Pleno.');

    await derivar(page, {
      destino: 'unidad-2',
      proveido: 'Se remite al Pleno del Concejo Municipal para su tratamiento y votación.',
    });
  });

  test('6. El Pleno recepciona y registra la aprobación en Sesión', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'ddavalos');
    await recepcionar(page, 'Recepcionado en el Pleno del Concejo Municipal.');

    const row = await esperarFila(page);
    await row.getByTestId('btn-atender-pleno').click();
    const modal = page.getByTestId('modal-atender-pleno');
    await expect(modal).toBeVisible();

    await page.getByTestId('pleno-sesion').fill(`Sesión Ordinaria N° 099/${new Date().getFullYear()}`);
    await page.getByTestId('pleno-resultado').selectOption('APROBADO_UNANIMIDAD');
    await page.getByTestId('atender-proveido').fill('Aprobado por unanimidad en Sesión del Pleno.');

    const respuesta = page.waitForResponse(
      (r) => r.url().includes('/pleno/aprobacion') && r.request().method() === 'POST'
    );
    await page.getByTestId('atender-pleno').click();
    const res = await respuesta;
    expect(res.ok(), await res.text()).toBeTruthy();
    await expect(modal).toBeHidden({ timeout: 15000 });
  });

  test('7. Presidencia recepciona, firma y remite a Secretaría General', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'jcervantes');
    const rowPendiente = await esperarFila(page);
    // Antes de recepcionar solo se ofrece la recepción, nunca la firma.
    await expect(rowPendiente.getByTestId('btn-recepcionar')).toBeVisible({ timeout: 15000 });
    await expect(rowPendiente.getByTestId('btn-firmar-presidencia')).toHaveCount(0);
    await expect(rowPendiente.getByTestId('btn-derivar')).toHaveCount(0);

    await recepcionar(page, 'Recepcionado por Presidencia para la primera firma reglamentaria.');

    let row = await esperarFila(page);
    await expect(row.getByTestId('btn-firmar-presidencia')).toBeVisible({ timeout: 15000 });
    await row.getByTestId('btn-firmar-presidencia').click();

    const modalFirma = page.getByTestId('modal-atender-firma-presidencia');
    await expect(modalFirma).toBeVisible();
    const respuestaFirma = page.waitForResponse(
      (r) => r.url().includes('/firmas-duales') && r.request().method() === 'POST'
    );
    await page.getByTestId('atender-firma-presidencia').click();
    const resFirma = await respuestaFirma;
    expect(resFirma.ok(), await resFirma.text()).toBeTruthy();
    await expect(modalFirma).toBeHidden({ timeout: 15000 });

    await derivar(page, {
      destino: 'unidad-4',
      proveido: 'Se remite a Secretaría General para la segunda firma y el despacho final.',
    });
  });

  test('8. Secretaría General recepciona, firma y ejecuta el Despacho Final CONCLUIDO', async ({ page }) => {
    test.setTimeout(120000);
    const token = await irAEscritorio(page, 'mavendano');
    const rowPendiente = await esperarFila(page);
    // Antes de recepcionar no se muestran ni la firma ni el despacho final.
    await expect(rowPendiente.getByTestId('btn-recepcionar')).toBeVisible({ timeout: 15000 });
    await expect(rowPendiente.getByTestId('btn-firmar-secretaria')).toHaveCount(0);
    await expect(rowPendiente.getByTestId('btn-despacho-final')).toHaveCount(0);

    await recepcionar(page, 'Recepcionado por Secretaría General del Concejo Municipal.');

    let row = await esperarFila(page);
    await expect(row.getByTestId('btn-firmar-secretaria')).toBeVisible({ timeout: 15000 });
    await row.getByTestId('btn-firmar-secretaria').click();

    const modalFirma = page.getByTestId('modal-atender-firma-secretaria');
    await expect(modalFirma).toBeVisible();
    const respuestaFirma = page.waitForResponse(
      (r) => r.url().includes('/firmas-duales') && r.request().method() === 'POST'
    );
    await page.getByTestId('atender-firma-secretaria').click();
    const resFirma = await respuestaFirma;
    expect(resFirma.ok(), await resFirma.text()).toBeTruthy();
    await expect(modalFirma).toBeHidden({ timeout: 15000 });

    row = await esperarFila(page);
    await expect(row.getByTestId('btn-despacho-final')).toBeVisible({ timeout: 15000 });
    await row.getByTestId('btn-despacho-final').click();

    const modalDespacho = page.getByTestId('modal-atender-despacho');
    await expect(modalDespacho).toBeVisible();
    await expect(page.getByTestId('despacho-destinatario')).toHaveValue(DESTINATARIO_FINAL_DEFAULT);
    const cite = `CMS-DESP-E2E-${sufijo}/${new Date().getFullYear()}`;
    await page.getByTestId('despacho-cite').fill(cite);
    await page.getByTestId('despacho-destinatario').fill(DESTINATARIO_FINAL_DEFAULT);
    await page
      .getByTestId('atender-proveido')
      .fill('Remisión formal del instrumento normativo aprobado para su promulgación.');

    const respuestaDespacho = page.waitForResponse(
      (r) => r.url().includes('/despacho-final') && r.request().method() === 'POST'
    );
    await page.getByTestId('atender-despacho').click();
    const resDespacho = await respuestaDespacho;
    expect(resDespacho.ok(), await resDespacho.text()).toBeTruthy();
    await expect(modalDespacho).toBeHidden({ timeout: 20000 });

    // Verificación final en UI y en backend. El concluido ya no está en
    // Recibidos: se consulta desde la bandeja de Despachados.
    await verificarConcluidoEnDespachados(page, cite);

    const detalle = await page.request.get(`${API_BASE}/tramites/${tramiteId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(detalle.ok()).toBeTruthy();
    const body = await detalle.json();
    expect(body.data.estado).toBe('CONCLUIDO');
    expect(body.data.paso_actual).toBe(8);
    expect(body.data.firma_presidencia).toBeTruthy();
    expect(body.data.firma_secretaria).toBeTruthy();
    expect(body.data.numero_correlativo).toBe(correlativo);
  });

  test('9. Supervisión reactiva el concluido en paso 7 y mavendano vuelve a despachar', async ({ page }) => {
    test.setTimeout(120000);
    const tokenAdmin = await irASupervisionComoAdmin(page);

    await page.getByPlaceholder('Buscar correlativo, remitente, referencia...').fill(correlativo);
    const rowAdmin = page.locator('tbody tr').filter({ hasText: correlativo });
    await expect(rowAdmin).toHaveCount(1, { timeout: 20000 });
    await expect(rowAdmin).toContainText('CONCLUIDO');
    await rowAdmin.getByRole('button', { name: 'Habilitar' }).click();

    const modalHabilitar = page.locator('div.card').filter({ hasText: 'Reactivación: Habilitar Trámite Concluido' });
    await expect(modalHabilitar).toBeVisible();
    await expect(modalHabilitar).toContainText('Secretaría General (paso 7)');
    await modalHabilitar
      .getByPlaceholder(/Explique el requerimiento técnico/)
      .fill('Corrección del CITE de despacho final registrado por error.');

    const respuestaHabilitar = page.waitForResponse(
      (r) => r.url().includes('/habilitar') && r.request().method() === 'POST'
    );
    await modalHabilitar.getByRole('button', { name: 'Confirmar Habilitación' }).click();
    const resHabilitar = await respuestaHabilitar;
    expect(resHabilitar.ok(), await resHabilitar.text()).toBeTruthy();

    // El backend reabre en paso 7, conserva firmas y limpia el despacho anterior.
    const detalleReabierto = await page.request.get(`${API_BASE}/tramites/${tramiteId}`, {
      headers: { Authorization: `Bearer ${tokenAdmin}` },
    });
    expect(detalleReabierto.ok()).toBeTruthy();
    const cuerpoReabierto = await detalleReabierto.json();
    expect(cuerpoReabierto.data.estado).toBe('EN_ATENCION');
    expect(cuerpoReabierto.data.paso_actual).toBe(7);
    expect(cuerpoReabierto.data.ubicacion_actual_id).toBe(4);
    expect(cuerpoReabierto.data.firma_presidencia).toBeTruthy();
    expect(cuerpoReabierto.data.firma_secretaria).toBeTruthy();
    // La API omite los campos nulos al serializar (WhenWritingNull).
    expect(cuerpoReabierto.data.fecha_conclusion).toBeUndefined();
    expect(cuerpoReabierto.data.despacho_final_cite).toBeUndefined();
    expect(cuerpoReabierto.data.despacho_final_destinatario).toBeUndefined();

    // mavendano must have exactly one operative action: Despacho Final.
    await irAEscritorio(page, 'mavendano');
    const row = await esperarFila(page);
    await expect(row).toContainText('EN ATENCIÓN');
    await expect(row.getByTestId('btn-despacho-final')).toBeVisible({ timeout: 15000 });
    await expect(row.getByTestId('btn-firmar-secretaria')).toHaveCount(0);
    await expect(row.getByTestId('btn-recepcionar')).toHaveCount(0);
    await expect(row.getByTestId('btn-derivar')).toHaveCount(0);

    await row.getByTestId('btn-ver').click();
    const modalDetalle = page
      .locator('.modal-backdrop')
      .filter({ has: page.getByTestId('panel-etapa-actual') });
    await expect(modalDetalle.getByTestId('etapa-actual-paso')).toHaveText('PASO 7 DE 8');
    await expect(modalDetalle).toContainText('Trámite reactivado en Secretaría General');
    await expect(modalDetalle).not.toContainText('Despacho final realizado');
    await modalDetalle.getByRole('button', { name: 'Cerrar' }).click();
    await expect(modalDetalle).toBeHidden();

    // Segundo despacho con el CITE corregido.
    await row.getByTestId('btn-despacho-final').click();
    const modalDespacho = page.getByTestId('modal-atender-despacho');
    await expect(modalDespacho).toBeVisible();
    const citeCorregido = `CMS-DESP-E2E-${sufijo}-R/${new Date().getFullYear()}`;
    await page.getByTestId('despacho-cite').fill(citeCorregido);
    await expect(page.getByTestId('despacho-destinatario')).toHaveValue(DESTINATARIO_FINAL_DEFAULT);
    await page
      .getByTestId('atender-proveido')
      .fill('Reenvío correctivo del despacho final tras la habilitación.');

    const respuestaDespacho = page.waitForResponse(
      (r) => r.url().includes('/despacho-final') && r.request().method() === 'POST'
    );
    await page.getByTestId('atender-despacho').click();
    const resDespacho = await respuestaDespacho;
    expect(resDespacho.ok(), await resDespacho.text()).toBeTruthy();
    await expect(modalDespacho).toBeHidden({ timeout: 20000 });

    await verificarConcluidoEnDespachados(page, citeCorregido);

    const tokenFinal = await page.evaluate(() => localStorage.getItem('gestion_doc_token'));
    const detalleFinal = await page.request.get(`${API_BASE}/tramites/${tramiteId}`, {
      headers: { Authorization: `Bearer ${tokenFinal}` },
    });
    expect(detalleFinal.ok()).toBeTruthy();
    const cuerpoFinal = await detalleFinal.json();
    expect(cuerpoFinal.data.estado).toBe('CONCLUIDO');
    expect(cuerpoFinal.data.paso_actual).toBe(8);
    expect(cuerpoFinal.data.despacho_final_cite).toBe(citeCorregido);
    expect(cuerpoFinal.data.despacho_final_destinatario).toBe(DESTINATARIO_FINAL_DEFAULT);
  });
});
