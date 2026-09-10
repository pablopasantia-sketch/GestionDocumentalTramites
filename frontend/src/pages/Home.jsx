import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  FileText, 
  Inbox, 
  ArrowRight, 
  Lock, 
  Search,
  Building2,
  Calendar,
  Layers,
  Landmark,
  Clock,
  MapPin,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated, user, activeRole } = useAuth();
  const [searchCode, setSearchCode] = useState('');
  const [searchYear, setSearchYear] = useState('2026');
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchCode.trim()) return;

    setSearching(true);
    // Simulación de consulta pública de trazabilidad de trámite
    setTimeout(() => {
      setSearchResult({
        codigo: searchCode.trim().toUpperCase(),
        gestion: searchYear,
        estado: 'EN_ATENCION',
        estadoNombre: 'En Atención',
        fechaIngreso: '08/09/2026 09:30',
        unidadActual: 'Dirección de Tecnologías de Información y Sistemas (UTIC)',
        remitente: 'Secretaría de Obras Públicas',
        referencia: 'Solicitud de informe técnico y peritaje informático'
      });
      setSearching(false);
    }, 450);
  };

  return (
    <div>
      {/* Banner Principal / Hero Institucional */}
      <div className="section-banner" style={{ padding: '2.5rem', marginBottom: '2.5rem' }}>
        <div className="section-tag" style={{ background: '#1B365D', color: '#FFFFFF' }}>
          GOBIERNO AUTÓNOMO MUNICIPAL DE SUCRE
        </div>
        <h1 style={{ marginBottom: '0.75rem', fontSize: '2.2rem', color: '#1B365D' }}>
          Sistema Wayka — Gestión Documental y Workflow
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '850px', fontSize: '1.05rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
          Plataforma oficial del Municipio de Sucre para la radicación, despacho, seguimiento transparente 
          y custodia digital de trámites, expedientes y correspondencias institucionales.
        </p>

        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {!isAuthenticated ? (
            <Link to="/login" className="btn btn-primary" style={{ padding: '10px 22px' }}>
              <Lock size={16} />
              <span>Ingresar al Sistema</span>
            </Link>
          ) : (
            <>
              {activeRole?.rol_codigo === 'VENTANILLA_UNICA' && (
                <Link to="/ventanilla" className="btn btn-primary" style={{ padding: '10px 22px' }}>
                  <Inbox size={16} />
                  <span>Ir a Ventanilla Única</span>
                </Link>
              )}

              {(activeRole?.rol_codigo === 'FUNCIONARIO' || !['VENTANILLA_UNICA', 'ADMIN_SISTEMA', 'ADMIN_WAYKA'].includes(activeRole?.rol_codigo)) && (
                <Link to="/escritorio" className="btn btn-primary" style={{ padding: '10px 22px' }}>
                  <Layers size={16} />
                  <span>Ir a mi Escritorio Virtual</span>
                </Link>
              )}

              {(activeRole?.rol_codigo === 'ADMIN_SISTEMA' || activeRole?.rol_codigo === 'ADMIN_WAYKA') && (
                <Link to="/admin" className="btn btn-primary" style={{ padding: '10px 22px' }}>
                  <Building2 size={16} />
                  <span>Panel de Administración</span>
                </Link>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'var(--color-status-vigente-bg)', borderRadius: '4px', border: '1px solid var(--color-status-vigente-border)', fontSize: '0.88rem', color: '#1E7E34' }}>
                <CheckCircle2 size={16} />
                <span>Sesión activa: <strong>{user?.nombres} ({activeRole?.rol_nombre})</strong></span>
              </div>
            </>
          )}

          <a href="#consulta-tramite" className="btn btn-secondary" style={{ padding: '10px 20px' }}>
            <Search size={16} />
            <span>Consultar Hoja de Ruta</span>
          </a>
        </div>
      </div>

      {/* Módulo de Consulta Pública de Trámites (Búsqueda por Hoja de Ruta) */}
      <div id="consulta-tramite" className="card" style={{ marginBottom: '2.5rem', borderLeft: '4px solid #800000' }}>
        <div className="card-header" style={{ background: '#FAFBFD' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#1B365D', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Search size={20} color="#800000" />
              <span>Consulta y Seguimiento de Trámites</span>
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
              Verifique en tiempo real la ubicación, estado y funcionario responsable de su expediente municipal.
            </span>
          </div>
        </div>

        <div style={{ padding: '1.5rem' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: '1 1 280px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1B365D', marginBottom: '0.35rem' }}>
                Número de Trámite o Hoja de Ruta:
              </label>
              <input 
                type="text" 
                placeholder="Ejemplo: HR-0012/2026 o SV-0005/2026"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.95rem'
                }}
              />
            </div>

            <div style={{ width: '130px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1B365D', marginBottom: '0.35rem' }}>
                Gestión:
              </label>
              <select 
                value={searchYear}
                onChange={(e) => setSearchYear(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '4px',
                  border: '1px solid var(--color-border)',
                  fontSize: '0.95rem',
                  background: '#FFFFFF'
                }}
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
              </select>
            </div>

            <div>
              <button 
                type="submit" 
                className="btn btn-sucre"
                disabled={searching || !searchCode.trim()}
                style={{ height: '42px', padding: '0 24px' }}
              >
                {searching ? (
                  <span>Buscando...</span>
                ) : (
                  <>
                    <Search size={16} />
                    <span>Buscar Trámite</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Resultado de Consulta Simulado */}
          {searchResult && (
            <div style={{ marginTop: '1.5rem', padding: '1.25rem', background: '#F8FAFC', borderRadius: '6px', border: '1px solid #E2E8F0', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span className="badge badge-sucre" style={{ fontSize: '0.85rem' }}>
                    {searchResult.codigo}
                  </span>
                  <span className="badge badge-modificada">
                    {searchResult.estadoNombre}
                  </span>
                </div>
                <span style={{ fontSize: '0.8rem', color: '#6C757D' }}>
                  Fecha de Ingreso: {searchResult.fechaIngreso}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', fontSize: '0.88rem' }}>
                <div>
                  <span style={{ color: '#6C757D', display: 'block', fontSize: '0.78rem' }}>UBICACIÓN ACTUAL:</span>
                  <strong style={{ color: '#1B365D' }}>{searchResult.unidadActual}</strong>
                </div>
                <div>
                  <span style={{ color: '#6C757D', display: 'block', fontSize: '0.78rem' }}>REMITENTE:</span>
                  <strong style={{ color: '#212529' }}>{searchResult.remitente}</strong>
                </div>
                <div>
                  <span style={{ color: '#6C757D', display: 'block', fontSize: '0.78rem' }}>REFERENCIA:</span>
                  <span style={{ color: '#495057' }}>{searchResult.referencia}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Servicios y Módulos Institucionales (UI Components 3.2) */}
      <div style={{ marginBottom: '3rem' }}>
        <h2 style={{ fontSize: '1.35rem', color: '#1B365D', marginBottom: '0.35rem' }}>
          Servicios y Módulos Institucionales
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem' }}>
          Acceso a los componentes de workflow y administración según el nivel de autorización funcional.
        </p>

        <div className="grid-3">
          {/* Tarjeta 1: Ventanilla Única */}
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-sucre">RADICACIÓN OFICIAL</span>
              <span className="badge badge-vigente">HABILITADO</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Ventanilla Única de Correspondencia
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
              Ingreso centralizado de correspondencia externa y trámites internos, asignación de código correlativo único y digitalización de anexos.
            </p>
            <div className="norm-card-footer">
              <Link to="/ventanilla" className="btn btn-primary btn-sm">
                <span>Acceder a Ventanilla</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Tarjeta 2: Escritorio Virtual */}
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-azul">FLUJO Y DESPACHO</span>
              <span className="badge badge-vigente">HABILITADO</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Escritorio Virtual de Trabajo
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
              Bandejas de correspondencia pendiente, recibida y despachada. Registro de proveídos, adjuntos PDF y derivación libre a destinatarios.
            </p>
            <div className="norm-card-footer">
              <Link to="/escritorio" className="btn btn-primary btn-sm">
                <span>Acceder a Bandejas</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Tarjeta 3: Administración y Estructura */}
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-sucre">ADMINISTRACIÓN</span>
              <span className="badge badge-vigente">HABILITADO</span>
            </div>
            <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Organigrama y Seguridad RBAC
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
              Estructura jerárquica municipal, catálogo de dependencias, administración de usuarios, asignación multi-rol y auditoría de accesos.
            </p>
            <div className="norm-card-footer">
              <Link to="/admin" className="btn btn-primary btn-sm">
                <span>Gestión de Sistema</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Información Institucional y Canales de Atención */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-header" style={{ background: '#F8F9FA' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#800000', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Landmark size={18} color="#800000" />
              <span>Canales Oficiales y Atención Municipal</span>
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
              Información de contacto institucional del Gobierno Autónomo Municipal de Sucre.
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
                Sucre, Capital Constitucional de Bolivia
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'rgba(27, 54, 93, 0.08)', borderRadius: '6px', color: '#1B365D' }}>
              <Clock size={22} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                Horario de Atención Oficial
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0 }}>
                Lunes a Viernes: 08:00 a 12:00 y 14:00 a 18:00<br />
                Recepción continua de correspondencia institucional
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <div style={{ padding: '10px', background: 'var(--color-status-vigente-bg)', borderRadius: '6px', color: '#1E7E34' }}>
              <HelpCircle size={22} />
            </div>
            <div>
              <strong style={{ color: '#1B365D', fontSize: '0.95rem', display: 'block', marginBottom: '0.2rem' }}>
                Soporte y Asistencia Técnica
              </strong>
              <p style={{ fontSize: '0.85rem', color: '#6C757D', margin: 0 }}>
                Dirección de Tecnologías de Información (UTIC)<br />
                Mesa de Ayuda interna para funcionarios municipales
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
