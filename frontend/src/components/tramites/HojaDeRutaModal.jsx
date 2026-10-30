import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  ExternalLink, 
  X, 
  FileText, 
  Landmark, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Calendar,
  User,
  Building2,
  Share2
} from 'lucide-react';
import { tramitesService } from '../../services/api';

export default function HojaDeRutaModal({ isOpen, onClose, tramiteId, initialData = null }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(!initialData && !!tramiteId);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setError(null);
      return;
    }

    if (initialData && (!tramiteId || initialData.id === tramiteId)) {
      setData(initialData);
      setLoading(false);
      return;
    }

    if (tramiteId) {
      setLoading(true);
      setError(null);
      tramitesService.getById(tramiteId)
        .then((res) => {
          if (res.success && res.data) {
            setData(res.data);
          } else {
            setError(res.message || 'No se pudo cargar la información de la Hoja de Ruta.');
          }
        })
        .catch((err) => {
          setError(err.response?.data?.message || err.message || 'Error al conectar con el servidor.');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [isOpen, tramiteId, initialData]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenNewTab = () => {
    if (data?.id) {
      window.open(`/tramite/${data.id}/hoja-de-ruta`, '_blank');
    }
  };

  return (
    <div className="modal-overlay print-hoja-de-ruta" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1300,
      padding: '1.5rem',
      overflowY: 'auto'
    }}>
      <div className="card" style={{
        maxWidth: '850px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '6px',
        overflow: 'hidden',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        borderTop: '5px solid #800000',
        backgroundColor: '#FFFFFF',
        margin: 'auto'
      }}>
        {/* Barra superior (no imprimible) */}
        <div className="hoja-ruta-toolbar no-print" style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: '#1B365D',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #800000'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FileText size={20} color="#FFC107" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.3px' }}>
              Hoja de Ruta Institucional &bull; {data?.numero_correlativo || (loading ? 'Cargando...' : 'Trámite')}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handlePrint}
              className="btn btn-sm"
              disabled={loading || !data}
              style={{
                backgroundColor: '#800000',
                color: 'white',
                border: 'none',
                padding: '5px 12px',
                borderRadius: '4px',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer'
              }}
              title="Imprimir documento oficial o guardar en PDF"
            >
              <Printer size={15} />
              <span>Imprimir / PDF</span>
            </button>

            {data?.id && (
              <button
                type="button"
                onClick={handleOpenNewTab}
                className="btn btn-sm btn-secondary"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '5px 10px',
                  fontSize: '0.82rem'
                }}
                title="Abrir en pestaña completa aislada"
              >
                <ExternalLink size={14} />
                <span>Nueva Pestaña</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px',
                borderRadius: '4px'
              }}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Cuerpo del modal */}
        <div className="modal-body" style={{
          padding: '1.5rem 2rem',
          overflowY: 'auto',
          backgroundColor: '#FFFFFF',
          flex: 1
        }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#6C757D' }}>
              <div className="spinner" style={{ margin: '0 auto 1rem', borderColor: '#800000', borderTopColor: 'transparent' }} />
              <p style={{ margin: 0, fontWeight: 500 }}>Cargando expediente y trazabilidad de la Hoja de Ruta...</p>
            </div>
          )}

          {error && (
            <div style={{
              background: '#F8D7DA',
              color: '#721C24',
              padding: '1rem',
              borderRadius: '4px',
              border: '1px solid #F5C6CB',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <AlertTriangle size={20} />
              <div>{error}</div>
            </div>
          )}

          {!loading && !error && data && (
            <div className="hoja-ruta-document" style={{
              fontFamily: "'Segoe UI', Arial, sans-serif",
              color: '#1A202C',
              fontSize: '11px',
              lineHeight: 1.35
            }}>
              {/* Encabezado Institucional */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2.5px solid #800000',
                paddingBottom: '10px',
                marginBottom: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '4px',
                    backgroundColor: '#800000',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 6px rgba(128,0,0,0.2)'
                  }}>
                    <Landmark size={30} />
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 800, color: '#800000', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      Gobierno Autónomo Municipal de Sucre
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#1B365D' }}>
                      CONCEJO MUNICIPAL DE SUCRE &bull; GACETA OFICIAL
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 800, color: '#1B365D', textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: '2px' }}>
                      HOJA DE RUTA DE TRÁMITES Y CORRESPONDENCIA
                    </div>
                  </div>
                </div>

                <div style={{
                  border: '2px solid #800000',
                  backgroundColor: '#FDF8F8',
                  borderRadius: '4px',
                  padding: '6px 14px',
                  textAlign: 'center',
                  minWidth: '180px'
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 700, color: '#718096', textTransform: 'uppercase' }}>
                    Código Correlativo
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#800000', margin: '2px 0' }}>
                    {data.numero_correlativo}
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#4A5568', fontWeight: 600 }}>
                    GESTIÓN: <strong>{data.gestion}</strong> &bull; ESTADO: <strong style={{ color: data.estado === 'CONCLUIDO' ? '#2F855A' : '#2B6CB0' }}>{data.estado}</strong>
                  </div>
                </div>
              </div>

              {/* 1. Datos de Radicatoria y Remitente */}
              <div style={{
                backgroundColor: '#1B365D',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 8px',
                marginBottom: '6px',
                borderLeft: '4px solid #800000'
              }}>
                1. Datos de Radicatoria y Remitente
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', width: '22%', fontSize: '9.5px', color: '#2D3748' }}>Tipo de Proceso / Asunto:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px', width: '28%' }}>
                      <strong>{data.tipo_proceso_nombre || data.tipo_proceso_codigo}</strong>
                    </td>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', width: '22%', fontSize: '9.5px', color: '#2D3748' }}>Fecha y Hora Ingreso:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px', width: '28%' }}>
                      {data.fecha_creacion ? new Date(data.fecha_creacion).toLocaleString() : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Procedencia / Categoría:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                      {data.tipo_categoria || 'GENERAL'} &bull; {data.tipo_corres || 'EXTERNA'}
                    </td>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Prioridad / Fojas:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                      <span style={{ 
                        fontWeight: 700, 
                        color: data.prioridad === 'URGENTE' ? '#C53030' : '#2D3748',
                        marginRight: '6px'
                      }}>
                        {data.prioridad || 'NORMAL'}
                      </span>
                      &bull; {data.nro_hojas || 1} foja(s), {data.nro_anexos || 0} anexo(s)
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Remitente Oficial:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                      <strong>{data.remitente}</strong>
                      {data.institucion_remitente && <span style={{ color: '#4A5568' }}> ({data.institucion_remitente})</span>}
                    </td>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>CITE Externo:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                      {data.cite_externo || 'S/C'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Referencia / Objeto:</th>
                    <td colSpan="3" style={{ border: '1px solid #CBD5E0', padding: '5px 6px', fontSize: '10.5px' }}>
                      <strong>{data.referencia}</strong>
                    </td>
                  </tr>
                  {data.instruccion && (
                    <tr>
                      <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Instrucción Inicial:</th>
                      <td colSpan="3" style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                        {data.instruccion}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 2. Asignación y Destino Inicial */}
              <div style={{
                backgroundColor: '#1B365D',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 8px',
                marginBottom: '6px',
                borderLeft: '4px solid #800000'
              }}>
                2. Asignación y Destino Inicial
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                <tbody>
                  <tr>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', width: '22%', fontSize: '9.5px', color: '#2D3748' }}>Primer Destinatario:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px', width: '28%' }}>
                      <strong>{data.destinatario_nombre || 'No asignado'}</strong>
                    </td>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', width: '22%', fontSize: '9.5px', color: '#2D3748' }}>Cargo y Unidad:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px', width: '28%' }}>
                      {data.destinatario_cargo || '-'} &bull; {data.destinatario_unidad || '-'}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Ingresado por:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                      {data.creado_por_usuario || 'Ventanilla'} ({data.unidad_origen || 'Ventanilla Única'})
                    </td>
                    <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Plazo Límite:</th>
                    <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                      {data.fecha_limite_respuesta ? new Date(data.fecha_limite_respuesta).toLocaleDateString() : 'Según reglamento'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 3. Resoluciones del Pleno y Despacho Final (si existen) */}
              {(data.sesion_pleno_nro || data.firma_presidencia || data.firma_secretaria || data.despacho_final_cite) && (
                <>
                  <div style={{
                    backgroundColor: '#1B365D',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '4px 8px',
                    marginBottom: '6px',
                    borderLeft: '4px solid #800000'
                  }}>
                    3. Actuaciones del Pleno y Despacho Final
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px' }}>
                    <tbody>
                      <tr>
                        <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', width: '22%', fontSize: '9.5px', color: '#2D3748' }}>Sesión de Pleno:</th>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px', width: '28%' }}>
                          {data.sesion_pleno_nro || '-'} &bull; Res: <strong>{data.sesion_pleno_resultado || '-'}</strong>
                        </td>
                        <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', width: '22%', fontSize: '9.5px', color: '#2D3748' }}>Firmas Directivas:</th>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px', width: '28%' }}>
                          Presidencia: {data.firma_presidencia ? '✅ Firmado' : 'Pendiente'} | Secretaría: {data.firma_secretaria ? '✅ Firmado' : 'Pendiente'}
                        </td>
                      </tr>
                      {data.despacho_final_cite && (
                        <tr>
                          <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Despacho Final:</th>
                          <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                            CITE: <strong>{data.despacho_final_cite}</strong>
                          </td>
                          <th style={{ backgroundColor: '#EDF2F7', border: '1px solid #CBD5E0', padding: '4px 6px', textAlign: 'left', fontSize: '9.5px', color: '#2D3748' }}>Destinatario Final:</th>
                          <td style={{ border: '1px solid #CBD5E0', padding: '4px 6px', fontSize: '10px' }}>
                            {data.despacho_final_destinatario || '-'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </>
              )}

              {/* 4. Cadena de Custodia y Movimientos Registrados */}
              <div style={{
                backgroundColor: '#1B365D',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 8px',
                marginBottom: '6px',
                borderLeft: '4px solid #800000'
              }}>
                4. Cadena de Custodia y Movimientos Registrados en Sistema
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#800000', color: 'white', fontSize: '9px', textAlign: 'center' }}>
                    <th style={{ border: '1px solid #4A5568', padding: '5px 4px', width: '25px' }}>N°</th>
                    <th style={{ border: '1px solid #4A5568', padding: '5px 4px', width: '95px' }}>Fecha / Hora</th>
                    <th style={{ border: '1px solid #4A5568', padding: '5px 4px', width: '135px' }}>De (Remitente)</th>
                    <th style={{ border: '1px solid #4A5568', padding: '5px 4px', width: '135px' }}>A (Destinatario)</th>
                    <th style={{ border: '1px solid #4A5568', padding: '5px 4px' }}>Proveído / Instrucción / Instrumento</th>
                    <th style={{ border: '1px solid #4A5568', padding: '5px 4px', width: '85px' }}>Firma / Sello</th>
                  </tr>
                </thead>
                <tbody>
                  {(!data.historial || data.historial.length === 0) ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '10px', color: '#718096', border: '1px solid #CBD5E0' }}>
                        Sin movimientos registrados.
                      </td>
                    </tr>
                  ) : (
                    data.historial.map((mov, idx) => (
                      <tr key={mov.id || idx} style={{ backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#F7FAFC' }}>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                          {mov.orden || idx + 1}
                        </td>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px', fontSize: '8.5px' }}>
                          <div>Env: {mov.fecha_envio ? new Date(mov.fecha_envio).toLocaleString() : (mov.fecha ? new Date(mov.fecha).toLocaleString() : '-')}</div>
                          {mov.fecha_recepcion ? (
                            <div style={{ color: '#2F855A' }}>Rec: {new Date(mov.fecha_recepcion).toLocaleString()}</div>
                          ) : (
                            <div style={{ color: '#C53030' }}>Sin recepción</div>
                          )}
                        </td>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px', fontSize: '9px' }}>
                          <strong>{mov.usuario_origen_nombre || 'Ventanilla'}</strong>
                          <div style={{ color: '#718096', fontSize: '8px' }}>{mov.unidad_origen || '-'}</div>
                        </td>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px', fontSize: '9px' }}>
                          <strong>{mov.usuario_destino_nombre || '-'}</strong>
                          <div style={{ color: '#718096', fontSize: '8px' }}>{mov.unidad_destino || '-'}</div>
                        </td>
                        <td style={{ border: '1px solid #CBD5E0', padding: '4px', fontSize: '9px' }}>
                          <div>
                            <span style={{ fontWeight: 700, color: '#1B365D' }}>[{mov.tipo_movimiento || 'DERIVACIÓN'}]</span>{' '}
                            {mov.proveido || mov.instruccion || '-'}
                          </div>
                          {(mov.instrumentos_generados || mov.instrumento_generado) && (
                            <div style={{ color: '#800000', fontWeight: 600, fontSize: '8.5px', marginTop: '2px' }}>
                              Doc: {mov.instrumentos_generados || mov.instrumento_generado}
                            </div>
                          )}
                        </td>
                        <td style={{ border: '1px solid #CBD5E0', padding: '3px' }}>
                          <div style={{
                            height: '42px',
                            border: '1px dashed #CBD5E0',
                            textAlign: 'center',
                            color: '#A0AEC0',
                            fontSize: '8px',
                            display: 'flex',
                            alignItems: 'flex-end',
                            justifyContent: 'center',
                            paddingBottom: '2px'
                          }}>
                            Sello y Firma
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* 5. Diligencias Físicas Complementarias (Continuación en Papel) */}
              <div style={{
                backgroundColor: '#1B365D',
                color: 'white',
                fontSize: '10px',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '4px 8px',
                marginBottom: '6px',
                borderLeft: '4px solid #800000'
              }}>
                5. Diligencias y Proveídos Físicos Siguientes (Continuación en Papel)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                {[1, 2].map((num) => (
                  <div key={num} style={{ border: '1px solid #CBD5E0', padding: '6px 8px', fontSize: '9px', backgroundColor: '#FFFFFF' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontWeight: 'bold', color: '#1B365D' }}>
                      <span>ACTUACIÓN FÍSICA N° _____</span>
                      <span>Fecha: ___/___/2026 Hora: ___:___</span>
                    </div>
                    <div style={{ marginBottom: '3px' }}>DE: ___________________________ UNIDAD: __________________</div>
                    <div style={{ marginBottom: '3px' }}>A: ____________________________ UNIDAD: __________________</div>
                    <div style={{ marginBottom: '4px' }}>PROVEÍDO / INSTRUCCIÓN: _____________________________________</div>
                    <div style={{ borderBottom: '1px dotted #CBD5E0', height: '14px', marginBottom: '4px' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '8px', color: '#718096' }}>
                      <span>Fojas remitidas: _____</span>
                      <span style={{ border: '1px dashed #A0AEC0', padding: '2px 10px' }}>Sello y Firma Receptor</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pie de página oficial */}
              <div style={{
                borderTop: '1px solid #CBD5E0',
                paddingTop: '8px',
                marginTop: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                color: '#718096',
                fontSize: '8.5px'
              }}>
                <div>
                  Documento Oficial emitido por el Sistema de Gestión Documental y Trámites &bull; Concejo Municipal de Sucre
                </div>
                <div>
                  Impresión: {new Date().toLocaleString()} &bull; Validez oficial institucional
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer del Modal (no imprimible) */}
        <div className="modal-footer no-print" style={{
          padding: '0.75rem 1.25rem',
          backgroundColor: '#F8F9FA',
          borderTop: '1px solid #E2E8F0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#6C757D' }}>
            Formato normalizado de Hoja de Ruta para soporte digital y archivo físico.
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary btn-sm"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={loading || !data}
              className="btn btn-primary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={15} />
              <span>Imprimir Hoja de Ruta</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
