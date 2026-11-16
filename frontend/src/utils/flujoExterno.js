// =============================================================================
// flujoExterno.js
// Reglas de presentación del circuito externo distribuido del Concejo Municipal
// de Sucre. La autoridad final sigue siendo el backend/SP; este módulo solo
// decide qué acciones contextuales mostrar y qué destinos ofrecer.
// =============================================================================

export const UNIDADES_CIRCUITO = {
  PRESIDENCIA: 1,
  PLENO: 2,
  SECRETARIA_GENERAL: 4,
  ASESORIA_GENERAL_PLENO: 12,
  VENTANILLA_UNICA: 16,
};

export const COMISIONES_CMS = [
  { codU: 6, sigla: 'C.A.L.M.', nombre: 'Comisión Autonómica y Legislativa Municipal' },
  { codU: 7, sigla: 'C.M.A.S.D.C.', nombre: 'Comisión de Medio Ambiente, Salubridad y Defensa del Consumidor' },
  { codU: 8, sigla: 'C.O.P.P.O.T.', nombre: 'Comisión de Obras Públicas, Planificación y Ordenamiento Territorial' },
  { codU: 9, sigla: 'C.D.E.P.L.F.G.A.', nombre: 'Comisión de Desarrollo Económico, Productivo Local, Financiera y de Gestión Administrativa' },
  { codU: 10, sigla: 'C.D.H.S.S.C.', nombre: 'Comisión de Desarrollo Humano, Social y Seguridad Ciudadana' },
  { codU: 11, sigla: 'C.E.T.I.C.A.', nombre: 'Comisión de Ética y Procesos Administrativos' },
];

export const CARGOS_CIRCUITO = {
  PRESIDENTE_CONCEJO: 1,
  SECRETARIO_GENERAL: 6,
  ASESOR_GENERAL_PLENO: 23,
  PRESIDENTES_COMISION: [24, 29, 32, 37, 45, 48],
  ASESORES_COMISION: [25, 26, 27, 28, 30, 31, 33, 34, 35, 36, 38, 39, 40, 41, 42, 43, 44, 46, 47, 49, 50],
};

export const PASOS_CIRCUITO = {
  1: { titulo: 'Ventanilla Única', descripcion: 'Recepción y registro de la Hoja de Ruta externa.' },
  2: { titulo: 'Presidencia del Concejo', descripcion: 'Análisis político y derivación a comisión.' },
  3: { titulo: 'Comisión', descripcion: 'Tratamiento técnico, informe y determinación de la comisión.' },
  4: { titulo: 'Asesoría General del Pleno', descripcion: 'Revisión técnica y remisión al Pleno.' },
  5: { titulo: 'Pleno del Concejo', descripcion: 'Tratamiento y votación en Sesión del Pleno.' },
  6: { titulo: 'Presidencia (1.ª firma)', descripcion: 'Firma reglamentaria de Presidencia.' },
  7: { titulo: 'Secretaría General (2.ª firma)', descripcion: 'Firma de Secretaría y Despacho Final.' },
  8: { titulo: 'Concluido', descripcion: 'Expediente despachado oficialmente.' },
};

export const INSTRUMENTOS_CIRCUITO = [
  { id: 'PIE', label: 'PIE — Petición de Informe Escrito' },
  { id: 'PIO', label: 'PIO — Petición de Informe Oral' },
  { id: 'MINUTA', label: 'Minuta de Comunicación' },
  { id: 'RESOLUCION', label: 'Resolución Municipal' },
  { id: 'NOTA_EXTERNA', label: 'Nota Externa' },
];

export const PLAZOS_COMISION = [
  { dias: 5, label: '5 días hábiles', detalle: 'Urgente / preferente' },
  { dias: 10, label: '10 días hábiles', detalle: 'Plazo ordinario CMS' },
  { dias: 15, label: '15 días hábiles', detalle: 'Plazo máximo reglamentario' },
];

export const RESULTADOS_PLENO = [
  { id: 'APROBADO_UNANIMIDAD', label: 'Aprobado por unanimidad' },
  { id: 'APROBADO_MAYORIA', label: 'Aprobado por mayoría' },
  { id: 'APROBADO_CON_MODIFICACIONES', label: 'Aprobado con modificaciones' },
  { id: 'RECHAZADO', label: 'Rechazado por el Pleno' },
];

const ESTADOS_CONCLUIDOS = ['CONCLUIDO', 'ANULADO', 'BLOQUEADO', 'RECHAZADO_PLENO'];

export const normalizarCargo = (user) => {
  const valor = user?.cod_cargo ?? user?.codCargo ?? user?.codCargoUsuario;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : 0;
};

export const esComision = (codU) => Number(codU) >= 6 && Number(codU) <= 11;

export const obtenerPaso = (tramite) => {
  const paso = Number(tramite?.paso_actual ?? tramite?.pasoActual);
  if (paso >= 1 && paso <= 8) return paso;

  // Compatibilidad con registros anteriores a la migración 041.
  const estado = tramite?.estado;
  if (estado === 'CONCLUIDO' || estado === 'RECHAZADO_PLENO') return 8;
  const codU = Number(tramite?.cod_u_actual ?? tramite?.codUActual ?? tramite?.ubicacion_actual_id);
  if (codU === UNIDADES_CIRCUITO.SECRETARIA_GENERAL) return 7;
  if (codU === UNIDADES_CIRCUITO.PRESIDENCIA && tramite?.sesion_pleno_nro) return 6;
  if (codU === UNIDADES_CIRCUITO.PLENO) return 5;
  if (codU === UNIDADES_CIRCUITO.ASESORIA_GENERAL_PLENO) return 4;
  if (esComision(codU)) return 3;
  if (codU === UNIDADES_CIRCUITO.PRESIDENCIA) return 2;
  return 1;
};

export const obtenerCodUnidadActual = (tramite) => {
  const codU = Number(tramite?.cod_u_actual ?? tramite?.codUActual);
  if (Number.isFinite(codU) && codU > 0) return codU;
  return Number(tramite?.ubicacion_actual_id ?? 0);
};

export const esConcluido = (tramite) => ESTADOS_CONCLUIDOS.includes(String(tramite?.estado || '').toUpperCase());

export const tieneCustodia = (tramite) => Boolean(tramite?.puede_operar ?? tramite?.puedeOperar);

export const puedeFirmarPresidencia = (tramite, user) => {
  const cargo = normalizarCargo(user);
  return obtenerPaso(tramite) === 6
    && obtenerCodUnidadActual(tramite) === UNIDADES_CIRCUITO.PRESIDENCIA
    && (cargo === 0 || cargo === CARGOS_CIRCUITO.PRESIDENTE_CONCEJO)
    && !tramite?.firma_presidencia;
};

export const puedeFirmarSecretaria = (tramite, user) => {
  const cargo = normalizarCargo(user);
  return obtenerPaso(tramite) === 7
    && obtenerCodUnidadActual(tramite) === UNIDADES_CIRCUITO.SECRETARIA_GENERAL
    && (cargo === 0 || cargo === CARGOS_CIRCUITO.SECRETARIO_GENERAL)
    && tramite?.firma_presidencia
    && !tramite?.firma_secretaria;
};

export const puedeDespachar = (tramite, user) => {
  const cargo = normalizarCargo(user);
  return obtenerPaso(tramite) === 7
    && obtenerCodUnidadActual(tramite) === UNIDADES_CIRCUITO.SECRETARIA_GENERAL
    && (cargo === 0 || cargo === CARGOS_CIRCUITO.SECRETARIO_GENERAL)
    && Boolean(tramite?.firma_presidencia)
    && Boolean(tramite?.firma_secretaria);
};

export const puedeDerivar = (tramite, user) => {
  if (!tieneCustodia(tramite) || esConcluido(tramite)) return false;
  if (String(tramite?.estado).toUpperCase() === 'POR_RECIBIR') return false;

  const paso = obtenerPaso(tramite);
  const codU = obtenerCodUnidadActual(tramite);
  const cargo = normalizarCargo(user);

  if (paso === 2) {
    return codU === UNIDADES_CIRCUITO.PRESIDENCIA && (cargo === 0 || cargo === CARGOS_CIRCUITO.PRESIDENTE_CONCEJO);
  }
  if (paso === 3) {
    // La comisión solo puede derivar cuando concluyó la elaboración del informe.
    return esComision(codU) && Boolean(tramite?.fecha_fin_informe);
  }
  if (paso === 4) {
    return codU === UNIDADES_CIRCUITO.ASESORIA_GENERAL_PLENO && (cargo === 0 || cargo === CARGOS_CIRCUITO.ASESOR_GENERAL_PLENO);
  }
  if (paso === 6) {
    return codU === UNIDADES_CIRCUITO.PRESIDENCIA
      && Boolean(tramite?.firma_presidencia)
      && (cargo === 0 || cargo === CARGOS_CIRCUITO.PRESIDENTE_CONCEJO);
  }
  return false;
};

export const puedeAtenderComision = (tramite) => {
  if (!tieneCustodia(tramite) || esConcluido(tramite)) return false;
  if (String(tramite?.estado).toUpperCase() === 'POR_RECIBIR') return false;
  return obtenerPaso(tramite) === 3
    && esComision(obtenerCodUnidadActual(tramite))
    && !tramite?.fecha_fin_informe;
};

export const puedeRegistrarPleno = (tramite) => {
  if (!tieneCustodia(tramite) || esConcluido(tramite)) return false;
  if (String(tramite?.estado).toUpperCase() === 'POR_RECIBIR') return false;
  return obtenerPaso(tramite) === 5
    && obtenerCodUnidadActual(tramite) === UNIDADES_CIRCUITO.PLENO;
};

export const puedeRecepcionar = (tramite) => {
  if (!tieneCustodia(tramite) || esConcluido(tramite)) return false;
  return ['POR_RECIBIR', 'EN_TRANSITO', 'CREADO'].includes(String(tramite?.estado).toUpperCase());
};

export const obtenerModoAtencion = (tramite, user) => {
  if (puedeRegistrarPleno(tramite)) return 'pleno';
  if (puedeFirmarPresidencia(tramite, user)) return 'firma-presidencia';
  if (puedeFirmarSecretaria(tramite, user)) return 'firma-secretaria';
  if (puedeDespachar(tramite, user)) return 'despacho';
  if (puedeAtenderComision(tramite)) return 'comision';
  return null;
};

export const obtenerDestinosDerivacion = (tramite, user) => {
  const paso = obtenerPaso(tramite);
  const codU = obtenerCodUnidadActual(tramite);

  if (paso === 2) {
    return COMISIONES_CMS.map((comision) => ({
      valor: String(comision.codU),
      codU: comision.codU,
      label: `${comision.sigla} — ${comision.nombre}`,
      permiteFuncionario: false,
    }));
  }

  if (paso === 3) {
    // La comisión solo puede remitir el expediente a la Asesoría General del
    // Pleno (unidad 12). El destino es fijo y no admite subasignaciones.
    return [{
      valor: `unidad-${UNIDADES_CIRCUITO.ASESORIA_GENERAL_PLENO}`,
      codU: UNIDADES_CIRCUITO.ASESORIA_GENERAL_PLENO,
      label: 'Asesoría General del Pleno (AGP)',
      permiteFuncionario: false,
      destinoFijo: true,
    }];
  }

  if (paso === 4) {
    return [{
      valor: `unidad-${UNIDADES_CIRCUITO.PLENO}`,
      codU: UNIDADES_CIRCUITO.PLENO,
      label: 'Pleno del Concejo Municipal',
      permiteFuncionario: false,
    }];
  }

  if (paso === 6) {
    return [{
      valor: `unidad-${UNIDADES_CIRCUITO.SECRETARIA_GENERAL}`,
      codU: UNIDADES_CIRCUITO.SECRETARIA_GENERAL,
      label: 'Secretaría General del Concejo Municipal',
      permiteFuncionario: false,
    }];
  }

  return [];
};

export const obtenerEtiquetaPaso = (tramite) => {
  const paso = obtenerPaso(tramite);
  return PASOS_CIRCUITO[paso]?.titulo || `Paso ${paso}`;
};
