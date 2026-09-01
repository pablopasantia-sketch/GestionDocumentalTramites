import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  RefreshCw, 
  Server, 
  Database, 
  Globe, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Terminal, 
  ShieldCheck, 
  Landmark 
} from 'lucide-react';
import { healthService } from '../services/api';

export default function SystemStatus() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastCheck, setLastCheck] = useState(null);
  const [error, setError] = useState(null);

  const fetchHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await healthService.getHealth();
      setHealthData(result.data);
      setLastCheck(new Date());
    } catch (err) {
      console.error('Error al obtener estado de salud:', err);
      setError(err.response?.data?.message || err.message || 'No se pudo contactar al backend en http://localhost:4000');
      setHealthData(null);
      setLastCheck(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
  }, []);

  return (
    <div>
      {/* Banner de Diagnóstico */}
      <div className="section-banner banner-azul">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div className="section-tag" style={{ color: '#1B365D' }}>Módulo de Diagnóstico Institucional</div>
            <h1 style={{ color: '#1B365D', marginBottom: '0.25rem' }}>Estado del Entorno y Base de Datos MySQL 8.0</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              Verificación de comunicación entre Frontend (React 19), Backend (Node.js/Express) y Base de Datos (MySQL 8.0)
            </p>
          </div>

          <button 
            onClick={fetchHealth} 
            disabled={loading}
            className="btn btn-primary"
          >
            <RefreshCw size={16} />
            <span>{loading ? 'Consultando...' : 'Actualizar Diagnóstico'}</span>
          </button>
        </div>
      </div>

      {/* Resumen de Estado */}
      <div className="card" style={{ borderLeft: healthData?.database?.connected ? '6px solid #28A745' : '6px solid #FFC107' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '44px', 
              height: '44px', 
              borderRadius: 'var(--radius-sm)', 
              background: healthData?.database?.connected ? 'var(--color-status-vigente-bg)' : 'var(--color-status-modificada-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: healthData?.database?.connected ? '#1E7E34' : '#8D6500'
            }}>
              {healthData?.database?.connected ? <CheckCircle2 size={26} /> : <AlertTriangle size={26} />}
            </div>
            <div>
              <div style={{ fontSize: '1.15rem', fontWeight: '700', color: 'var(--color-text-main)' }}>
                {healthData?.database?.connected 
                  ? 'Entorno Completamente Sincronizado y Operativo' 
                  : error 
                    ? 'Servicio Backend Desconectado' 
                    : 'Backend Activo — Esperando Conexión con MySQL Server'}
              </div>
              <div style={{ fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                {lastCheck ? `Última comprobación: ${lastCheck.toLocaleTimeString()}` : 'Iniciando diagnóstico...'}
              </div>
            </div>
          </div>

          <div>
            {healthData?.database?.connected ? (
              <span className="badge badge-vigente">
                <span className="status-dot online"></span> VIGENTE
              </span>
            ) : (
              <span className="badge badge-modificada">
                <span className="status-dot warning"></span> REQUIERE ATENCIÓN
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Tabla Detallada de Parámetros de Infraestructura (UI Component 3.4) */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#1B365D' }}>
          Detalle Técnico de los Componentes
        </h2>

        <div className="table-container">
          <table className="table-sucre">
            <thead>
              <tr>
                <th>Capa del Sistema</th>
                <th>Propiedad / Parámetro</th>
                <th>Valor Detectado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>1. Frontend Client</strong></td>
                <td>Framework & Estilos</td>
                <td>React 19 + Vite 6 / CSS Gaceta Sucre</td>
                <td><span className="badge badge-vigente">VIGENTE</span></td>
              </tr>
              <tr>
                <td><strong>1. Frontend Client</strong></td>
                <td>Punto de Conexión API</td>
                <td>{import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}</td>
                <td><span className="badge badge-azul">CONFIGURADO</span></td>
              </tr>
              <tr>
                <td><strong>2. Backend API</strong></td>
                <td>Entorno & Versión Node</td>
                <td>{healthData?.environment || 'development'} ({healthData?.system?.nodeVersion || 'Desconectado'})</td>
                <td>
                  {healthData ? (
                    <span className="badge badge-vigente">ACTIVO</span>
                  ) : (
                    <span className="badge badge-alerta">ERROR</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>2. Backend API</strong></td>
                <td>Tiempo de Actividad (Uptime)</td>
                <td>{healthData ? `${healthData.uptimeSeconds} segundos` : 'N/A'}</td>
                <td>
                  {healthData ? <span className="badge badge-azul">EN LÍNEA</span> : <span className="badge badge-alerta">OFFLINE</span>}
                </td>
              </tr>
              <tr>
                <td><strong>3. Base de Datos</strong></td>
                <td>Servidor MySQL 8.0</td>
                <td>{healthData?.database?.host || '127.0.0.1'}:{healthData?.database?.port || '3306'} (wayka_db)</td>
                <td>
                  {healthData?.database?.connected ? (
                    <span className="badge badge-vigente">CONECTADO</span>
                  ) : (
                    <span className="badge badge-modificada">DESCONECTADO</span>
                  )}
                </td>
              </tr>
              <tr>
                <td><strong>3. Base de Datos</strong></td>
                <td>Versión del Motor</td>
                <td>{healthData?.database?.version || 'MySQL 8.0+ (driver mysql2 configurado)'}</td>
                <td>
                  {healthData?.database?.connected ? (
                    <span className="badge badge-vigente">UTF8MB4</span>
                  ) : (
                    <span className="badge badge-azul">POOL 10</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Guía de Inicialización y Comandos de la Base de Datos */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Terminal size={20} color="#800000" />
            <h3 style={{ fontSize: '1.15rem', color: '#800000' }}>
              Comandos de Migración y Semillas (Seed) en MySQL 8.0
            </h3>
          </div>
        </div>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Para inicializar las 11 tablas del esquema DDL y poblar los roles, organigrama y usuarios de prueba:
        </p>

        <div className="diagnostics-box" style={{ marginBottom: '1.25rem' }}>
          <div style={{ color: '#A0AEC0', marginBottom: '4px' }}># 1. Ejecutar DDL y crear tablas en MySQL 8.0:</div>
          <div style={{ color: '#68D391', marginBottom: '10px' }}>cd backend && npm run db:init</div>

          <div style={{ color: '#A0AEC0', marginBottom: '4px' }}># 2. Sembrar datos base (Roles, Organigrama, Superadmin):</div>
          <div style={{ color: '#68D391', marginBottom: '10px' }}>cd backend && npm run db:seed</div>

          <div style={{ color: '#A0AEC0', marginBottom: '4px' }}># 3. Iniciar el servidor backend:</div>
          <div style={{ color: '#68D391' }}>npm run dev</div>
        </div>

        <div style={{ background: 'var(--color-primary-sucre-light)', padding: '12px 16px', borderRadius: '4px', border: '1px solid #f5c2c2', fontSize: '0.85rem' }}>
          <strong style={{ color: '#800000' }}>Nota de Configuración:</strong>
          <span style={{ color: 'var(--color-text-main)', marginLeft: '6px' }}>
            Las credenciales de acceso a MySQL se configuran en el archivo <code>backend/.env</code> (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME).
          </span>
        </div>
      </div>
    </div>
  );
}
