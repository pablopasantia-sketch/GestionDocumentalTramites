import React from 'react';
import {
  X,
  Printer,
  Share2,
  ExternalLink,
  Check,
  Landmark,
  Clock,
  User,
  Calendar,
  FileText,
  Paperclip,
  CheckCircle,
  FileCheck,
  AlertCircle
} from 'lucide-react';
import FlujoGraficoTramite from './FlujoGraficoTramite';

export default function ConsultaTramiteModal({
  isOpen,
  onClose,
  tramite,
  onOpenHojaDeRuta,
  onCopyLink,
  copiedLink,
  formatDuracion,
  formatBytes
}) {
  if (!isOpen || !tramite) return null;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1250,
        padding: '1rem',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: '960px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          borderTop: '5px solid #800000',
          backgroundColor: '#FFFFFF',
          margin: 'auto'
        }}
      >
        {/* ======================================================= */}
        {/* ENCABEZADO DEL MODAL */}
        {/* ======================================================= */}
        <div
          style={{
            padding: '1rem 1.5rem',
            backgroundColor: '#1B365D',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '2px solid #800000'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFC107'
              }}
            >
              <Landmark size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#CBD5E1', fontWeight: 600 }}>
                  Expediente Oficial CMS &bull; Gestión {tramite.gestion}
                </span>
                <span
                  className={`badge ${
                    tramite.estado === 'CONCLUIDO' ? 'badge-vigente' :
                    tramite.estado === 'ANULADO' ? 'badge-alerta' :
                    tramite.estado === 'BLOQUEADO' ? 'badge-modificada' :
                    tramite.estado === 'EN_TRANSITO' ? 'badge-azul' : 'badge-modificada'
                  }`}
                  style={{ fontSize: '0.75rem', padding: '3px 8px', fontWeight: 700 }}
                >
                  {tramite.estado}
                </span>
                <span
                  className={`badge ${
                    tramite.prioridad === 'URGENTE' ? 'badge-alerta' :
                    tramite.prioridad === 'ALTA' ? 'badge-azul' : 'badge-sucre'
                  }`}
                  style={{ fontSize: '0.72rem', padding: '3px 8px' }}
                >
                  Prioridad: {tramite.prioridad}
                </span>
              </div>
              <h2 style={{ fontSize: '1.45rem', fontWeight: 800, margin: '2px 0 0 0', color: '#FFFFFF', letterSpacing: '0.3px' }}>
                {tramite.numero_correlativo}
              </h2>
            </div>
          </div>

          {/* Acciones Rápidas y Botón Cerrar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {onCopyLink && (
              <button
                type="button"
                onClick={onCopyLink}
                className="btn btn-secondary btn-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.25)',
                  color: '#FFFFFF',
                  padding: '5px 10px',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Copiar enlace directo de este trámite"
              >
                {copiedLink ? <Check size={14} color="#10B981" /> : <Share2 size={14} />}
                <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir'}</span>
              </button>
            )}

            {onOpenHojaDeRuta && (
              <button
                type="button"
                onClick={onOpenHojaDeRuta}
                className="btn btn-sm"
                style={{
                  background: '#800000',
                  color: '#FFFFFF',
                  borderColor: '#991B1B',
                  padding: '5px 12px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Generar e imprimir Hoja de Ruta oficial"
              >
                <Printer size={14} />
                <span>Hoja de Ruta</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.12)',
                border: 'none',
                color: '#FFFFFF',
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              aria-label="Cerrar modal"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ======================================================= */}
        {/* CUERPO DEL MODAL (SCROLLABLE) */}
        {/* ======================================================= */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', textAlign: 'left' }}>
          
          {/* Ficha Principal de Datos Generales */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '12px',
              backgroundColor: '#F8FAFC',
              borderRadius: '8px',
              padding: '14px 16px',
              border: '1px solid #E2E8F0',
              marginBottom: '1.25rem'
            }}
          >
            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Tipo de Proceso Institucional
              </span>
              <strong style={{ fontSize: '0.95rem', color: '#1B365D' }}>
                {tramite.tipo_proceso}
              </strong>
              {tramite.tipo_proceso_codigo && (
                <span style={{ marginLeft: '6px', background: '#E2E8F0', color: '#334155', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                  {tramite.tipo_proceso_codigo}
                </span>
              )}
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Remitente / Solicitante
              </span>
              <strong style={{ fontSize: '0.95rem', color: '#334155' }}>
                {tramite.remitente_nombre || tramite.remitente || 'No especificado'}
              </strong>
              {tramite.remitente_tipo && (
                <span style={{ fontSize: '0.78rem', color: '#64748B', display: 'block' }}>
                  ({tramite.remitente_tipo})
                </span>
              )}
            </div>

            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Referencia / Asunto Oficial
              </span>
              <p style={{ margin: '3px 0 0 0', fontSize: '0.92rem', color: '#1E293B', lineHeight: 1.45, fontWeight: 500 }}>
                {tramite.referencia}
              </p>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Fecha de Radicación
              </span>
              <span style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <Calendar size={13} color="#64748B" />
                {(tramite.fecha_radicacion || tramite.fecha_creacion) ? new Date(tramite.fecha_radicacion || tramite.fecha_creacion).toLocaleString('es-BO') : '-'}
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Fojas / Anexos
              </span>
              <span style={{ fontSize: '0.85rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <FileText size={13} color="#64748B" />
                {tramite.fojas ?? tramite.nro_hojas ?? 0} fojas
              </span>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Ubicación Actual
              </span>
              <strong style={{ fontSize: '0.85rem', color: '#800000' }}>
                {tramite.ubicacion_actual || 'Ventanilla Central'}
              </strong>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#64748B', fontWeight: 600, display: 'block' }}>
                Funcionario Asignado
              </span>
              <span style={{ fontSize: '0.85rem', color: '#1B365D', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}>
                <User size={13} color="#1B365D" />
                {tramite.usuario_actual_nombre || 'En custodia / derivación'}
              </span>
              {tramite.usuario_actual_cargo && (
                <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block', paddingLeft: '18px' }}>
                  {tramite.usuario_actual_cargo}
                </span>
              )}
            </div>

            {/* SLA y Plazos Oficiales */}
            {(tramite.tiempo_estimado_horas || tramite.fecha_limite_respuesta) && (
              <div style={{
                gridColumn: '1 / -1',
                marginTop: '4px',
                paddingTop: '8px',
                borderTop: '1px dashed #CBD5E1',
                display: 'flex',
                gap: '16px',
                flexWrap: 'wrap',
                fontSize: '0.82rem'
              }}>
                {tramite.tiempo_estimado_horas && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569' }}>
                    <Clock size={13} color="#059669" />
                    <strong>Plazo estimado normativo (SLA):</strong> {tramite.tiempo_estimado_horas} horas
                  </span>
                )}
                {tramite.fecha_limite_respuesta && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#800000' }}>
                    <Calendar size={13} color="#800000" />
                    <strong>Fecha límite de respuesta:</strong> {new Date(tramite.fecha_limite_respuesta).toLocaleDateString('es-BO')}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* ======================================================= */}
          {/* DIAGRAMA DE FLUJO INSTITUCIONAL (RF-08.6, RF-09.2) */}
          {/* ======================================================= */}
          <div style={{ marginBottom: '1.5rem' }}>
            <FlujoGraficoTramite tramite={tramite} />
          </div>

          {/* ======================================================= */}
          {/* HISTORIAL Y TRAZABILIDAD INMUTABLE (RF-08.5, RF-08.7) */}
          {/* ======================================================= */}
          {(tramite.historial || tramite.movimientos || []).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={16} color="#800000" />
                  <strong style={{ fontSize: '0.95rem', color: '#1B365D' }}>
                    Trazabilidad Histórica ({(tramite.historial || tramite.movimientos).length} pasos registrados)
                  </strong>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#64748B', fontStyle: 'italic' }}>
                  Orden cronológico auditado
                </span>
              </div>

              <div style={{ display: 'grid', gap: '10px' }}>
                {(tramite.historial || tramite.movimientos).map((mov, index) => (
                  <div
                    key={mov.id || index}
                    style={{
                      display: 'flex',
                      gap: '12px',
                      alignItems: 'flex-start'
                    }}
                  >
                    {/* Número de Paso */}
                    <div style={{
                      flex: '0 0 30px',
                      height: '30px',
                      borderRadius: '50%',
                      background: mov.tipo_movimiento === 'RETROCESO' || mov.justificacion_retroceso ? '#D97706' : '#1B365D',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      marginTop: '2px'
                    }}>
                      {mov.orden || index + 1}
                    </div>

                    {/* Tarjeta del Movimiento */}
                    <div style={{
                      flex: 1,
                      padding: '12px 14px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderLeft: `4px solid ${
                        mov.tipo_movimiento === 'RETROCESO' || mov.justificacion_retroceso ? '#D97706' :
                        mov.instrumento_generado ? '#10B981' : '#1B365D'
                      }`,
                      borderRadius: '6px'
                    }}>
                      {/* Fila Superior: Actividad, Badges y Fechas */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <strong style={{ color: '#1B365D', fontSize: '0.9rem' }}>
                            {mov.actividad}
                          </strong>

                          {/* Badge de Devolución / Retroceso */}
                          {(mov.tipo_movimiento === 'RETROCESO' || Boolean(mov.justificacion_retroceso)) && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#92400E',
                              backgroundColor: '#FEF3C7',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              border: '1px solid #FCD34D'
                            }}>
                              DEVOLUCIÓN OFICIAL
                            </span>
                          )}

                          {/* Badge de Instrumento Legislativo Resultante */}
                          {(mov.instrumento_generado || mov.instrumentos_generados) && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#065F46',
                              backgroundColor: '#D1FAE5',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              border: '1px solid #6EE7B7',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <FileCheck size={11} />
                              INSTRUMENTO: {mov.instrumentos_generados || mov.instrumento_generado}
                            </span>
                          )}

                          {/* Badge "Hasta Hoy" (RF-08.9) */}
                          {mov.es_hasta_hoy && (
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: '#1E40AF',
                              backgroundColor: '#DBEAFE',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              border: '1px solid #93C5FD'
                            }}>
                              EN ATENCIÓN HASTA HOY
                            </span>
                          )}
                        </div>

                        {/* Fecha y Tiempo Transcurrido (RF-08.8) */}
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.75rem', color: '#64748B', display: 'block' }}>
                            {new Date(mov.fecha || mov.fecha_envio).toLocaleString('es-BO')}
                          </span>
                          {mov.tiempo_transcurrido_minutos > 0 && formatDuracion && (
                            <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                              Tiempo de paso: {formatDuracion(mov.tiempo_transcurrido_minutos)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Ruta de Envío: De unidad origen hacia unidad destino */}
                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '4px' }}>
                        De: <strong>{mov.unidad_origen}</strong>
                        {mov.usuario_origen_nombre && ` (${mov.usuario_origen_nombre}${mov.usuario_origen_cargo ? ` - ${mov.usuario_origen_cargo}` : ''})`}
                        {mov.unidad_destino && (
                          <span> ➔ Hacia: <strong>{mov.unidad_destino}</strong></span>
                        )}
                        {mov.usuario_destino_nombre && ` (${mov.usuario_destino_nombre}${mov.usuario_destino_cargo ? ` - ${mov.usuario_destino_cargo}` : ''})`}
                      </div>

                      {/* Motivo de Devolución si existió */}
                      {mov.justificacion_retroceso && (
                        <div style={{
                          fontSize: '0.78rem',
                          color: '#92400E',
                          marginTop: '6px',
                          background: '#FFFBEB',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          borderLeft: '3px solid #D97706'
                        }}>
                          <strong>Motivo de Devolución:</strong> {mov.justificacion_retroceso}
                        </div>
                      )}

                      {/* Proveído oficial */}
                      {mov.proveido && (
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#800000',
                          marginTop: '6px',
                          background: 'var(--color-primary-sucre-light)',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          borderLeft: '3px solid #800000',
                          lineHeight: 1.4
                        }}>
                          <strong>Proveído:</strong> {mov.proveido}
                          {mov.instruccion && (
                            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '2px' }}>
                              Instrucción: <em>{mov.instruccion}</em>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ======================================================= */}
          {/* RESPALDOS Y DOCUMENTOS ADJUNTOS (RF-07, RF-08.5) */}
          {/* ======================================================= */}
          {tramite.adjuntos && tramite.adjuntos.length > 0 && (
            <div style={{
              background: '#F8FAFC',
              borderRadius: '6px',
              border: '1px solid #E2E8F0',
              padding: '12px 14px',
              marginBottom: '0.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Paperclip size={16} color="#1B365D" />
                <strong style={{ fontSize: '0.88rem', color: '#1B365D' }}>
                  Documentos y Respaldos Adjuntos al Expediente ({tramite.adjuntos.length})
                </strong>
              </div>
              <div style={{ display: 'grid', gap: '6px' }}>
                {tramite.adjuntos.map((adj) => (
                  <div
                    key={adj.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#FFFFFF',
                      border: '1px solid #E2E8F0',
                      borderRadius: '4px',
                      fontSize: '0.82rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileText size={16} color="#800000" />
                      <span style={{ fontWeight: 600, color: '#334155' }}>{adj.nombre_original}</span>
                      {formatBytes && (
                        <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({formatBytes(adj.tamano_bytes)})</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                      Subido: {new Date(adj.fecha_subida).toLocaleDateString('es-BO')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* ======================================================= */}
        {/* PIE DEL MODAL */}
        {/* ======================================================= */}
        <div
          style={{
            padding: '0.85rem 1.5rem',
            backgroundColor: '#F8FAFC',
            borderTop: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#64748B' }}>
            <Landmark size={14} color="#800000" />
            <span>Información oficial certificada por el Concejo Municipal de Sucre</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {tramite.id && (
              <a
                href={`/api/tramites/${tramite.id}/hoja-de-ruta/html`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '5px' }}
              >
                <ExternalLink size={13} />
                <span>Hoja de Ruta (HTML)</span>
              </a>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn btn-primary btn-sm"
              style={{ fontSize: '0.82rem', padding: '6px 18px' }}
            >
              Cerrar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
