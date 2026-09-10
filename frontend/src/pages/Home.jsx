import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Inbox, 
  ArrowRight, 
  Lock, 
  Building2, 
  Layers, 
  Landmark, 
  Clock, 
  MapPin, 
  CheckCircle2, 
  HelpCircle,
  Shield,
  Users,
  FileCheck,
  Send,
  Sliders,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const { isAuthenticated, user, activeRole } = useAuth();

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
            <Link to="/login" className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <Lock size={16} />
              <span>Iniciar Sesión / Ingresar</span>
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
        </div>
      </div>

      {/* Módulos Funcionales según Rol o Estado de Autenticación */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h2 style={{ fontSize: '1.35rem', color: '#1B365D', margin: 0 }}>
              {isAuthenticated ? 'Mis Módulos y Servicios Asignados' : 'Módulos y Servicios Institucionales'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: '0.25rem', marginBottom: '1.25rem' }}>
              {isAuthenticated 
                ? `Herramientas habilitadas para su perfil funcional (${activeRole?.rol_nombre}) en ${activeRole?.ubicacion_nombre || 'Oficina Asignada'}.`
                : 'Acceso regulado para la tramitación, derivación y despacho según el rol del servidor público.'}
            </p>
          </div>

          {isAuthenticated && user?.roles?.length > 1 && (
            <span style={{ fontSize: '0.8rem', color: '#800000', background: 'var(--color-primary-sucre-light)', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--color-primary-sucre-border)' }}>
              Tiene múltiples roles asignados. Puede conmutar desde su perfil superior.
            </span>
          )}
        </div>

        {/* CASO 1: USUARIO NO AUTENTICADO */}
        {!isAuthenticated && (
          <div className="card" style={{ padding: '2.5rem', textAlign: 'center', background: '#FFFFFF', borderTop: '4px solid #800000' }}>
            <div style={{ 
              width: '56px', 
              height: '56px', 
              borderRadius: '50%', 
              background: 'var(--color-primary-sucre-light)', 
              display: 'inline-flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: '#800000',
              marginBottom: '1rem'
            }}>
              <Shield size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Acceso Institucional Restringido
            </h3>
            <p style={{ color: '#6C757D', maxWidth: '620px', margin: '0 auto 1.5rem', fontSize: '0.95rem', lineHeight: '1.5' }}>
              Para acceder a las bandejas de correspondencia, radicar nuevos trámites o realizar tareas administrativas, 
              debe iniciar sesión con su identificador de usuario y clave de acceso institucional.
            </p>
            <Link to="/login" className="btn btn-primary" style={{ padding: '10px 24px' }}>
              <Lock size={16} />
              <span>Iniciar Sesión en Wayka</span>
            </Link>
          </div>
        )}

        {/* CASO 2: ROL FUNCIONARIO */}
        {isAuthenticated && activeRole?.rol_codigo === 'FUNCIONARIO' && (
          <div className="grid-3">
            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-azul">BANDEJA DE ENTRADA</span>
                <span className="badge badge-vigente">ACTIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Trámites Pendientes y Recibidos
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Recepción oficial de expedientes radicados a su despacho. Confirmación de recepción física y control de plazos de respuesta.
              </p>
              <div className="norm-card-footer">
                <Link to="/escritorio" className="btn btn-primary btn-sm">
                  <span>Abrir Bandeja</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">ATENCIÓN Y ACTUACIÓN</span>
                <span className="badge badge-vigente">ACTIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Proveídos y Adjuntos Digitales
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Registro de proveídos de atención, observaciones técnicas y carga de informes periciales o resoluciones en formato PDF.
              </p>
              <div className="norm-card-footer">
                <Link to="/escritorio" className="btn btn-primary btn-sm">
                  <span>Gestionar Proveídos</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-azul">DESPACHO Y SALIDA</span>
                <span className="badge badge-vigente">ACTIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Derivación Libre a Unidades
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Avanzar el trámite hacia cualquier funcionario o dependencia municipal con trazabilidad histórica estricta e inmutable.
              </p>
              <div className="norm-card-footer">
                <Link to="/escritorio" className="btn btn-primary btn-sm">
                  <span>Ver Despachados</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CASO 3: ROL VENTANILLA ÚNICA */}
        {isAuthenticated && activeRole?.rol_codigo === 'VENTANILLA_UNICA' && (
          <div className="grid-3">
            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">RADICACIÓN DE TRÁMITES</span>
                <span className="badge badge-vigente">ACTIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Recepción e Inicio de Trámites
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Recepción oficial de cartas externas, memoriales y notas. Generación automática de Hoja de Ruta con correlativo secuencial único.
              </p>
              <div className="norm-card-footer">
                <Link to="/ventanilla" className="btn btn-primary btn-sm">
                  <span>Radicar Documento</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-azul">CONTROL DOCUMENTAL</span>
                <span className="badge badge-vigente">ACTIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Fojas, Anexos y Digitalización
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Registro exacto de fojas físicas, anexos adjuntos y vinculación de archivos digitales en custodia del servidor municipal.
              </p>
              <div className="norm-card-footer">
                <Link to="/ventanilla" className="btn btn-primary btn-sm">
                  <span>Ver Expedientes</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">DESPACHO CENTRAL</span>
                <span className="badge badge-vigente">ACTIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Escritorio Virtual de Despacho
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Bandejas de correspondencia de Ventanilla Única, retrocesos justificados y bloqueo preventivo de expedientes en observación.
              </p>
              <div className="norm-card-footer">
                <Link to="/escritorio" className="btn btn-primary btn-sm">
                  <span>Ir a Bandeja</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CASO 4: ROL ADMINISTRADOR DE SISTEMA */}
        {isAuthenticated && activeRole?.rol_codigo === 'ADMIN_SISTEMA' && (
          <div className="grid-3">
            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">SEGURIDAD Y ACCESOS</span>
                <span className="badge badge-vigente">CONTROL TOTAL</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Gestión de Personas y Usuarios
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Administración del padrón base de personas, cuentas de usuario, reseteo de PIN y asignaciones multi-rol con vigencia.
              </p>
              <div className="norm-card-footer">
                <Link to="/admin" className="btn btn-primary btn-sm">
                  <span>Administrar Usuarios</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-azul">ESTRUCTURA MUNICIPAL</span>
                <span className="badge badge-vigente">CONTROL TOTAL</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Organigrama y Dependencias
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Mantenimiento de la jerarquía de secretarías, direcciones y unidades orgánicas del GAMS con cálculo automático de niveles.
              </p>
              <div className="norm-card-footer">
                <Link to="/admin" className="btn btn-primary btn-sm">
                  <span>Configurar Organigrama</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">PARÁMETROS GLOBALES</span>
                <span className="badge badge-vigente">CONTROL TOTAL</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Configuración del Sistema
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Control de gestión activa, política de longitud de contraseñas, plantilla de correlativos y límites de almacenamiento.
              </p>
              <div className="norm-card-footer">
                <Link to="/admin" className="btn btn-primary btn-sm">
                  <span>Ajustes Globales</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* CASO 5: ROL ADMINISTRADOR DE WAYKA */}
        {isAuthenticated && activeRole?.rol_codigo === 'ADMIN_WAYKA' && (
          <div className="grid-3">
            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">WORKFLOW INSTITUCIONAL</span>
                <span className="badge badge-vigente">OPERATIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Catálogo de Tipos de Proceso
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Configuración de trámites internos y correspondencias, tiempos estimados de atención (SLA) y prefijos de correlación.
              </p>
              <div className="norm-card-footer">
                <Link to="/admin" className="btn btn-primary btn-sm">
                  <span>Gestionar Procesos</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-azul">FISCALIZACIÓN Y AUDITORÍA</span>
                <span className="badge badge-vigente">OPERATIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Supervisión y Redirección
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Redireccionamiento de trámites entre funcionarios en caso de conflicto, anulación motivada y reapertura de trámites concluidos.
              </p>
              <div className="norm-card-footer">
                <Link to="/admin" className="btn btn-primary btn-sm">
                  <span>Supervisar Flujo</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            <div className="norm-card">
              <div className="norm-card-header">
                <span className="badge badge-sucre">RADICACIÓN CENTRAL</span>
                <span className="badge badge-vigente">OPERATIVO</span>
              </div>
              <h3 style={{ fontSize: '1.15rem', color: '#1B365D', marginBottom: '0.5rem' }}>
                Supervisión de Ventanilla Única
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '65px' }}>
                Monitoreo del ingreso de correspondencia externa y control de correlativos por gestión en Ventanilla Única.
              </p>
              <div className="norm-card-footer">
                <Link to="/ventanilla" className="btn btn-primary btn-sm">
                  <span>Ver Ventanilla</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        )}
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
