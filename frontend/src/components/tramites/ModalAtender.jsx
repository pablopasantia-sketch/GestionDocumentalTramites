import React, { useEffect, useMemo, useState } from 'react';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  PenTool,
  Gavel,
  Send,
  Stamp,
  ClipboardCheck,
} from 'lucide-react';
import { tramitesService, adjuntosService } from '../../services/api';
import {
  DESTINATARIO_FINAL_DEFAULT,
  INSTRUMENTOS_CIRCUITO,
  RESULTADOS_PLENO,
} from '../../utils/flujoExterno';

const ESTILO_INPUT = {
  width: '100%',
  padding: '9px 11px',
  border: '1px solid #CBD5E1',
  borderRadius: '6px',
  fontSize: '0.86rem',
  color: '#1E293B',
  backgroundColor: '#FFFFFF',
  boxSizing: 'border-box',
};

const ESTILO_LABEL = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 700,
  color: '#334155',
  marginBottom: '6px',
};

const CONFIG_MODOS = {
  comision: {
    titulo: 'Atención de comisión',
    subtitulo: 'Registre el informe técnico, los instrumentos generados y el plazo reglamentario.',
    icono: ClipboardCheck,
    color: '#800000',
    textoBoton: 'Registrar atención e informe',
    testeId: 'atender-comision',
  },
  pleno: {
    titulo: 'Constancia de Sesión del Pleno',
    subtitulo: 'Registre la sesión, el resultado de la votación y el instrumento aprobado.',
    icono: Gavel,
    color: '#1E3A8A',
    textoBoton: 'Registrar aprobación del Pleno',
    testeId: 'atender-pleno',
  },
  'firma-presidencia': {
    titulo: 'Firma de Presidencia',
    subtitulo: 'Estampe la primera firma reglamentaria del expediente aprobado en el Pleno.',
    icono: PenTool,
    color: '#800000',
    textoBoton: 'Estampar firma de Presidencia',
    testeId: 'atender-firma-presidencia',
  },
  'firma-secretaria': {
    titulo: 'Firma de Secretaría General',
    subtitulo: 'Estampe la segunda firma reglamentaria y habilite el Despacho Final.',
    icono: Stamp,
    color: '#047857',
    textoBoton: 'Estampar firma de Secretaría',
    testeId: 'atender-firma-secretaria',
  },
  despacho: {
    titulo: 'Despacho Final',
    subtitulo: 'Registre el CITE de salida y el destinatario oficial del instrumento aprobado.',
    icono: Send,
    color: '#7C3AED',
    textoBoton: 'Efectuar Despacho Final',
    testeId: 'atender-despacho',
  },
};

const extraerMensajeError = (err) => (
  err?.response?.data?.message
  || err?.response?.data?.errors?.[0]
  || err?.message
  || 'No se pudo completar la operación.'
);

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export default function ModalAtender({ open, mode, tramite, user, onClose, onSuccess }) {
  const config = CONFIG_MODOS[mode] || CONFIG_MODOS.comision;
  const Icono = config.icono;

  const [proveido, setProveido] = useState('');
  const [actividad, setActividad] = useState('Informe y dictamen técnico de comisión');
  const [instrumentos, setInstrumentos] = useState([]);
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [sesionNro, setSesionNro] = useState('');
  const [sesionFecha, setSesionFecha] = useState('');
  const [sesionResultado, setSesionResultado] = useState('APROBADO_UNANIMIDAD');
  const [instrumentoPleno, setInstrumentoPleno] = useState('MINUTA');
  const [citeDespacho, setCiteDespacho] = useState('');
  const [destinatarioFinal, setDestinatarioFinal] = useState(DESTINATARIO_FINAL_DEFAULT);
  const [observacionesFirma, setObservacionesFirma] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const yaAtendido = String(tramite?.estado || '').toUpperCase() === 'ATENDIDO';
  const tieneAdjuntos = Number(tramite?.nro_adjuntos) > 0;
  const diasPlazoInforme = Number(tramite?.dias_plazo_informe) > 0 ? Number(tramite.dias_plazo_informe) : null;

  const anioActual = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    if (!open || !tramite) return;

    const esComision = mode === 'comision';
    setProveido(
      mode === 'comision'
        ? 'La comisión concluye el análisis técnico y remite el informe para consideración del Pleno.'
        : mode === 'pleno'
          ? 'Sometido a consideración y resolución del Pleno Camaral del Concejo Municipal.'
          : mode === 'despacho'
            ? 'Remisión formal del instrumento normativo aprobado para su promulgación y cumplimiento.'
            : 'Rúbrica oficial registrada conforme a normativa del Concejo Municipal de Sucre.'
    );
    setActividad(esComision ? 'Informe y dictamen técnico de comisión' : 'Atención institucional');
    setInstrumentos(esComision ? ['PIE'] : []);
    setArchivoPdf(null);
    setSesionNro(tramite.sesion_pleno_nro || `Sesión Ordinaria N° 045/${anioActual}`);
    setSesionFecha(new Date().toISOString().slice(0, 16));
    setSesionResultado(tramite.sesion_pleno_resultado || 'APROBADO_UNANIMIDAD');
    setInstrumentoPleno(tramite.ultimo_instrumento_generado || 'MINUTA');
    setCiteDespacho(`CMS-DESP-${String(tramite.id).padStart(3, '0')}/${anioActual}`);
    setDestinatarioFinal(DESTINATARIO_FINAL_DEFAULT);
    setObservacionesFirma('');
    setError(null);
  }, [open, mode, tramite?.id, anioActual]);

  if (!open || !tramite) return null;

  const toggleInstrumento = (id) => {
    setInstrumentos((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (['comision', 'pleno', 'despacho'].includes(mode) && proveido.trim().length < 3) {
      setError('Debe ingresar el proveído, informe o sustento de la actuación (mínimo 3 caracteres).');
      return;
    }

    if (mode === 'comision') {
      if (instrumentos.length === 0) {
        setError('Seleccione al menos un instrumento generado por la comisión (PIE, PIO, Minuta, Resolución o Nota Externa).');
        return;
      }
      if (!archivoPdf && !tieneAdjuntos) {
        setError('Debe adjuntar el informe de comisión en formato PDF antes de concluir la atención.');
        return;
      }
    }

    if (mode === 'pleno') {
      if (sesionNro.trim().length < 3) {
        setError('Debe ingresar el número o denominación de la Sesión del Pleno.');
        return;
      }
      if (!sesionResultado) {
        setError('Debe seleccionar el resultado de la votación del Pleno.');
        return;
      }
    }

    if (mode === 'despacho') {
      if (citeDespacho.trim().length < 3) {
        setError('Debe indicar el CITE o número oficial de oficio saliente del CMS.');
        return;
      }
      if (destinatarioFinal.trim().length < 3) {
        setError('Debe especificar el destinatario final institucional.');
        return;
      }
      if (!tramite.firma_presidencia || !tramite.firma_secretaria) {
        setError('El Despacho Final requiere ambas firmas: Presidencia y Secretaría General.');
        return;
      }
    }

    setEnviando(true);
    try {
      let mensaje = 'Operación registrada exitosamente.';

      if (mode === 'comision') {
        if (archivoPdf) {
          const formData = new FormData();
          formData.append('files', archivoPdf);
          await adjuntosService.upload(tramite.id, formData);
        }

        if (!yaAtendido) {
          await tramitesService.marcarAtendido(tramite.id, {
            proveido: proveido.trim(),
            actividad_nombre: actividad.trim() || 'Informe y dictamen técnico de comisión',
            instrumento_generado: instrumentos[0],
            instrumentos_generados: instrumentos.join(', '),
          });
        }

        await tramitesService.concluirInforme(tramite.id, {
          proveido: proveido.trim(),
        });

        mensaje = `Atención e informe de comisión concluidos para ${tramite.numero_correlativo}. El expediente está listo para remitirse a Asesoría General del Pleno.`;
      } else if (mode === 'pleno') {
        await tramitesService.registrarAprobacionPleno(tramite.id, {
          sesion_pleno_nro: sesionNro.trim(),
          sesion_pleno_fecha: sesionFecha ? new Date(sesionFecha).toISOString() : new Date().toISOString(),
          sesion_pleno_resultado: sesionResultado,
          proveido: proveido.trim(),
          instrumento_generado: instrumentoPleno,
        });

        const rechazado = String(sesionResultado).includes('RECHAZADO');
        mensaje = rechazado
          ? `El Pleno rechazó el expediente ${tramite.numero_correlativo}. El trámite quedó cerrado como RECHAZADO_PLENO.`
          : `Constancia de la ${sesionNro.trim()} registrada. El expediente fue remitido a Presidencia para la primera firma.`;
      } else if (mode === 'firma-presidencia') {
        await tramitesService.registrarFirmaDual(tramite.id, {
          tipo_firma: 'PRESIDENCIA',
          observaciones: observacionesFirma.trim() || 'Firma reglamentaria de Presidencia del Concejo Municipal.',
        });
        mensaje = `Firma de Presidencia registrada en ${tramite.numero_correlativo}. Ahora corresponde remitir el expediente a Secretaría General.`;
      } else if (mode === 'firma-secretaria') {
        await tramitesService.registrarFirmaDual(tramite.id, {
          tipo_firma: 'SECRETARIA',
          observaciones: observacionesFirma.trim() || 'Firma reglamentaria de Secretaría General del Concejo Municipal.',
        });
        mensaje = `Firma de Secretaría General registrada en ${tramite.numero_correlativo}. El Despacho Final está habilitado.`;
      } else if (mode === 'despacho') {
        await tramitesService.despachoFinal(tramite.id, {
          cite_despacho: citeDespacho.trim(),
          destinatario_final: destinatarioFinal.trim(),
          proveido: proveido.trim(),
        });
        mensaje = `Despacho Final bajo CITE ${citeDespacho.trim()} registrado. El trámite ${tramite.numero_correlativo} quedó CONCLUIDO.`;
      }

      onSuccess?.(mensaje);
      onClose?.();
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      style={{ zIndex: 12600 }}
      onClick={(e) => { if (e.target === e.currentTarget && !enviando) onClose?.(); }}
    >
      <div
        className="modal-dialog"
        data-testid={`modal-${config.testeId}`}
        style={{ maxWidth: '680px', width: '94vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Icono size={22} color={config.color} />
            <div>
              <h3 style={{ margin: 0, color: '#1B365D', fontSize: '1.05rem' }}>{config.titulo}</h3>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                {tramite.numero_correlativo} · {tramite.referencia}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" disabled={enviando}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
            <p style={{ margin: '0 0 1rem', fontSize: '0.82rem', color: '#475569' }}>{config.subtitulo}</p>

            {error && (
              <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 12px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            {mode === 'comision' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>
                    <FileText size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Instrumentos generados por la comisión
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '8px' }}>
                    {INSTRUMENTOS_CIRCUITO.map((instrumento) => (
                      <label
                        key={instrumento.id}
                        data-testid={`instrumento-${instrumento.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 10px',
                          border: instrumentos.includes(instrumento.id) ? '1px solid #800000' : '1px solid #E2E8F0',
                          backgroundColor: instrumentos.includes(instrumento.id) ? '#FFF7F7' : '#F8FAFC',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          color: '#334155',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={instrumentos.includes(instrumento.id)}
                          onChange={() => toggleInstrumento(instrumento.id)}
                          disabled={enviando}
                        />
                        <span>{instrumento.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: '1rem', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A', fontSize: '0.78rem', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, marginBottom: '2px' }}>Plazo reglamentario de la comisión</div>
                  <div>
                    {diasPlazoInforme
                      ? `${diasPlazoInforme} días hábiles`
                      : 'Plazo fijado por Presidencia'}
                    {tramite.fecha_limite_respuesta && ` · vence el ${formatearFecha(tramite.fecha_limite_respuesta)}`}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '4px' }}>
                    {tramite.fecha_inicio_informe
                      ? `El plazo se inició al confirmar la recepción el ${formatearFecha(tramite.fecha_inicio_informe)}.`
                      : 'El plazo se iniciará cuando la comisión confirme la recepción del expediente.'}
                    {' '}No se modifica desde la comisión.
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>
                    <Upload size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Informe de comisión (PDF) — obligatorio
                  </label>
                  <input
                    data-testid="atender-pdf"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(e) => setArchivoPdf(e.target.files?.[0] || null)}
                    style={{ ...ESTILO_INPUT, padding: '7px 9px', backgroundColor: '#F8FAFC' }}
                    disabled={enviando}
                  />
                  {archivoPdf && (
                    <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '4px' }}>
                      <CheckCircle2 size={12} style={{ verticalAlign: 'middle', marginRight: '3px' }} />
                      {archivoPdf.name}
                    </div>
                  )}
                  {!archivoPdf && tieneAdjuntos && (
                    <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '4px' }}>
                      El expediente ya cuenta con {tramite.nro_adjuntos} adjunto(s) PDF registrados.
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>Actividad / denominación de la atención</label>
                  <input
                    value={actividad}
                    onChange={(e) => setActividad(e.target.value)}
                    style={ESTILO_INPUT}
                    disabled={enviando}
                  />
                </div>
              </>
            )}

            {mode === 'pleno' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                  <div>
                    <label style={ESTILO_LABEL}>N.º / denominación de la sesión</label>
                    <input
                      data-testid="pleno-sesion"
                      value={sesionNro}
                      onChange={(e) => setSesionNro(e.target.value)}
                      style={ESTILO_INPUT}
                      disabled={enviando}
                      required
                    />
                  </div>
                  <div>
                    <label style={ESTILO_LABEL}>Fecha y hora de la sesión</label>
                    <input
                      type="datetime-local"
                      value={sesionFecha}
                      onChange={(e) => setSesionFecha(e.target.value)}
                      style={ESTILO_INPUT}
                      disabled={enviando}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>Resultado de la votación</label>
                  <select
                    data-testid="pleno-resultado"
                    value={sesionResultado}
                    onChange={(e) => setSesionResultado(e.target.value)}
                    style={ESTILO_INPUT}
                    disabled={enviando}
                  >
                    {RESULTADOS_PLENO.map((resultado) => (
                      <option key={resultado.id} value={resultado.id}>{resultado.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>Instrumento aprobado</label>
                  <select
                    value={instrumentoPleno}
                    onChange={(e) => setInstrumentoPleno(e.target.value)}
                    style={ESTILO_INPUT}
                    disabled={enviando}
                  >
                    <option value="MINUTA">Minuta de Comunicación</option>
                    <option value="RESOLUCION">Resolución Municipal</option>
                    <option value="NOTA_EXTERNA">Nota Externa</option>
                    <option value="PIE">Petición de Informe Escrito</option>
                    <option value="PIO">Petición de Informe Oral</option>
                  </select>
                </div>
              </>
            )}

            {mode === 'despacho' && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>CITE / número oficial de salida</label>
                  <input
                    data-testid="despacho-cite"
                    value={citeDespacho}
                    onChange={(e) => setCiteDespacho(e.target.value)}
                    style={ESTILO_INPUT}
                    disabled={enviando}
                    required
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={ESTILO_LABEL}>Destinatario final institucional</label>
                  <input
                    data-testid="despacho-destinatario"
                    value={destinatarioFinal}
                    onChange={(e) => setDestinatarioFinal(e.target.value)}
                    style={ESTILO_INPUT}
                    disabled={enviando}
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '999px', backgroundColor: tramite.firma_presidencia ? '#DCFCE7' : '#FEE2E2', color: tramite.firma_presidencia ? '#166534' : '#991B1B', fontWeight: 700 }}>
                    Presidencia: {tramite.firma_presidencia ? 'Firmado' : 'Pendiente'}
                  </span>
                  <span style={{ fontSize: '0.75rem', padding: '4px 8px', borderRadius: '999px', backgroundColor: tramite.firma_secretaria ? '#DCFCE7' : '#FEE2E2', color: tramite.firma_secretaria ? '#166534' : '#991B1B', fontWeight: 700 }}>
                    Secretaría: {tramite.firma_secretaria ? 'Firmado' : 'Pendiente'}
                  </span>
                </div>
              </>
            )}

            {['firma-presidencia', 'firma-secretaria'].includes(mode) && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={ESTILO_LABEL}>Observaciones de la firma</label>
                <textarea
                  value={observacionesFirma}
                  onChange={(e) => setObservacionesFirma(e.target.value)}
                  rows={3}
                  style={{ ...ESTILO_INPUT, resize: 'vertical' }}
                  disabled={enviando}
                  placeholder="Observación opcional de la rúbrica institucional."
                />
              </div>
            )}

            {['comision', 'pleno', 'despacho'].includes(mode) && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={ESTILO_LABEL}>Proveído / sustento de la actuación</label>
                <textarea
                  data-testid="atender-proveido"
                  value={proveido}
                  onChange={(e) => setProveido(e.target.value)}
                  rows={4}
                  style={{ ...ESTILO_INPUT, resize: 'vertical' }}
                  disabled={enviando}
                  required
                />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '0.9rem 1.5rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </button>
            <button
              type="submit"
              data-testid={config.testeId}
              className="btn btn-primary"
              style={{ backgroundColor: config.color, borderColor: config.color }}
              disabled={enviando}
            >
              {enviando ? <Loader2 size={15} className="spin" style={{ marginRight: '5px', verticalAlign: 'middle' }} /> : <Icono size={15} style={{ marginRight: '5px', verticalAlign: 'middle' }} />}
              {enviando ? 'Procesando…' : config.textoBoton}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
