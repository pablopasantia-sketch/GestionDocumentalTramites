import React from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Gavel,
  Info,
  PenTool,
  Send,
  Stamp,
} from 'lucide-react';
import AccionesTramite from './AccionesTramite';
import {
  PASOS_CIRCUITO,
  esComision,
  obtenerCodUnidadActual,
  obtenerModoAtencion,
  obtenerPaso,
  puedeDerivar,
  puedeRecepcionar,
  tieneCustodia,
} from '../../utils/flujoExterno';

const formatearFecha = (valor) => {
  if (!valor) return '—';
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return String(valor);
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const ICONOS_PASO = {
  1: ClipboardCheck,
  2: Activity,
  3: FileText,
  4: Activity,
  5: Gavel,
  6: PenTool,
  7: Stamp,
  8: Send,
};

const Dato = ({ etiqueta, valor, color = '#1B365D' }) => (
  <div>
    <small style={{ color: '#64748B', display: 'block', fontWeight: 700, fontSize: '0.72rem', letterSpacing: '0.02em' }}>
      {etiqueta}
    </small>
    <span style={{ color, fontSize: '0.85rem', fontWeight: 600 }}>{valor || '—'}</span>
  </div>
);

const plazoVencido = (fechaLimite) => {
  if (!fechaLimite) return false;
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const limite = new Date(fechaLimite);
  limite.setHours(23, 59, 59, 999);
  return hoy > limite;
};

const Aviso = ({ tono, icono: Icono, children }) => {
  const paletas = {
    verde: { backgroundColor: '#F0FDF4', border: '1px solid #86EFAC', color: '#166534' },
    ambar: { backgroundColor: '#FFFBEB', border: '1px solid #FCD34D', color: '#92400E' },
    rojo: { backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B' },
    azul: { backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A' },
  };
  return (
    <div
      style={{
        ...paletas[tono],
        borderRadius: '8px',
        padding: '10px 12px',
        fontSize: '0.82rem',
        lineHeight: 1.45,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        marginBottom: '12px',
      }}
    >
      {Icono && <Icono size={16} style={{ flexShrink: 0, marginTop: '1px' }} />}
      <span>{children}</span>
    </div>
  );
};

export default function EtapaActualDetalle({
  tramite,
  user,
  bandejaActiva,
  onRefresh,
  onVerDetalle,
}) {
  if (!tramite) return null;

  const paso = obtenerPaso(tramite);
  const etapa = PASOS_CIRCUITO[paso] || { titulo: `Paso ${paso}`, descripcion: '' };
  const IconoEtapa = ICONOS_PASO[paso] || Activity;
  const enBandejaEnviados = bandejaActiva === 'DESPACHADOS';
  const mostrarRecepcionar = !enBandejaEnviados && puedeRecepcionar(tramite);
  const modoAtencion = obtenerModoAtencion(tramite, user);
  const mostrarDerivar = !enBandejaEnviados && puedeDerivar(tramite, user);
  const hayAcciones = mostrarRecepcionar || Boolean(modoAtencion) || mostrarDerivar;
  const adjuntos = Array.isArray(tramite.adjuntos) ? tramite.adjuntos : [];
  const historial = Array.isArray(tramite.historial) ? tramite.historial : [];
  const ultimoMovimiento = [...historial].sort((a, b) => (a.orden || 0) - (b.orden || 0)).pop();
  // Tras RF-10.2 el último movimiento de un trámite reabierto es la habilitación.
  const reactivado = ultimoMovimiento?.tipo_movimiento === 'HABILITACION';
  const informeConcluido = Boolean(tramite.fecha_fin_informe);
  const vencido = paso === 3 && !informeConcluido && plazoVencido(tramite.fecha_limite_respuesta);
  // Solo la comisión destinataria recibe instrucciones operativas sobre el informe.
  // Quien derivó el expediente (Presidencia) u otras unidades ven solo el estado.
  const esComisionDestinataria = !enBandejaEnviados
    && tieneCustodia(tramite)
    && esComision(obtenerCodUnidadActual(tramite));

  const renderDetalle = () => {
    switch (paso) {
      case 1:
        return (
          <Aviso tono="azul" icono={Info}>
            El expediente se encuentra en <strong>Ventanilla Única</strong> para su registro y emisión de la Hoja de Ruta externa.
          </Aviso>
        );

      case 2:
        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <Dato etiqueta="DESTINO ACTUAL" valor={tramite.destinatario_unidad || 'Presidencia del Concejo'} />
            <Dato etiqueta="PROVEÍDO / INSTRUCCIÓN" valor={tramite.instruccion || ultimoMovimiento?.proveido || 'Pendiente de derivación a comisión'} />
          </div>
        );

      case 3:
        return (
          <div>
            {informeConcluido ? (
              esComisionDestinataria ? (
                <Aviso tono="verde" icono={CheckCircle2}>
                  <strong>Informe de comisión concluido.</strong> La comisión ya cumplió su tarea y el expediente está habilitado para remitirse a Asesoría General del Pleno.
                </Aviso>
              ) : (
                <Aviso tono="azul" icono={Info}>
                  El informe de comisión está concluido. El expediente continúa su trámite hacia Asesoría General del Pleno.
                </Aviso>
              )
            ) : vencido ? (
              esComisionDestinataria ? (
                <Aviso tono="rojo" icono={AlertTriangle}>
                  <strong>Plazo de elaboración vencido.</strong> El plazo reglamentario para presentar el informe venció el{' '}
                  {formatearFecha(tramite.fecha_limite_respuesta)}. No se admiten informes extemporáneos.
                </Aviso>
              ) : (
                <Aviso tono="rojo" icono={AlertTriangle}>
                  El plazo reglamentario de la comisión venció el {formatearFecha(tramite.fecha_limite_respuesta)}.
                </Aviso>
              )
            ) : esComisionDestinataria && mostrarRecepcionar ? (
              <Aviso tono="ambar" icono={Info}>
                <strong>Recepción pendiente.</strong> Confirme la recepción del expediente para iniciar el plazo reglamentario de elaboración del informe.
              </Aviso>
            ) : esComisionDestinataria ? (
              <Aviso tono="ambar" icono={Info}>
                <strong>Informe pendiente.</strong> Suba el informe digital y concluya la tarea con la acción <strong>Atender / Informe</strong>.
                La acción <strong>Derivar</strong> se habilitará recién cuando el informe esté concluido.
              </Aviso>
            ) : (
              <Aviso tono="azul" icono={Info}>
                El expediente fue derivado a la comisión y está a la espera de su recepción e informe.
              </Aviso>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <Dato
                etiqueta="INICIO DEL INFORME"
                valor={tramite.fecha_inicio_informe ? formatearFecha(tramite.fecha_inicio_informe) : 'Se inicia al recepcionar'}
              />
              <Dato etiqueta="PLAZO REGLAMENTARIO" valor={tramite.dias_plazo_informe ? `${tramite.dias_plazo_informe} días hábiles` : '—'} />
              <Dato
                etiqueta={informeConcluido ? 'FECHA DE CONCLUSIÓN' : 'FECHA LÍMITE'}
                valor={formatearFecha(
                  informeConcluido
                    ? tramite.fecha_fin_informe
                    : (tramite.fecha_limite_respuesta || 'Se fija al recepcionar')
                )}
                color={informeConcluido ? '#15803D' : vencido ? '#B91C1C' : '#1B365D'}
              />
              <Dato etiqueta="DOCUMENTOS DEL INFORME" valor={`${adjuntos.length} adjunto(s)`} />
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <Aviso tono="ambar" icono={Info}>
              El expediente se encuentra en <strong>Asesoría General del Pleno</strong> para revisión técnica y remisión al Pleno del Concejo.
            </Aviso>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <Dato etiqueta="INFORME DE COMISIÓN" valor={informeConcluido ? 'Concluido' : 'Pendiente'} color={informeConcluido ? '#15803D' : '#B45309'} />
              <Dato etiqueta="DOCUMENTOS ADJUNTOS" valor={`${adjuntos.length} archivo(s)`} />
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            {tramite.sesion_pleno_nro ? (
              <Aviso tono="verde" icono={CheckCircle2}>
                <strong>Sesión del Pleno registrada.</strong> El tratamiento y la votación quedaron documentados.
              </Aviso>
            ) : (
              <Aviso tono="ambar" icono={Gavel}>
                El expediente está pendiente de tratamiento y votación en <strong>Sesión del Pleno</strong>.
              </Aviso>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
              <Dato etiqueta="NRO. DE SESIÓN" valor={tramite.sesion_pleno_nro || 'Pendiente'} />
              <Dato etiqueta="FECHA DE TRATAMIENTO" valor={formatearFecha(tramite.sesion_pleno_fecha)} />
              <Dato etiqueta="RESULTADO" valor={tramite.sesion_pleno_resultado || 'Pendiente'} color="#1E3A8A" />
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <Aviso tono={tramite.firma_presidencia ? 'verde' : 'ambar'} icono={PenTool}>
              {tramite.firma_presidencia
                ? <><strong>Firma de Presidencia registrada.</strong> El expediente puede remitirse a Secretaría General.</>
                : <>El expediente está pendiente de la <strong>firma reglamentaria de Presidencia</strong>.</>}
            </Aviso>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <Dato etiqueta="FIRMA PRESIDENCIA" valor={tramite.firma_presidencia ? 'Validada' : 'Pendiente'} color={tramite.firma_presidencia ? '#15803D' : '#B45309'} />
              <Dato etiqueta="FIRMADO POR" valor={tramite.firma_presidencia_usuario} />
              <Dato etiqueta="FECHA DE FIRMA" valor={formatearFecha(tramite.firma_presidencia_fecha)} />
            </div>
          </div>
        );

      case 7:
        return (
          <div>
            <Aviso tono={tramite.despacho_final_cite ? 'verde' : 'ambar'} icono={Stamp}>
              {tramite.despacho_final_cite
                ? <><strong>Despacho final realizado.</strong> El circuito institucional quedó concluido.</>
                : reactivado
                  ? <><strong>Trámite reactivado en Secretaría General.</strong> Las firmas se conservaron y el despacho anterior fue limpiado. Registre el nuevo CITE y destinatario con la acción <strong>Despacho Final</strong>.</>
                  : <>Etapa de <strong>Secretaría General</strong>: segunda firma y Despacho Final del expediente.</>}
            </Aviso>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <Dato etiqueta="FIRMA PRESIDENCIA" valor={tramite.firma_presidencia ? 'Validada' : 'Pendiente'} color={tramite.firma_presidencia ? '#15803D' : '#B45309'} />
              <Dato etiqueta="FIRMA SECRETARÍA" valor={tramite.firma_secretaria ? 'Validada' : 'Pendiente'} color={tramite.firma_secretaria ? '#15803D' : '#B45309'} />
              <Dato etiqueta="FECHA FIRMA SECRETARÍA" valor={formatearFecha(tramite.firma_secretaria_fecha)} />
            </div>
          </div>
        );

      case 8:
        return (
          <div>
            <Aviso tono="verde" icono={CheckCircle2}>
              <strong>Expediente concluido y despachado oficialmente.</strong>
            </Aviso>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
              <Dato etiqueta="CITE OFICIAL SALIENTE" valor={tramite.despacho_final_cite} color="#7C3AED" />
              <Dato etiqueta="DESTINATARIO OFICIAL" valor={tramite.despacho_final_destinatario} />
              <Dato etiqueta="FECHA DE REMISIÓN" valor={formatearFecha(tramite.despacho_final_fecha)} />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div
      data-testid="panel-etapa-actual"
      style={{
        marginBottom: '1.5rem',
        padding: '1.1rem 1.25rem',
        backgroundColor: '#F8FAFC',
        borderRadius: '8px',
        border: '1px solid #CBD5E1',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              backgroundColor: '#1B365D',
              color: '#FFFFFF',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <IconoEtapa size={17} />
          </span>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748B', letterSpacing: '0.04em' }}>
              ETAPA ACTUAL DEL CIRCUITO
            </div>
            <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#1B365D', fontWeight: 700 }}>
              {etapa.titulo}
            </h4>
          </div>
        </div>
        <span
          data-testid="etapa-actual-paso"
          className="badge"
          style={{ backgroundColor: '#1B365D', color: '#FFFFFF', fontSize: '10px', fontWeight: 700, padding: '4px 9px' }}
        >
          PASO {paso} DE 8
        </span>
      </div>

      {etapa.descripcion && (
        <p style={{ margin: '0 0 0.9rem', fontSize: '0.82rem', color: '#475569', lineHeight: 1.45 }}>
          {etapa.descripcion}
        </p>
      )}

      {renderDetalle()}

      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
          {hayAcciones
            ? 'Acciones disponibles para su unidad, cargo y custodia actual.'
            : 'No tiene acciones pendientes en esta etapa.'}
        </span>
        <AccionesTramite
          tramite={tramite}
          user={user}
          bandejaActiva={bandejaActiva}
          onVerDetalle={onVerDetalle}
          onRefresh={onRefresh}
          ocultarVer
        />
      </div>
    </div>
  );
}
