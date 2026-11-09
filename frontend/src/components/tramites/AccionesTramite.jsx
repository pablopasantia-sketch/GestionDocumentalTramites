import React, { useState } from 'react';
import {
  UserCheck,
  Send,
  Eye,
  ClipboardCheck,
  Gavel,
  PenTool,
  Stamp,
  Loader2,
  X,
  AlertCircle,
} from 'lucide-react';
import { tramitesService } from '../../services/api';
import ModalDerivar from './ModalDerivar';
import ModalAtender from './ModalAtender';
import {
  obtenerModoAtencion,
  puedeDerivar,
  puedeRecepcionar,
} from '../../utils/flujoExterno';

const ETIQUETAS_MODO = {
  comision: { texto: 'Atender / Informe', icono: ClipboardCheck, color: '#800000', testId: 'btn-atender-comision' },
  pleno: { texto: 'Registrar Pleno', icono: Gavel, color: '#1E3A8A', testId: 'btn-atender-pleno' },
  'firma-presidencia': { texto: 'Firmar Presidencia', icono: PenTool, color: '#800000', testId: 'btn-firmar-presidencia' },
  'firma-secretaria': { texto: 'Firmar Secretaría', icono: Stamp, color: '#047857', testId: 'btn-firmar-secretaria' },
  despacho: { texto: 'Despacho Final', icono: Send, color: '#7C3AED', testId: 'btn-despacho-final' },
};

const estiloBoton = (color) => ({
  backgroundColor: color,
  color: '#FFFFFF',
  padding: '5px 9px',
  fontSize: '0.78rem',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  fontWeight: 600,
  whiteSpace: 'nowrap',
});

export default function AccionesTramite({ tramite, user, bandejaActiva, onVerDetalle, onRefresh }) {
  const [derivarAbierto, setDerivarAbierto] = useState(false);
  const [atenderAbierto, setAtenderAbierto] = useState(false);
  const [modoAtencion, setModoAtencion] = useState(null);
  const [recepcionAbierta, setRecepcionAbierta] = useState(false);
  const [proveidoRecepcion, setProveidoRecepcion] = useState('');
  const [recepcionando, setRecepcionando] = useState(false);
  const [error, setError] = useState(null);

  const enBandejaEnviados = bandejaActiva === 'DESPACHADOS';
  const mostrarRecepcionar = !enBandejaEnviados && puedeRecepcionar(tramite);
  const modo = obtenerModoAtencion(tramite, user);
  const mostrarDerivar = !enBandejaEnviados && puedeDerivar(tramite, user);

  const abrirRecepcion = () => {
    setProveidoRecepcion('Documento recepcionado para atención y trámite reglamentario correspondiente.');
    setError(null);
    setRecepcionAbierta(true);
  };

  const confirmarRecepcion = async () => {
    if (proveidoRecepcion.trim().length < 3) {
      setError('Debe ingresar el proveído de recepción (mínimo 3 caracteres).');
      return;
    }
    setRecepcionando(true);
    setError(null);
    try {
      await tramitesService.recepcionar(tramite.id, { proveido: proveidoRecepcion.trim() });
      setRecepcionAbierta(false);
      onRefresh?.(`Trámite ${tramite.numero_correlativo} recepcionado. La custodia quedó asignada a su usuario.`);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'No se pudo recepcionar el trámite.');
    } finally {
      setRecepcionando(false);
    }
  };

  const abrirAtender = () => {
    if (!modo) return;
    setModoAtencion(modo);
    setAtenderAbierto(true);
  };

  const etiqueta = modo ? ETIQUETAS_MODO[modo] : null;
  const IconoEtiqueta = etiqueta?.icono;

  return (
    <>
      <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {mostrarRecepcionar && (
          <button
            type="button"
            data-testid="btn-recepcionar"
            onClick={abrirRecepcion}
            style={estiloBoton('#15803D')}
            title="Confirmar recepción y tomar custodia del expediente"
          >
            <UserCheck size={13} />
            <span>Recepcionar</span>
          </button>
        )}

        {modo && etiqueta && IconoEtiqueta && (
          <button
            type="button"
            data-testid={etiqueta.testId}
            onClick={abrirAtender}
            style={estiloBoton(etiqueta.color)}
            title={etiqueta.texto}
          >
            <IconoEtiqueta size={13} />
            <span>{etiqueta.texto}</span>
          </button>
        )}

        {mostrarDerivar && (
          <button
            type="button"
            data-testid="btn-derivar"
            onClick={() => setDerivarAbierto(true)}
            style={estiloBoton('#B45309')}
            title="Derivar el expediente al siguiente órgano del circuito"
          >
            <Send size={13} />
            <span>Derivar</span>
          </button>
        )}

        <button
          type="button"
          data-testid="btn-ver"
          onClick={() => onVerDetalle?.(tramite.id)}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 9px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
          title="Ver el detalle y la trazabilidad del expediente"
        >
          <Eye size={13} />
          <span>Ver</span>
        </button>
      </div>

      <ModalDerivar
        open={derivarAbierto}
        tramite={tramite}
        user={user}
        onClose={() => setDerivarAbierto(false)}
        onSuccess={(mensaje) => onRefresh?.(mensaje)}
      />

      <ModalAtender
        open={atenderAbierto}
        mode={modoAtencion}
        tramite={tramite}
        user={user}
        onClose={() => setAtenderAbierto(false)}
        onSuccess={(mensaje) => onRefresh?.(mensaje)}
      />

      {recepcionAbierta && (
        <div
          className="modal-backdrop"
          data-testid="modal-recepcionar"
          style={{ zIndex: 12550 }}
          onClick={(e) => { if (e.target === e.currentTarget && !recepcionando) setRecepcionAbierta(false); }}
        >
          <div className="modal-dialog" style={{ maxWidth: '540px', width: '94vw' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <UserCheck size={22} color="#15803D" />
                <div>
                  <h3 style={{ margin: 0, color: '#1B365D', fontSize: '1rem' }}>Confirmar recepción del expediente</h3>
                  <div style={{ fontSize: '0.75rem', color: '#64748B' }}>{tramite.numero_correlativo} · {tramite.referencia}</div>
                </div>
              </div>
              <button onClick={() => setRecepcionAbierta(false)} className="modal-close-btn" disabled={recepcionando}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body" style={{ padding: '1.25rem 1.5rem' }}>
              {error && (
                <div style={{ display: 'flex', gap: '8px', background: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '10px 12px', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.82rem' }}>
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span>{error}</span>
                </div>
              )}

              <div style={{ fontSize: '0.82rem', color: '#475569', marginBottom: '1rem' }}>
                Al confirmar, la custodia del expediente se asignará a su usuario y el trámite pasará a la bandeja
                <strong> En Atención</strong>.
              </div>

              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Proveído de recepción
              </label>
              <textarea
                data-testid="recepcion-proveido"
                value={proveidoRecepcion}
                onChange={(e) => setProveidoRecepcion(e.target.value)}
                rows={3}
                style={{
                  width: '100%',
                  padding: '9px 11px',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '0.86rem',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
                disabled={recepcionando}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '0.9rem 1.5rem', borderTop: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setRecepcionAbierta(false)} disabled={recepcionando}>
                Cancelar
              </button>
              <button
                type="button"
                data-testid="btn-confirmar-recepcion"
                className="btn btn-primary"
                onClick={confirmarRecepcion}
                style={{ backgroundColor: '#15803D', borderColor: '#15803D' }}
                disabled={recepcionando}
              >
                {recepcionando
                  ? <Loader2 size={15} className="spin" style={{ marginRight: '5px', verticalAlign: 'middle' }} />
                  : <UserCheck size={15} style={{ marginRight: '5px', verticalAlign: 'middle' }} />}
                {recepcionando ? 'Recepcionando…' : 'Confirmar y Recepcionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
