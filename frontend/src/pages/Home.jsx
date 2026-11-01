import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Search,
  FileText,
  Clock,
  MapPin,
  CheckCircle2,
  HelpCircle,
  Shield,
  Building2,
  Landmark,
  ArrowRight,
  AlertCircle,
  FolderCheck,
  FileCheck,
  Send,
  Lock,
  ChevronRight,
  Users,
  Printer,
  ExternalLink,
  Paperclip,
  Share2,
  Copy,
  Check,
  Calendar,
  Flame,
  Download
} from 'lucide-react';
import { tramitesService } from '../services/api';
import FlujoGraficoTramite from '../components/tramites/FlujoGraficoTramite';
import HojaDeRutaModal from '../components/tramites/HojaDeRutaModal';

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Estado para el buscador público de trámites (RF-09.1)
  const [correlativoSearch, setCorrelativoSearch] = useState('');
  const [gestionSearch, setGestionSearch] = useState(new Date().getFullYear().toString());
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  // Modal Hoja de Ruta Imprimible
  const [hojaModalOpen, setHojaModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Leer parámetros de URL al cargar para búsqueda directa por link o código QR (RF-09.3)
  useEffect(() => {
    const qCorr = searchParams.get('correlativo') || searchParams.get('nro_tramite');
    const qGest = searchParams.get('gestion');
    if (qCorr) {
      setCorrelativoSearch(qCorr);
      const targetGest = qGest || gestionSearch;
      if (qGest) setGestionSearch(qGest);
      executeSearch(qCorr, targetGest);
    }
  }, [searchParams]);

  const executeSearch = async (correlativo, gestion) => {
    if (!correlativo || !correlativo.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await tramitesService.consultaPublica(correlativo.trim(), gestion);
      if (res && res.success && res.data) {
        setSearchResult(res.data);
      } else {
        setSearchError(res?.message || 'No se encontró el trámite especificado.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'No se encontró ningún trámite con los datos proporcionados.';
      setSearchError(msg);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearchTramite = async (e) => {
    e.preventDefault();
    if (!correlativoSearch.trim()) return;

    // Actualizar parámetros de URL para que la búsqueda sea compartible
    setSearchParams({
      correlativo: correlativoSearch.trim(),
      gestion: gestionSearch
    });

    executeSearch(correlativoSearch.trim(), gestionSearch);
  };

  const handleQuickSearch = (corr) => {
    setCorrelativoSearch(corr);
    setGestionSearch('2026');
    setSearchParams({ correlativo: corr, gestion: '2026' });
    executeSearch(corr, '2026');
  };

  const handleCopyShareLink = () => {
    if (!searchResult) return;
    const url = `${window.location.origin}/consulta?correlativo=${encodeURIComponent(searchResult.numero_correlativo)}&gestion=${searchResult.gestion}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    });
  };

  const formatDuracion = (min) => {
    if (!min || min <= 0) return 'Inmediato';
    if (min < 60) return `${min} min`;
    const horas = Math.floor(min / 60);
    const dias = Math.floor(horas / 24);
    if (dias > 0) {
      const restHoras = horas % 24;
      return `${dias}d ${restHoras}h`;
    }
    const restMin = min % 60;
    return `${horas}h ${restMin > 0 ? `${restMin}m` : ''}`;
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div>
      {/* 1. HERO INSTITUCIONAL CIUDADANO */}
      <div
        className="section-banner"
        style={{
          padding: '3rem 2rem',
          marginBottom: '2rem',
          textAlign: 'center',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F6F9 100%)',
          borderBottom: '3px solid #800000'
        }}
      >
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--color-primary-sucre-light)',
          color: '#800000',
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.82rem',
          fontWeight: 700,
          marginBottom: '1rem',
          border: '1px solid var(--color-primary-sucre-border)'
        }}>
          <Landmark size={15} />
          <span>GOBIERNO AUTÓNOMO MUNICIPAL DE SUCRE</span>
        </div>

        <h1 style={{ fontSize: '2.4rem', color: '#1B365D', marginBottom: '0.85rem', fontWeight: 800, lineHeight: 1.2 }}>
          Portal Ciudadano de Trámites y Seguimiento Municipal
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '780px', margin: '0 auto 2rem', fontSize: '1.05rem', lineHeight: 1.6 }}>
          Consulte la ubicación y estado de su Hoja de Ruta en tiempo real, conozca los requisitos para realizar sus trámites y acceda a información transparente de la gestión municipal de Sucre.
        </p>

        {/* 2. BUSCADOR PÚBLICO DE HOJA DE RUTA (RF-09.1) */}
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '1.75rem', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderTop: '4px solid #1B365D', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
              <Search size={20} color="#1B365D" />
              <strong style={{ fontSize: '1.1rem', color: '#1B365D' }}>
                Consulta Pública de Hoja de Ruta
              </strong>
              <span className="badge badge-vigente" style={{ marginLeft: 'auto', fontSize: '11px' }}>
                ACCESO LIBRE / SIN REGISTRO
              </span>
            </div>

            <form onSubmit={handleSearchTramite} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 300px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: '4px' }}>
                  Número de Correlativo / Hoja de Ruta:
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: SV-1/2026 o CM-1/2026"
                  value={correlativoSearch}
                  onChange={(e) => setCorrelativoSearch(e.target.value)}
                  style={{ height: '44px', fontSize: '0.95rem' }}
                  required
                />
              </div>

              <div style={{ width: '130px' }}>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#4A5568', display: 'block', marginBottom: '4px' }}>
                  Gestión:
                </label>
                <select
                  className="form-control"
                  value={gestionSearch}
                  onChange={(e) => setGestionSearch(e.target.value)}
                  style={{ height: '44px', fontSize: '0.95rem' }}
                >
                  <option value="2026">2026</option>
                  <option value="2025">2025</option>
                  <option value="2024">2024</option>
                </select>
              </div>

              <div style={{ alignSelf: 'flex-end', flex: '0 0 auto' }}>
                <button
                  type="submit"
                  disabled={searchLoading}
                  className="btn btn-primary"
                  style={{ height: '44px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <Search size={16} />
                  <span>{searchLoading ? 'Consultando...' : 'Consultar Trámite'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RESULTADO DE LA BÚSQUEDA CIUDADANA */}
        {searchError && (
          <div style={{ maxWidth: '720px', margin: '1.5rem auto 0', textAlign: 'left' }}>
            <div style={{ background: 'var(--color-status-alerta-bg)', border: '1px solid var(--color-status-alerta-border)', borderRadius: '6px', padding: '1rem', color: 'var(--color-status-alerta-text)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>Búsqueda no exitosa:</strong> {searchError}
                <div style={{ fontSize: '0.82rem', marginTop: '4px', color: '#6C757D' }}>
                  Asegúrese de ingresar el correlativo exacto tal como figura en su comprobante oficial emitido por Ventanilla Única.
                </div>
              </div>
            </div>
          </div>
        )}

        {searchResult && (
          <div style={{ maxWidth: '920px', margin: '2rem auto 0', textAlign: 'left' }}>
            <div className="card" style={{ borderLeft: '6px solid #1B365D', padding: '1.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>

              {/* Encabezado Principal y Barra de Acciones Oficiales */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '12px',
                borderBottom: '1px solid #E2E8F0',
                paddingBottom: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span className="badge badge-sucre" style={{ fontSize: '0.75rem' }}>
                      EXPEDIENTE OFICIAL CMS
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 600 }}>
                      Gestión {searchResult.gestion}
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.85rem', color: '#1B365D', margin: 0, fontWeight: 800 }}>
                    {searchResult.numero_correlativo}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ color: '#800000', fontSize: '0.95rem', fontWeight: 700 }}>
                      {searchResult.tipo_proceso}
                    </span>
                    {searchResult.tipo_proceso_codigo && (
                      <span style={{ background: '#F1F5F9', color: '#475569', padding: '2px 6px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {searchResult.tipo_proceso_codigo}
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className={`badge ${searchResult.estado === 'CONCLUIDO' ? 'badge-vigente' :
                        searchResult.estado === 'ANULADO' ? 'badge-alerta' :
                          searchResult.estado === 'BLOQUEADO' ? 'badge-modificada' :
                            searchResult.estado === 'EN_TRANSITO' ? 'badge-azul' : 'badge-modificada'
                      }`} style={{ fontSize: '0.85rem', padding: '5px 12px', fontWeight: 700 }}>
                      {searchResult.estado}
                    </span>
                    <span className={`badge ${searchResult.prioridad === 'URGENTE' ? 'badge-alerta' :
                        searchResult.prioridad === 'ALTA' ? 'badge-azul' : 'badge-sucre'
                      }`} style={{ fontSize: '0.8rem' }}>
                      Prioridad: {searchResult.prioridad}
                    </span>
                  </div>

                  {/* Botones de Acción de Hoja de Ruta */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setHojaModalOpen(true)}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
                      title="Abrir Hoja de Ruta imprimible oficial"
                    >
                      <Printer size={14} />
                      <span>Imprimir Hoja de Ruta</span>
                    </button>

                    <a
                      href={tramitesService.getHojaDeRutaHtmlUrl(searchResult.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px' }}
                      title="Abrir vista HTML imprimible en nueva ventana"
                    >
                      <ExternalLink size={14} />
                      <span>Ver HTML</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyShareLink}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', padding: '6px 10px' }}
                      title="Copiar enlace directo de este trámite"
                    >
                      {copiedLink ? <Check size={14} color="#10B981" /> : <Share2 size={14} />}
                      <span>{copiedLink ? '¡Copiado!' : 'Compartir'}</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Referencia y Remitente */}
              <div style={{
                background: '#F8F9FA',
                padding: '14px 18px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0',
                marginBottom: '1.25rem'
              }}>
                <div style={{ fontSize: '0.8rem', color: '#6C757D', textTransform: 'uppercase', fontWeight: 700, marginBottom: '4px' }}>
                  Referencia / Asunto Oficial Registrado:
                </div>
                <div style={{ color: '#1B365D', fontWeight: 600, fontSize: '1rem', lineHeight: 1.5 }}>
                  "{searchResult.referencia}"
                </div>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid #E2E8F0',
                  fontSize: '0.85rem',
                  color: '#495057',
                  flexWrap: 'wrap'
                }}>
                  <div>
                    Remitente: <strong style={{ color: '#1B365D' }}>{searchResult.remitente}</strong>
                  </div>
                  <span>•</span>
                  <div>
                    Fojas: <strong>{searchResult.nro_hojas}</strong>
                  </div>
                  <span>•</span>
                  <div>
                    Unidad de Origen: <strong>{searchResult.unidad_origen}</strong>
                  </div>
                </div>
              </div>

              {/* Grid de Metadatos de Seguimiento y Ubicación Actual */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem',
                background: '#FFFFFF',
                padding: '14px',
                borderRadius: '6px',
                border: '1px solid #E2E8F0'
              }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#6C757D', fontWeight: 600 }}>📍 Ubicación Física / Digital Actual:</div>
                  <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.95rem', marginTop: '2px' }}>
                    {searchResult.ubicacion_actual}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#4A5568', marginTop: '2px' }}>
                    Asignado a: <strong>{searchResult.usuario_actual_nombre || 'Mesa de Entrada'}</strong>
                    {searchResult.usuario_actual_cargo && ` (${searchResult.usuario_actual_cargo})`}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.78rem', color: '#6C757D', fontWeight: 600 }}>📅 Fecha de Radicación:</div>
                  <div style={{ fontWeight: 700, color: '#1B365D', fontSize: '0.95rem', marginTop: '2px' }}>
                    {new Date(searchResult.fecha_creacion).toLocaleDateString('es-BO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6C757D', marginTop: '2px' }}>
                    Hora: {new Date(searchResult.fecha_creacion).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {searchResult.fecha_limite_respuesta && (
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#6C757D', fontWeight: 600 }}>⏳ Plazo Límite de Atención (SLA):</div>
                    <div style={{ fontWeight: 700, color: '#800000', fontSize: '0.95rem', marginTop: '2px' }}>
                      {new Date(searchResult.fecha_limite_respuesta).toLocaleDateString('es-BO', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6C757D', marginTop: '2px' }}>
                      SLA Estimado: {searchResult.tiempo_estimado_horas || 48} horas reglamentarias
                    </div>
                  </div>
                )}
              </div>

              {/* ======================================================= */}
              {/* GRÁFICA DEL FLUJO INSTITUCIONAL (RF-08.6, RF-09.2) */}
              {/* ======================================================= */}
              <FlujoGraficoTramite tramite={searchResult} />

              {/* ======================================================= */}
              {/* LÍNEA DE TIEMPO HISTÓRICA INMUTABLE (RF-08.5, RF-08.7, RF-08.8, RF-08.9) */}
              {/* ======================================================= */}
              {searchResult.historial && searchResult.historial.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '1rem',
                    borderBottom: '1px solid #E2E8F0',
                    paddingBottom: '0.5rem'
                  }}>
                    <h3 style={{
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: '#1B365D',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      margin: 0
                    }}>
                      Trazabilidad Histórica Inmutable ({searchResult.historial.length} actuaciones registradas):
                    </h3>
                    <span style={{ fontSize: '0.75rem', color: '#6C757D' }}>
                      Cadena de custodia verificada
                    </span>
                  </div>

                  <div style={{ display: 'grid', gap: '10px' }}>
                    {searchResult.historial.map((mov, idx) => (
                      <div
                        key={mov.id || idx}
                        style={{
                          padding: '12px 16px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderLeft: `4px solid ${mov.tipo_movimiento === 'RETROCESO' || mov.justificacion_retroceso ? '#D97706' :
                              mov.instrumento_generado ? '#10B981' : '#1B365D'
                            }`,
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '14px',
                          fontSize: '0.85rem',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                        }}
                      >
                        {/* Círculo con Orden */}
                        <div style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: mov.tipo_movimiento === 'RETROCESO' ? '#D97706' : '#1B365D',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '12px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {mov.orden}
                        </div>

                        <div style={{ flex: 1 }}>
                          {/* Fila Superior: Actividad, Badges y Fechas */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '6px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <strong style={{ color: '#1B365D', fontSize: '0.92rem' }}>
                                {mov.actividad}
                              </strong>

                              {/* Badge de Devolución / Retroceso */}
                              {(mov.tipo_movimiento === 'RETROCESO' || Boolean(mov.justificacion_retroceso)) && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: '#92400E',
                                  backgroundColor: '#FEF3C7',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #FCD34D'
                                }}>
                                  DEVOLUCIÓN OFICIAL
                                </span>
                              )}

                              {/* Badge de Instrumento Legislativo Resultante */}
                              {(mov.instrumento_generado || mov.instrumentos_generados) && (
                                <span style={{
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: '#065F46',
                                  backgroundColor: '#D1FAE5',
                                  padding: '2px 8px',
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
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  color: '#1E40AF',
                                  backgroundColor: '#DBEAFE',
                                  padding: '2px 8px',
                                  borderRadius: '10px',
                                  border: '1px solid #93C5FD'
                                }}>
                                  EN ATENCIÓN HASTA HOY
                                </span>
                              )}
                            </div>

                            {/* Fecha y Tiempo Transcurrido (RF-08.8) */}
                            <div style={{ textAlign: 'right' }}>
                              <span style={{ fontSize: '0.75rem', color: '#6C757D', display: 'block' }}>
                                {new Date(mov.fecha || mov.fecha_envio).toLocaleString('es-BO')}
                              </span>
                              {mov.tiempo_transcurrido_minutos > 0 && (
                                <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 600 }}>
                                  Tiempo de paso: {formatDuracion(mov.tiempo_transcurrido_minutos)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Ruta de Envío: De unidad origen hacia unidad destino */}
                          <div style={{ fontSize: '0.82rem', color: '#4A5568', marginTop: '4px' }}>
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
                              fontSize: '0.8rem',
                              color: '#92400E',
                              marginTop: '6px',
                              background: '#FFFBEB',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              borderLeft: '3px solid #D97706'
                            }}>
                              <strong>Motivo o Justificativo de Devolución:</strong> {mov.justificacion_retroceso}
                            </div>
                          )}

                          {/* Proveído oficial */}
                          {mov.proveido && (
                            <div style={{
                              fontSize: '0.82rem',
                              color: '#800000',
                              marginTop: '6px',
                              background: 'var(--color-primary-sucre-light)',
                              padding: '6px 10px',
                              borderRadius: '4px',
                              borderLeft: '3px solid #800000',
                              lineHeight: 1.4
                            }}>
                              <strong>Proveído:</strong> {mov.proveido}
                              {mov.instruccion && (
                                <div style={{ fontSize: '0.78rem', color: '#4A5568', marginTop: '2px' }}>
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
              {searchResult.adjuntos && searchResult.adjuntos.length > 0 && (
                <div style={{
                  background: '#F8FAFC',
                  borderRadius: '6px',
                  border: '1px solid #E2E8F0',
                  padding: '14px 16px',
                  marginBottom: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Paperclip size={16} color="#1B365D" />
                    <strong style={{ fontSize: '0.9rem', color: '#1B365D' }}>
                      Documentos y Respaldos Adjuntos al Expediente ({searchResult.adjuntos.length})
                    </strong>
                  </div>
                  <div style={{ display: 'grid', gap: '6px' }}>
                    {searchResult.adjuntos.map((adj) => (
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
                          <span style={{ fontSize: '0.75rem', color: '#64748B' }}>({formatBytes(adj.tamano_bytes)})</span>
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
          </div>
        )}
      </div>

      {/* 3. GUÍA CIUDADANA: ¿CÓMO TRAMITAR EN EL MUNICIPIO? */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <span className="section-tag">GUÍA DE ATENCIÓN AL CIUDADANO</span>
          <h2 style={{ fontSize: '1.6rem', color: '#1B365D', margin: '6px 0' }}>
            ¿Cómo realizar y seguir un trámite en el Municipio de Sucre?
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '650px', margin: '0 auto', fontSize: '0.95rem' }}>
            Conozca el ciclo oficial de atención desde la recepción en ventanilla hasta la emisión de la respuesta oficial.
          </p>
        </div>

        <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          {/* Paso 1 */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#800000',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              1
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Presentación de Documentos
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: 1.5 }}>
              Acuda a Ventanilla Única Central (Plaza 25 de Mayo) con su solicitud, memorial o carta y requisitos adjuntos.
            </p>
          </div>

          {/* Paso 2 */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#1B365D',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              2
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Emisión de Hoja de Ruta
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: 1.5 }}>
              El operador radicará su expediente y le entregará su código correlativo único (ej: SV-1/2026) con sello oficial.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#17A2B8',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              3
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Derivación y Trazabilidad
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: 1.5 }}>
              Su expediente viaja digitalmente a las unidades técnicas correspondientes. Cada paso y proveído queda registrado.
            </p>
          </div>

          {/* Paso 4 */}
          <div className="card" style={{ padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: '#28A745',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontWeight: 800,
              fontSize: '1.1rem'
            }}>
              4
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Respuesta y Conclusión
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: 1.5 }}>
              Concluida la evaluación técnica o legal, retire la resolución, respuesta o certificación en la dependencia asignada.
            </p>
          </div>
        </div>
      </div>

      {/* 4. SERVICIOS Y TRÁMITES MUNICIPALES HABITUALES */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', color: '#1B365D', margin: 0 }}>
            Trámites y Servicios Municipales Frecuentes
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.92rem', marginTop: '4px' }}>
            Información de orientación general sobre los principales trámites gestionados a través del Sistema de Gestión Documental y Trámites.
          </p>
        </div>

        <div className="grid-3">
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-sucre">DESARROLLO URBANO</span>
              <span className="badge badge-vigente">VIGENTE</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Catastro y Regularización Urbana
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
              Emisión de certificados catastrales, visado de planos arquitectónicos, licencias de construcción e inspecciones técnicas de inmuebles en el Municipio.
            </p>
            <div className="norm-card-footer">
              <span style={{ fontSize: '0.8rem', color: '#1B365D', fontWeight: 600 }}>
                Dependencia: Dirección de Catastro Urbano
              </span>
            </div>
          </div>

          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-azul">ACTIVIDADES ECONÓMICAS</span>
              <span className="badge badge-vigente">VIGENTE</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Licencias de Funcionamiento
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
              Apertura, renovación y fiscalización de patentes para actividades comerciales, de servicios e industriales en los distintos distritos de la ciudad de Sucre.
            </p>
            <div className="norm-card-footer">
              <span style={{ fontSize: '0.8rem', color: '#1B365D', fontWeight: 600 }}>
                Dependencia: Dirección de Recaudaciones
              </span>
            </div>
          </div>

          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-sucre">DESPACHO INSTITUCIONAL</span>
              <span className="badge badge-vigente">VIGENTE</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Correspondencia y Solicitudes Oficiales
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
              Cartas externas, memoriales y notas dirigidas al Despacho del Alcalde, Secretaría General o Concejo Municipal para atención institucional.
            </p>
            <div className="norm-card-footer">
              <span style={{ fontSize: '0.8rem', color: '#1B365D', fontWeight: 600 }}>
                Dependencia: Ventanilla Única Central
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. PILARES DE TRANSPARENCIA Y CERO BUROCRACIA */}
      <div className="card" style={{ padding: '2rem', marginBottom: '2.5rem', background: '#F8F9FA', borderTop: '4px solid #800000' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: '#1B365D', marginBottom: '0.3rem' }}>
            Compromiso Institucional por un Trámite Ágil y Transparente
          </h3>
          <p style={{ color: '#6C757D', fontSize: '0.9rem', maxWidth: '600px', margin: '0 auto' }}>
            El Sistema de Gestión Documental garantiza la custodia, inmutabilidad y control de tiempos en cada actuación municipal.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'var(--color-primary-sucre-light)', borderRadius: '6px', color: '#800000' }}>
              <Shield size={24} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                Historial Inmutable y Auditable
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0, lineHeight: 1.4 }}>
                Cada derivación, fecha y proveído queda registrado en una bitácora protegida que no puede ser alterada ni eliminada.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(27, 54, 93, 0.08)', borderRadius: '6px', color: '#1B365D' }}>
              <Clock size={24} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                Control de Tiempos Normados
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0, lineHeight: 1.4 }}>
                Supervisión de plazos máximos por tipo de proceso para erradicar la mora administrativa y las demoras injustificadas.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'var(--color-status-vigente-bg)', borderRadius: '6px', color: '#1E7E34' }}>
              <FolderCheck size={24} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '4px' }}>
                Cero Expedientes Extraviados
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0, lineHeight: 1.4 }}>
                Inventario digital de fojas y anexos con identificación exacta del funcionario y oficina en custodia del documento.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 6. CANALES OFICIALES Y ATENCIÓN MUNICIPAL */}
      <div className="card" style={{ marginBottom: '2.5rem' }}>
        <div className="card-header" style={{ background: '#F8F9FA' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#800000', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Landmark size={18} color="#800000" />
              <span>Canales Oficiales y Atención Municipal</span>
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
              Puntos de atención presencial y horarios del Gobierno Autónomo Municipal de Sucre.
            </span>
          </div>
        </div>

        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'var(--color-primary-sucre-light)', borderRadius: '6px', color: '#800000' }}>
              <MapPin size={22} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                Ventanilla Única Central
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0 }}>
                Plaza 25 de Mayo N° 1, Palacio Consistorial<br />
                Sucre, Capital Constitucional del Estado Plurinacional de Bolivia
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(27, 54, 93, 0.08)', borderRadius: '6px', color: '#1B365D' }}>
              <Clock size={22} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                Horario Continuo de Atención
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0 }}>
                Lunes a Viernes: 08:00 a 12:00 y 14:00 a 18:00<br />
                Recepción continua de solicitudes y correspondencia externa
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'var(--color-status-vigente-bg)', borderRadius: '6px', color: '#1E7E34' }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                Consultas e Informaciones
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0 }}>
                Línea Municipal de Atención al Vecino: (4) 64-51000<br />
                Portal Web Oficial: www.sucre.bo
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7. ACCESO DISCRETO PARA SERVIDORES PÚBLICOS */}
      <div style={{
        textAlign: 'center',
        padding: '1.25rem',
        background: 'rgba(27, 54, 93, 0.04)',
        borderRadius: '6px',
        border: '1px solid #E2E8F0',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <Lock size={15} color="#1B365D" />
          <span style={{ fontSize: '0.88rem', color: '#4A5568' }}>
            ¿Es usted servidor público del Gobierno Autónomo Municipal de Sucre?
          </span>
          <Link to="/login" className="btn btn-secondary btn-sm" style={{ padding: '4px 14px', fontSize: '0.82rem' }}>
            <span>Ingreso de Funcionarios</span>
            <ChevronRight size={13} />
          </Link>
        </div>
      </div>

      {/* Modal Hoja de Ruta Imprimible (RF-08.1, RF-08.4) */}
      <HojaDeRutaModal
        isOpen={hojaModalOpen}
        onClose={() => setHojaModalOpen(false)}
        tramiteId={searchResult?.id}
        initialData={searchResult}
      />
    </div>
  );
}
