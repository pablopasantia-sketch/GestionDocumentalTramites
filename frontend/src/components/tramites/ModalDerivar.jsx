import React, { useEffect, useMemo, useState } from 'react';
import {
  Send,
  X,
  Building2,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { tramitesService } from '../../services/api';
import {
  PLAZOS_COMISION,
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

const construirActividad = (paso, destino) => {
  if (paso === 2) {
    return `Derivación a comisión (${destino?.label?.split('—')[0]?.trim() || 'comisión'})`;
  }
  if (paso === 3) return 'Remisión del informe de comisión a Asesoría General del Pleno';
  if (paso === 4) return 'Remisión del expediente al Pleno del Concejo';
  return 'Remisión a Secretaría General para firma y despacho';
};

export default function ModalDerivar({ open, tramite, user, onClose, onSuccess }) {
  const destinos = useMemo(
    () => (open && tramite ? obtenerDestinosDerivacion(tramite, user) : []),
    [open, tramite, user]
  );

  const [destinoValor, setDestinoValor] = useState('');
  const [proveido, setProveido] = useState('');
  const [instruccion, setInstruccion] = useState('Para su atención y trámite correspondiente según normativa.');
  const [prioridad, setPrioridad] = useState('NORMAL');
  const [diasPlazo, setDiasPlazo] = useState(10);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const paso = tramite ? obtenerPaso(tramite) : 1;
  const destino = destinos.find((d) => d.valor === destinoValor) || destinos[0] || null;
  // El plazo solo lo elige Presidencia al derivar a la comisión.
  const requierePlazo = paso === 2;
  const destinoFijo = destinos.length === 1;

  useEffect(() => {
    if (!open || !tramite) return;
    const lista = obtenerDestinosDerivacion(tramite, user);
    setDestinoValor(lista[0]?.valor || '');
    setProveido('Para su atención y tratamiento según el circuito reglamentario del Concejo Municipal de Sucre.');
    setInstruccion('Para su atención y trámite correspondiente según normativa.');
    setPrioridad(tramite.prioridad || 'NORMAL');
    setDiasPlazo(10);
    setError(null);
  }, [open, tramite?.id, tramite?.paso_actual]);

  if (!open || !tramite) return null;

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
    if (requierePlazo && ![5, 10, 15].includes(Number(diasPlazo))) {
      setError('El plazo reglamentario debe ser de 5, 10 o 15 días hábiles.');
      return;
    }

    setEnviando(true);
    try {
      const payload = {
        cod_u_destino: destino.codU,
        cod_cargo_destino: null,
        ci_empleado_destino: null,
        destinatario_nombre: null,
        destinatario_cargo: null,
        destinatario_unidad: null,
        actividad_nombre: construirActividad(paso, destino),
        proveido: proveido.trim(),
        instruccion: instruccion.trim() || null,
        prioridad,
        // En comisión el plazo ya fue fijado por Presidencia y la fecha límite
        // se calcula al recepcionar. Los instrumentos y el PDF se registran en
        // el modal Atender / Informe.
        dias_plazo: requierePlazo ? Number(diasPlazo) : null,
        instrumentos_generados: null,
        instrumento_generado: null,
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
                onChange={(e) => setDestinoValor(e.target.value)}
                style={ESTILO_INPUT}
                disabled={enviando || destinoFijo}
              >
                {destinos.map((d) => <option key={d.valor} value={d.valor}>{d.label}</option>)}
              </select>
              <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>Destino: {tituloDestino}</div>
            </div>

            {paso === 3 && (
              <div style={{ marginBottom: '1rem', padding: '10px 12px', borderRadius: '6px', backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534', fontSize: '0.78rem', lineHeight: 1.45 }}>
                El informe, los instrumentos generados y el PDF ya fueron registrados en <strong>Atender / Informe</strong>.
                La comisión solo puede remitir el expediente a <strong>Asesoría General del Pleno</strong>.
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
                        data-testid={`plazo-${plazo.dias}`}
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
                <div style={{ fontSize: '0.72rem', color: '#64748B', marginTop: '4px' }}>
                  El plazo se iniciará cuando la comisión confirme la recepción del expediente.
                </div>
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
