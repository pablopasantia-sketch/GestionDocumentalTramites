import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Activity, 
  ShieldCheck, 
  FileText, 
  Inbox, 
  ArrowRight, 
  Server, 
  Database, 
  CheckCircle, 
  Lock, 
  Search,
  Building2,
  Calendar,
  Layers,
  Landmark
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
      {/* Banner Principal / Encabezado de Sección */}
      <div className="section-banner">
        <div className="section-tag">Portal de Trámites y Workflow Documental</div>
        <h1 style={{ marginBottom: '0.5rem' }}>Gaceta Municipal de Sucre — Sistema Wayka</h1>
        <p style={{ color: 'var(--color-text-secondary)', maxWidth: '850px', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.25rem' }}>
          Plataforma oficial para la recepción, atención, derivación y seguimiento transparente de trámites 
          y correspondencia institucional del Gobierno Autónomo Municipal de Sucre.
        </p>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/status" className="btn btn-sucre">
            <Activity size={16} />
            <span>Diagnóstico de Base de Datos y Entorno</span>
          </Link>

          {!isAuthenticated ? (
            <Link to="/login" className="btn btn-primary">
              <Lock size={16} />
              <span>Ingresar al Sistema</span>
            </Link>
          ) : (
            <Link to="/status" className="btn btn-secondary">
              <ShieldCheck size={16} color="#800000" />
              <span>Sesión Activa: {activeRole?.rol_nombre}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Monitor de Estado en Formato de Tabla Institucional */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} color="#800000" />
            <span>Estado de Servicios e Infraestructura (Sprint 1)</span>
          </h2>
          <Link to="/status" className="btn btn-secondary btn-sm">
            <span>Ver Diagnóstico Completo</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="table-container">
          <table className="table-sucre">
            <thead>
              <tr>
                <th>Componente</th>
                <th>Tecnología / Motor</th>
                <th>Configuración / Puerto</th>
                <th>Estado Actual</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Frontend Cliente</strong></td>
                <td>React 19 + Vite 6 (Vanilla CSS)</td>
                <td>http://localhost:5173</td>
                <td>
                  <span className="badge badge-vigente">
                    <span className="status-dot online"></span> VIGENTE / OPERATIVO
                  </span>
                </td>
              </tr>
              <tr>
                <td><strong>Backend API REST</strong></td>
                <td>Node.js Express</td>
                <td>http://localhost:4000/api</td>
                <td>
                  {loadingHealth ? (
                    <span className="badge badge-azul">Consultando...</span>
                  ) : health?.success ? (
                    <span className="badge badge-vigente">
                      <span className="status-dot online"></span> VIGENTE / CONECTADO
                    </span>
                  ) : (
                    <span className="badge badge-alerta">
                      <span className="status-dot offline"></span> NO DISPONIBLE
                    </span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>Base de Datos Relacional</strong></td>
                <td>MySQL Server 8.0+ (utf8mb4)</td>
                <td>127.0.0.1:3306 (wayka_db)</td>
                <td>
                  {loadingHealth ? (
                    <span className="badge badge-azul">Verificando...</span>
                  ) : health?.data?.database?.connected ? (
                    <span className="badge badge-vigente">
                      <span className="status-dot online"></span> VIGENTE / CONECTADA
                    </span>
                  ) : (
                    <span className="badge badge-modificada">
                      <span className="status-dot warning"></span> EN ESPERA DE SERVICIO
                    </span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas de Normas y Módulos Institucionales (UI Components 3.2) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.25rem' }}>Módulos Funcionales del Sistema</h2>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.25rem' }}>
          Estructura del flujo de correspondencia y atención según roles institucionales.
        </p>

        <div className="grid-3">
          {/* Tarjeta 1: Ventanilla Única */}
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-sucre">MÓDULO DE INGRESO</span>
              <span className="badge badge-vigente">ESTADO: VIGENTE</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Ventanilla Única de Trámites
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '60px' }}>
              Recepción centralizada, emisión de Hoja de Ruta institucional con correlativo automático y registro de adjuntos PDF.
            </p>
            <div className="norm-card-footer">
              <Link to="/status" className="btn btn-primary btn-sm">
                <span>Ver Más</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Tarjeta 2: Escritorio Virtual */}
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-azul">ATENCIÓN FUNCIONARIO</span>
              <span className="badge badge-vigente">ESTADO: VIGENTE</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Escritorio Virtual de Trabajo
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '60px' }}>
              Bandejas de pendientes, recibidos y despachados. Atención de trámites, proveídos y derivación libre a destinatarios.
            </p>
            <div className="norm-card-footer">
              <Link to="/status" className="btn btn-primary btn-sm">
                <span>Ver Más</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Tarjeta 3: Administración y Organigrama */}
          <div className="norm-card">
            <div className="norm-card-header">
              <span className="badge badge-sucre">ADMINISTRACIÓN</span>
              <span className="badge badge-vigente">ESTADO: VIGENTE</span>
            </div>
            <h3 style={{ fontSize: '1.1rem', color: '#1B365D', marginBottom: '0.5rem' }}>
              Organigrama y Usuarios
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#6C757D', lineHeight: '1.5', minHeight: '60px' }}>
              Gestión de personas, usuarios, roles, organigrama jerárquico de Sucre y parámetros globales del sistema.
            </p>
            <div className="norm-card-footer">
              <Link to="/status" className="btn btn-primary btn-sm">
                <span>Ver Más</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Plan de Trabajo - Cronograma Sprint 1 */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 style={{ fontSize: '1.15rem', color: '#800000' }}>
              Cronograma Institucional — Sprint 1: Fundación del Sistema
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
              Periodo: 01 de Septiembre al 14 de Septiembre de 2026
            </span>
          </div>
          <span className="badge badge-modificada">EN EJECUCIÓN</span>
        </div>

        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-status-vigente-bg)', border: '1px solid var(--color-status-vigente-border)', borderRadius: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={18} color="#1E7E34" />
              <strong style={{ color: '#1E7E34', fontSize: '0.9rem' }}>
                Tarea 1: Configuración del Entorno (React + Node.js) y BD MySQL 8.0
              </strong>
            </div>
            <span className="badge badge-vigente">COMPLETADA</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-table-zebra)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
              Tarea 2: Modelo de datos y migraciones (Flujo unificado de trámites y correspondencias)
            </span>
            <span className="badge badge-azul">SIGUIENTE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-table-zebra)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
              Tarea 3: Autenticación JWT (login con PIN, logout, cambio de clave, expiración de roles)
            </span>
            <span className="badge badge-secondary" style={{ background: '#E2E8F0', color: '#6C757D' }}>PENDIENTE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-table-zebra)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
              Tarea 4: CRUD Personas, Usuarios, Roles y Asignación Usuario-Rol
            </span>
            <span className="badge badge-secondary" style={{ background: '#E2E8F0', color: '#6C757D' }}>PENDIENTE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--color-table-zebra)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <span style={{ color: 'var(--color-text-main)', fontSize: '0.9rem' }}>
              Tarea 5: CRUD Ubicaciones Orgánicas (Estructura Jerárquica / Organigrama)
            </span>
            <span className="badge badge-secondary" style={{ background: '#E2E8F0', color: '#6C757D' }}>PENDIENTE</span>
          </div>
        </div>
      </div>
    </div>
  );
}
