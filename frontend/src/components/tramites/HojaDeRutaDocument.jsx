import React from 'react';
import { Landmark } from 'lucide-react';

/**
 * Documento oficial de Hoja de Ruta. Componente presentacional puro: no
 * contiene botones ni modales, solo el documento que se va a imprimir.
 * El estilo formal blanco y negro se aplica desde index.css.
 */
export default function HojaDeRutaDocument({ data }) {
  if (!data) return null;

  return (
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
          <div className="hoja-ruta-sello" style={{
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
      <div className="hoja-ruta-seccion" style={{
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
      <div className="hoja-ruta-seccion" style={{
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
          <div className="hoja-ruta-seccion" style={{
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
                  Presidencia: {data.firma_presidencia ? 'REGISTRADA' : 'PENDIENTE'} | Secretaría: {data.firma_secretaria ? 'REGISTRADA' : 'PENDIENTE'}
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
      <div className="hoja-ruta-seccion" style={{
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
      <div className="hoja-ruta-seccion" style={{
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
  );
}
