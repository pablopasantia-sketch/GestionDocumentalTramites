import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Layers, 
  Activity, 
  ShieldCheck, 
  FileText, 
  Inbox, 
  ArrowRight, 
  Server, 
  Database, 
  Cpu, 
  CheckCircle, 
  Lock, 
  Sparkles,
  GitBranch,
  Search
} from 'lucide-react';
import { healthService } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Home() {
  const [health, setHealth] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const { isAuthenticated, user, activeRole } = useAuth();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const data = await healthService.getHealth();
        setHealth(data);
      } catch (err) {
        setHealth({ success: false, message: 'Backend no accesible' });
      } finally {
        setLoadingHealth(false);
      }
    };

    checkStatus();
  }, []);

  return (
    <div>
      {/* Hero Section */}
      <section className="hero">
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(59, 130, 246, 0.12)', border: '1px solid rgba(59, 130, 246, 0.3)', padding: '0.35rem 1rem', borderRadius: '999px', marginBottom: '1.25rem' }}>
          <Sparkles size={16} color="#60a5fa" />
          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#93c5fd' }}>
            Sprint 1 — Entorno Fullstack & Base de Datos MySQL 8.0
          </span>
        </div>

        <h1 className="hero-title">
          Gestión de Trámites y <br />
          <span className="hero-highlight">Workflow Institucional</span>
        </h1>

        <p className="hero-subtitle">
          Wayka digitaliza, coordina y audita los flujos de correspondencia y trámites en tiempo real, 
          con trazabilidad inmutable y derivación libre por roles.
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/status" className="btn btn-primary btn-lg">
            <Activity size={20} />
            <span>Verificar Estado del Sistema</span>
          </Link>
          
          {!isAuthenticated ? (
            <Link to="/login" className="btn btn-secondary btn-lg">
              <Lock size={18} />
              <span>Acceder al Sistema</span>
            </Link>
          ) : (
            <Link to="/status" className="btn btn-secondary btn-lg">
              <ShieldCheck size={18} />
              <span>Panel de {activeRole?.rol_nombre}</span>
            </Link>
          )}
        </div>
      </section>

      {/* Realtime Status Widget */}
      <div style={{ marginBottom: '3rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.8) 100%)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
          <div className="card-header" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Cpu size={22} color="#38bdf8" />
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Monitoreo de Infraestructura Activa</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Diagnóstico de comunicación Frontend ↔ Backend ↔ MySQL 8.0</p>
              </div>
            </div>
            <Link to="/status" className="btn btn-secondary btn-sm">
              <span>Diagnóstico Completo</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid-3" style={{ marginTop: '1.25rem' }}>
            {/* Frontend Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Frontend SPA</span>
                <span className="badge badge-success">
                  <span className="status-dot online"></span> Operativo
                </span>
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#67e8f9' }}>React 19 + Vite</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Vanilla CSS Design System</div>
            </div>

            {/* Backend Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Backend REST</span>
                {loadingHealth ? (
                  <span className="badge badge-info">Verificando...</span>
                ) : health?.success ? (
                  <span className="badge badge-success">
                    <span className="status-dot online"></span> Conectado
                  </span>
                ) : (
                  <span className="badge badge-danger">
                    <span className="status-dot offline"></span> Desconectado
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#60a5fa' }}>Node.js + Express</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Puerto: 4000 (CORS habilitado)</div>
            </div>

            {/* Database Card */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-secondary)' }}>Base de Datos</span>
                {loadingHealth ? (
                  <span className="badge badge-info">Consultando...</span>
                ) : health?.data?.database?.connected ? (
                  <span className="badge badge-success">
                    <span className="status-dot online"></span> MySQL 8.0 Activo
                  </span>
                ) : (
                  <span className="badge badge-warning">
                    <span className="status-dot warning"></span> Driver Configurado
                  </span>
                )}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fcd34d' }}>MySQL Server 8.0+</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Pool: 10 conexiones | UTF-8 MB4</div>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Principales del Sistema */}
      <div style={{ marginBottom: '3.5rem' }}>
        <h2 style={{ fontSize: '1.6rem', marginBottom: '0.5rem' }}>Módulos del Sistema Wayka</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem' }}>
          Estructura modular de trámites, roles y workflow contemplada en el análisis funcional.
        </p>

        <div className="grid-4">
          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(59, 130, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#60a5fa', marginBottom: '1rem' }}>
              <Inbox size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Ventanilla Única</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Recepción y creación de trámites/correspondencias, correlativos automáticos e impresión de Hoja de Ruta.
            </p>
            <span className="badge badge-info">Rol Ventanilla Única</span>
          </div>

          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(16, 185, 129, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#34d399', marginBottom: '1rem' }}>
              <FileText size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Escritorio Virtual</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Bandejas de pendientes, recibidos y despachados. Atención de trámites, proveídos y adjuntos PDF.
            </p>
            <span className="badge badge-success">Rol Funcionario</span>
          </div>

          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(139, 92, 246, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a78bfa', marginBottom: '1rem' }}>
              <GitBranch size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Workflow Unificado</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Derivación libre a destinatarios, retroceso justificado y trazabilidad histórica inmutable.
            </p>
            <span className="badge badge-info">Motor Directo</span>
          </div>

          <div className="card">
            <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171', marginBottom: '1rem' }}>
              <ShieldCheck size={22} />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Administración</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '1rem' }}>
              Gestión de usuarios, personas, roles, organigrama institucional, anulación y redirección.
            </p>
            <span className="badge badge-danger">Roles Admin</span>
          </div>
        </div>
      </div>

      {/* Roadmap Sprint 1 */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700' }}>Cronograma de Desarrollo — Sprint 1: Fundación</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Del 01 de Septiembre al 14 de Septiembre</p>
          </div>
          <span className="badge badge-warning">En Ejecución</span>
        </div>

        <div style={{ display: 'grid', gap: '0.85rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-sm)' }}>
            <CheckCircle size={18} color="#10b981" />
            <span style={{ fontWeight: '600', color: '#6ee7b7' }}>
              Tarea 1: Configuración del entorno (React + Backend Node.js) y BD MySQL 8.0
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Tarea 2: Modelo de datos y migraciones (Flujo unificado)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Tarea 3: Autenticación JWT (login, logout, cambio de clave, expiración de roles)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Tarea 4: CRUD Personas, Usuarios, Roles y Usuario-Rol
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)' }}>
            <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: '2px solid var(--text-muted)', display: 'inline-block' }}></span>
            <span style={{ color: 'var(--text-secondary)' }}>
              Tarea 5: CRUD Ubicaciones Orgánicas (Organigrama jerárquico)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
