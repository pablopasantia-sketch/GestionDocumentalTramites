import React, { useState } from 'react';
import { Link } from 'react-router-dom';
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
  Users
} from 'lucide-react';
import { tramitesService } from '../services/api';

export default function Home() {
  // Estado para el buscador público de trámites (RF-09.1)
  const [correlativoSearch, setCorrelativoSearch] = useState('');
  const [gestionSearch, setGestionSearch] = useState(new Date().getFullYear().toString());
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState(null);

  const handleSearchTramite = async (e) => {
    e.preventDefault();
    if (!correlativoSearch.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const res = await tramitesService.consultaPublica(correlativoSearch.trim(), gestionSearch);
      if (res.success && res.data) {
        setSearchResult(res.data);
      } else {
        setSearchError(res.message || 'No se encontró el trámite especificado.');
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'No se encontró ningún trámite con los datos proporcionados.';
      setSearchError(msg);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleQuickSearch = (corr) => {
    setCorrelativoSearch(corr);
    setGestionSearch('2026');
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

            <div style={{ marginTop: '10px', fontSize: '0.8rem', color: '#6C757D', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Ejemplos para probar:</span>
              <button
                type="button"
                onClick={() => handleQuickSearch('SV-1/2026')}
                style={{ background: 'none', border: 'none', color: '#1B365D', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
              >
                SV-1/2026
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleQuickSearch('CM-1/2026')}
                style={{ background: 'none', border: 'none', color: '#1B365D', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
              >
                CM-1/2026
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => handleQuickSearch('CORR-EXT-1/2026')}
                style={{ background: 'none', border: 'none', color: '#1B365D', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: '0.8rem' }}
              >
                CORR-EXT-1/2026
              </button>
            </div>
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
          <div style={{ maxWidth: '720px', margin: '1.5rem auto 0', textAlign: 'left' }}>
            <div className="card" style={{ borderLeft: '6px solid #28A745', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#6C757D', textTransform: 'uppercase', fontWeight: 600 }}>
                    Hoja de Ruta Localizada
                  </div>
                  <h2 style={{ fontSize: '1.5rem', color: '#1B365D', margin: '2px 0' }}>
                    {searchResult.numero_correlativo}
                  </h2>
                  <div style={{ color: '#800000', fontSize: '0.9rem', fontWeight: 600 }}>
                    {searchResult.tipo_proceso}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <span className={`badge ${searchResult.estado === 'CONCLUIDO' ? 'badge-vigente' :
                      searchResult.estado === 'ANULADO' ? 'badge-alerta' :
                        searchResult.estado === 'EN_TRANSITO' ? 'badge-azul' : 'badge-modificada'
                    }`} style={{ fontSize: '12px' }}>
                    {searchResult.estado}
                  </span>
                  <div style={{ fontSize: '0.78rem', color: '#6C757D', marginTop: '4px' }}>
                    Gestión {searchResult.gestion}
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8F9FA', padding: '12px 16px', borderRadius: '4px', border: '1px solid #E2E8F0', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.82rem', color: '#6C757D', marginBottom: '2px' }}>Referencia / Asunto:</div>
                <div style={{ color: '#212529', fontWeight: 500, fontSize: '0.92rem' }}>
                  "{searchResult.referencia}"
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.82rem', color: '#6C757D' }}>
                  Remitente: <strong>{searchResult.remitente}</strong> | Fojas: {searchResult.nro_hojas}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>Ubicación Actual del Documento:</div>
                  <div style={{ fontWeight: 600, color: '#1B365D', fontSize: '0.9rem' }}>
                    📍 {searchResult.ubicacion_actual}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>Fecha de Radicación:</div>
                  <div style={{ fontWeight: 600, color: '#1B365D', fontSize: '0.9rem' }}>
                    {new Date(searchResult.fecha_creacion).toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Trazabilidad Histórica Ciudadana */}
              {searchResult.historial && searchResult.historial.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1B365D', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Trazabilidad del Trámite ({searchResult.historial.length} actuaciones registradas):
                  </div>
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {searchResult.historial.map((mov, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '10px 14px',
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '12px',
                          fontSize: '0.85rem'
                        }}
                      >
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: '#1B365D',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          flexShrink: 0
                        }}>
                          {mov.orden}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '4px' }}>
                            <strong style={{ color: '#1B365D' }}>{mov.actividad}</strong>
                            <span style={{ fontSize: '0.75rem', color: '#6C757D' }}>
                              {new Date(mov.fecha).toLocaleString('es-BO')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#4A5568', marginTop: '2px' }}>
                            De: <em>{mov.unidad_origen}</em> {mov.unidad_destino ? `➔ Hacia: ${mov.unidad_destino}` : ''}
                          </div>
                          {mov.proveido && (
                            <div style={{ fontSize: '0.8rem', color: '#800000', marginTop: '4px', background: 'var(--color-primary-sucre-light)', padding: '4px 8px', borderRadius: '4px' }}>
                              Proveído: {mov.proveido}
                            </div>
                          )}
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
    </div>
  );
}
