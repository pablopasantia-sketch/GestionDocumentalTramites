import { test, expect } from '@playwright/test';

// =============================================================================
// E2E — Circuito externo distribuido del Concejo Municipal de Sucre
//
// Recorre la cadena completa con usuarios reales:
//   cargo054 -> jcervantes -> cargo032 -> cargo034 -> cargo023 -> ddavalos
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

  const esperarFila = async (page) => {
    await expect(fila(page)).toHaveCount(1, { timeout: 20000 });
    return fila(page);
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

  const derivar = async (page, { destino, funcionario, proveido, instrumentos = [] }) => {
    const row = await esperarFila(page);
    await expect(row.getByTestId('btn-derivar')).toBeVisible({ timeout: 15000 });
    await row.getByTestId('btn-derivar').click();

    const modal = page.getByTestId('modal-derivar');
    await expect(modal).toBeVisible();

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

    for (const instrumento of instrumentos) {
      await page.getByTestId(`instrumento-${instrumento}`).locator('input').check();
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

  test('3. Presidencia recepciona y deriva a la Comisión COPPOT con plazo de 10 días', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'jcervantes');
    await recepcionar(page, 'Recepcionado por Presidencia para análisis político.');

    await derivar(page, {
      destino: '8',
      proveido: 'Se remite a la Comisión C.O.P.P.O.T. para su tratamiento técnico.',
    });

    // Al derivar, el expediente sale de la bandeja de Presidencia.
    await expect(fila(page)).toHaveCount(0, { timeout: 15000 });
  });

  test('4. COPPOT recepciona, emite informe y subasigna al Asesor de Comisión', async ({ page }) => {
    test.setTimeout(120000);
    await irAEscritorio(page, 'cargo032');
    await recepcionar(page, 'Recepcionado por la Presidencia de la Comisión C.O.P.P.O.T.');

    await atenderComision(
      page,
      'La comisión concluye el análisis técnico y remite el informe con instrumentos generados.'
    );

    await derivar(page, {
      destino: 'unidad-8',
      funcionario: '1500034',
      proveido: 'Se subasigna al Asesor Técnico Civil de la comisión para revisión y remisión.',
    });
  });

  test('5. Asesor de Comisión recepciona y remite a Asesoría General del Pleno', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'cargo034');
    await recepcionar(page, 'Recepcionado por el Asesor Técnico de la Comisión.');

    await derivar(page, {
      destino: 'unidad-12',
      instrumentos: ['MINUTA'],
      proveido: 'Se remite a Asesoría General del Pleno con informe e instrumentos de la comisión.',
    });
  });

  test('6. Asesoría General del Pleno recepciona y remite al Pleno del Concejo', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'cargo023');
    await recepcionar(page, 'Recepcionado por Asesoría General del Pleno.');

    await derivar(page, {
      destino: 'unidad-2',
      proveido: 'Se remite al Pleno del Concejo Municipal para su tratamiento y votación.',
    });
  });

  test('7. El Pleno recepciona y registra la aprobación en Sesión', async ({ page }) => {
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

  test('8. Presidencia recepciona, firma y remite a Secretaría General', async ({ page }) => {
    test.setTimeout(90000);
    await irAEscritorio(page, 'jcervantes');
    await recepcionar(page, 'Recepcionado por Presidencia para la primera firma reglamentaria.');

    let row = await esperarFila(page);
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

  test('9. Secretaría General recepciona, firma y ejecuta el Despacho Final CONCLUIDO', async ({ page }) => {
    test.setTimeout(120000);
    const token = await irAEscritorio(page, 'mavendano');
    await recepcionar(page, 'Recepcionado por Secretaría General del Concejo Municipal.');

    let row = await esperarFila(page);
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
    await page.getByTestId('despacho-cite').fill(`CMS-DESP-E2E-${sufijo}/${new Date().getFullYear()}`);
    await page
      .getByTestId('despacho-destinatario')
      .fill('Dr. Enrique Leaño Palenque - Alcalde Municipal de Sucre');
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

    // Verificación final en UI y en backend.
    await expect(fila(page)).toContainText('CONCLUIDO', { timeout: 20000 });
    await expect(fila(page).getByTestId('btn-despacho-final')).toHaveCount(0);

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
});
