import React, { useEffect, useMemo, useState } from 'react';
import {
  Send,
  X,
  Building2,
  User,
  Calendar,
  FileText,
  Upload,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { institucionalService, tramitesService, adjuntosService } from '../../services/api';
import {
  PLAZOS_COMISION,
  INSTRUMENTOS_CIRCUITO,
  obtenerDestinosDerivacion,
  obtenerPaso,
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

const extraerMensajeError = (err) => (
  err?.response?.data?.message
  || err?.response?.data?.errors?.[0]
  || err?.message
  || 'No se pudo completar la derivación.'
);

export default function ModalDerivar({ open, tramite, user, onClose, onSuccess }) {
  const destinos = useMemo(
    () => (open && tramite ? obtenerDestinosDerivacion(tramite, user) : []),
    [open, tramite, user]
  );

  const [destinoValor, setDestinoValor] = useState('');
  const [empleados, setEmpleados] = useState([]);
  const [ciEmpleado, setCiEmpleado] = useState('');
  const [proveido, setProveido] = useState('');
  const [instruccion, setInstruccion] = useState('Para su atención y trámite correspondiente según normativa.');
  const [prioridad, setPrioridad] = useState('NORMAL');
  const [diasPlazo, setDiasPlazo] = useState(10);
  const [instrumentos, setInstrumentos] = useState([]);
  const [archivoPdf, setArchivoPdf] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);
  const [cargandoEmpleados, setCargandoEmpleados] = useState(false);

  const paso = tramite ? obtenerPaso(tramite) : 1;
  const destino = destinos.find((d) => d.valor === destinoValor) || destinos[0] || null;
  const requierePlazo = paso === 2 || paso === 3;
  const requiereInstrumentos = Boolean(destino?.requiereInforme);
  const requierePdf = Boolean(destino?.requiereInforme);

  useEffect(() => {
    if (!open || !tramite) return;
    const lista = obtenerDestinosDerivacion(tramite, user);
    setDestinoValor(lista[0]?.valor || '');
    setProveido('Para su atención y tratamiento según el circuito reglamentario del Concejo Municipal de Sucre.');
    setInstruccion('Para su atención y trámite correspondiente según normativa.');
    setPrioridad(tramite.prioridad || 'NORMAL');
    setDiasPlazo(10);
    setInstrumentos([]);
    setArchivoPdf(null);
    setCiEmpleado('');
    setError(null);
    setEmpleados([]);
  }, [open, tramite?.id, tramite?.paso_actual]);

  useEffect(() => {
    if (!open || !destino?.permiteFuncionario) {
      setEmpleados([]);
      setCiEmpleado('');
      return;
    }

    let activo = true;
    const cargar = async () => {
      setCargandoEmpleados(true);
      try {
        const res = await institucionalService.getEmpleados({ codU: destino.codU, activo: true });
        const lista = Array.isArray(res) ? res : (res?.data || []);
        if (activo) {
          setEmpleados(lista);
          setCiEmpleado(lista.length > 0 ? String(lista[0].ci) : '');
        }
      } catch (err) {
        console.error('No se pudieron cargar los funcionarios de la unidad:', err);
        if (activo) {
          setEmpleados([]);
          setCiEmpleado('');
        }
      } finally {
        if (activo) setCargandoEmpleados(false);
      }
    };

    cargar();
    return () => { activo = false; };
  }, [open, destino?.codU, destino?.permiteFuncionario]);

  if (!open || !tramite) return null;

  const toggleInstrumento = (id) => {
    setInstrumentos((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    if (!destino) {
      setError('No existe un destino válido para la etapa actual del trámite.');
      return;
    }
    if (!proveido.trim() || proveido.trim().length < 3) {
      setError('Debe ingresar el proveído o instrucción de derivación (mínimo 3 caracteres).');
      return;
    }
    if (destino.requiereAsesor && !ciEmpleado) {
      setError('Seleccione el asesor específico de la comisión al que se subasigna el expediente.');
      return;
    }
    if (requiereInstrumentos && instrumentos.length === 0) {
      setError('Seleccione al menos un instrumento generado por la comisión antes de remitir a Asesoría General del Pleno.');
      return;
    }
    if (requierePdf && !archivoPdf && !(Number(tramite.nro_adjuntos) > 0)) {
      setError('Debe adjuntar el informe de comisión en formato PDF para remitir a Asesoría General del Pleno.');
      return;
    }
    if (requierePlazo && ![5, 10, 15].includes(Number(diasPlazo))) {
      setError('El plazo reglamentario debe ser de 5, 10 o 15 días hábiles.');
      return;
    }

    setEnviando(true);
    try {
      if (archivoPdf) {
        const formData = new FormData();
        formData.append('files', archivoPdf);
        await adjuntosService.upload(tramite.id, formData);
      }

      const empleado = empleados.find((e) => String(e.ci) === String(ciEmpleado));

      const payload = {
        cod_u_destino: destino.codU,
        cod_cargo_destino: empleado?.codCargo ?? null,
        ci_empleado_destino: empleado?.ci ?? null,
        destinatario_nombre: empleado?.nombreCompleto ?? null,
        destinatario_cargo: empleado?.cargoOficial ?? empleado?.cargoNombre ?? null,
        destinatario_unidad: null,
        actividad_nombre: paso === 2
          ? `Derivación a comisión (${destino.label.split('—')[0].trim()})`
          : paso === 3
            ? 'Remisión de informe de comisión / subasignación de asesor'
            : paso === 4
              ? 'Remisión del expediente al Pleno del Concejo'
              : 'Remisión a Secretaría General para firma y despacho',
        proveido: proveido.trim(),
        instruccion: instruccion.trim() || null,
        prioridad,
        dias_plazo: requierePlazo ? Number(diasPlazo) : null,
        instrumentos_generados: instrumentos.length > 0 ? instrumentos.join(', ') : null,
        instrumento_generado: instrumentos[0] || null,
        es_conclusion: false,
      };

      const res = await tramitesService.derivar(tramite.id, payload);
      onSuccess?.(res?.message || 'Trámite derivado exitosamente.');
      onClose?.();
    } catch (err) {
      setError(extraerMensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const tituloDestino = destino?.label || 'Destino institucional';

  return (
    <div className="modal-backdrop" style={{ zIndex: 12500 }} onClick={(e) => { if (e.target === e.currentTarget && !enviando) onClose?.(); }}>
      <div
        className="modal-dialog"
        data-testid="modal-derivar"
        style={{ maxWidth: '720px', width: '94vw' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Send size={22} color="#800000" />
            <div>
              <h3 style={{ margin: 0, color: '#1B365D', fontSize: '1.05rem' }}>Derivar expediente — Etapa {paso}</h3>
              <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{tramite.numero_correlativo} · {tramite.referencia}</div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-btn" disabled={enviando}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ padding: '1.25rem 1.5rem', maxHeight: '72vh', overflowY: 'auto' }}>
            {error && (
              <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 12px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>{error}</span>
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={ESTILO_LABEL}><Building2 size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Unidad / destino institucional</label>
              <select
                data-testid="derivar-destino"
                value={destinoValor}
                onChange={(e) => { setDestinoValor(e.target.value); setCiEmpleado(''); }}
                style={ESTILO_INPUT}
                disabled={enviando || destinos.length <= 1}
              >
                {destinos.map((d) => <option key={d.valor} value={d.valor}>{d.label}</option>)}
              </select>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>Destino: {tituloDestino}</div>
            </div>

            {destino?.permiteFuncionario && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={ESTILO_LABEL}><User size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Asesor / funcionario específico</label>
                <select
                  data-testid="derivar-funcionario"
                  value={ciEmpleado}
                  onChange={(e) => setCiEmpleado(e.target.value)}
                  style={ESTILO_INPUT}
                  disabled={enviando || cargandoEmpleados}
                  required
                >
                  {cargandoEmpleados && <option value="">Cargando funcionarios…</option>}
                  {!cargandoEmpleados && empleados.length === 0 && <option value="">No hay funcionarios activos en la unidad</option>}
                  {empleados.map((e) => (
                    <option key={e.id || e.ci} value={e.ci}>
                      {e.nombreCompleto} — {e.cargoOficial || e.cargoNombre || 'Funcionario'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {requierePlazo && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={ESTILO_LABEL}><Calendar size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Plazo reglamentario de la comisión</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
                  {PLAZOS_COMISION.map((plazo) => {
                    const activo = Number(diasPlazo) === plazo.dias;
                    return (
                      <button
                        key={plazo.dias}
                        type="button"
                        onClick={() => setDiasPlazo(plazo.dias)}
                        style={{
                          padding: '9px 8px',
                          borderRadius: '6px',
                          border: activo ? '2px solid #800000' : '1px solid #CBD5E1',
                          backgroundColor: activo ? '#FFF1F2' : '#FFFFFF',
                          color: activo ? '#800000' : '#334155',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.82rem' }}>{plazo.label}</div>
                        <div style={{ fontSize: '0.68rem', color: '#64748B' }}>{plazo.detalle}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {requiereInstrumentos && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={ESTILO_LABEL}><FileText size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Instrumentos generados por la comisión</label>
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
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>Seleccione uno o más instrumentos para la remisión a Asesoría General del Pleno.</div>
              </div>
            )}

            {paso === 3 && (
              <div style={{ marginBottom: '1rem' }}>
                <label style={ESTILO_LABEL}><Upload size={13} style={{ verticalAlign: 'middle', marginRight: '4px' }} /> Informe de comisión (PDF) {requierePdf ? '— obligatorio' : '— opcional'}</label>
                <input
                  data-testid="derivar-pdf"
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
                {!archivoPdf && Number(tramite.nro_adjuntos) > 0 && (
                  <div style={{ fontSize: '0.72rem', color: '#047857', marginTop: '4px' }}>
                    El expediente ya cuenta con {tramite.nro_adjuntos} adjunto(s) PDF registrados.
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label style={ESTILO_LABEL}>Proveído / instrucción de derivación</label>
              <textarea
                data-testid="derivar-proveido"
                value={proveido}
                onChange={(e) => setProveido(e.target.value)}
                rows={3}
                style={{ ...ESTILO_INPUT, resize: 'vertical' }}
                disabled={enviando}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '10px' }}>
              <div>
                <label style={ESTILO_LABEL}>Instrucción adicional</label>
                <input
                  value={instruccion}
                  onChange={(e) => setInstruccion(e.target.value)}
                  style={ESTILO_INPUT}
                  disabled={enviando}
                />
              </div>
              <div>
                <label style={ESTILO_LABEL}>Prioridad</label>
                <select value={prioridad} onChange={(e) => setPrioridad(e.target.value)} style={ESTILO_INPUT} disabled={enviando}>
                  <option value="NORMAL">Normal</option>
                  <option value="ALTA">Alta</option>
                  <option value="URGENTE">Urgente</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '0.9rem 1.5rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={enviando}>
              Cancelar
            </button>
            <button
              type="submit"
              data-testid="derivar-submit"
              className="btn btn-primary"
              style={{ backgroundColor: '#800000', borderColor: '#800000' }}
              disabled={enviando}
            >
              {enviando ? <Loader2 size={15} className="spin" style={{ marginRight: '5px', verticalAlign: 'middle' }} /> : <Send size={15} style={{ marginRight: '5px', verticalAlign: 'middle' }} />}
              {enviando ? 'Derivando…' : 'Confirmar derivación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
