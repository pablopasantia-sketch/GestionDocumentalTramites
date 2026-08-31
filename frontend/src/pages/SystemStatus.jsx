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
  Clock, 
  Cpu 
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
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Activity size={28} color="#38bdf8" />
            <span>Diagnóstico del Entorno & Base de Datos</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Verificación de conectividad integral entre React, Node.js y MySQL 8.0 (Sprint 1)
          </p>
        </div>

        <button 
          onClick={fetchHealth} 
          disabled={loading}
          className="btn btn-primary"
        >
          <RefreshCw size={17} className={loading ? 'spin' : ''} />
          <span>{loading ? 'Consultando...' : 'Actualizar Diagnóstico'}</span>
        </button>
      </div>

      {/* Tarjeta de Estado General */}
      <div className="card" style={{ marginBottom: '2rem', borderColor: healthData?.database?.connected ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ 
              width: '50px', 
              height: '50px', 
              borderRadius: 'var(--radius-sm)', 
              background: healthData?.database?.connected ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: healthData?.database?.connected ? '#10b981' : '#f59e0b'
            }}>
              {healthData?.database?.connected ? <CheckCircle2 size={30} /> : <AlertTriangle size={30} />}
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                {healthData?.database?.connected 
                  ? 'Entorno Operativo al 100%' 
                  : error 
                    ? 'Backend Inaccesible' 
                    : 'Backend Activo — Esperando Servicio MySQL'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {lastCheck ? `Último sondeo: ${lastCheck.toLocaleTimeString()}` : 'Iniciando diagnóstico...'}
              </div>
            </div>
          </div>

          <div>
            {healthData?.database?.connected ? (
              <span className="badge badge-success" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <span className="status-dot online"></span> Todos los servicios sincronizados
              </span>
            ) : (
              <span className="badge badge-warning" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
                <span className="status-dot warning"></span> Requiere atención
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3 Columnas de Diagnóstico Detallado */}
      <div className="grid-3" style={{ marginBottom: '2.5rem' }}>
        
        {/* 1. Frontend */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Globe size={20} color="#06b6d4" />
              <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>1. Frontend React</span>
            </div>
            <span className="badge badge-success">OK</span>
          </div>

          <div style={{ display: 'grid', gap: '0.65rem', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Framework:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>React 19 + Vite 6</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Estilos:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Vanilla CSS Design System</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>API Target:</span>{' '}
              <span style={{ color: '#38bdf8', wordBreak: 'break-all' }}>
                {import.meta.env.VITE_API_URL || 'http://localhost:4000/api'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Estado:</span>{' '}
              <span style={{ color: '#34d399' }}>Renderizando cliente SPA</span>
            </div>
          </div>
        </div>

        {/* 2. Backend */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Server size={20} color="#3b82f6" />
              <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>2. Backend REST</span>
            </div>
            {healthData ? (
              <span className="badge badge-success">OK</span>
            ) : (
              <span className="badge badge-danger">FAIL</span>
            )}
          </div>

          <div style={{ display: 'grid', gap: '0.65rem', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Motor:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>Node.js Express</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Versión Node:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{healthData?.system?.nodeVersion || 'Desconectado'}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Uptime:</span>{' '}
              <span style={{ color: '#60a5fa' }}>
                {healthData ? `${healthData.uptimeSeconds} segundos` : 'N/A'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Memoria RAM:</span>{' '}
              <span style={{ color: 'var(--text-primary)' }}>
                {healthData ? `${healthData.system?.memoryUsageMb} MB en uso` : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* 3. MySQL Database */}
        <div className="card">
          <div className="card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={20} color="#f59e0b" />
              <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>3. MySQL 8.0</span>
            </div>
            {healthData?.database?.connected ? (
              <span className="badge badge-success">CONECTADA</span>
            ) : (
              <span className="badge badge-warning">DESCONECTADA</span>
            )}
          </div>

          <div style={{ display: 'grid', gap: '0.65rem', fontSize: '0.88rem' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Servidor:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {healthData?.database?.host || '127.0.0.1'}:{healthData?.database?.port || '3306'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Base de Datos:</span>{' '}
              <strong style={{ color: 'var(--text-primary)' }}>
                {healthData?.database?.name || 'wayka_db'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Versión MySQL:</span>{' '}
              <span style={{ color: '#fcd34d' }}>
                {healthData?.database?.version || 'Sin conexión directa'}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Detalle:</span>{' '}
              <span style={{ fontSize: '0.8rem', color: healthData?.database?.connected ? '#6ee7b7' : '#fca5a5' }}>
                {healthData?.database?.message || error || 'Conectando...'}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Guía de Inicialización y Comandos */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Terminal size={22} color="#38bdf8" />
            <h3 style={{ fontSize: '1.15rem', fontWeight: '700' }}>Comandos de Ejecución y Base de Datos</h3>
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Para inicializar el esquema de tablas y sembrar los datos iniciales de los roles y usuario administrador en tu servidor MySQL 8.0:
        </p>

        <div className="diagnostics-box" style={{ marginBottom: '1.25rem' }}>
          <div style={{ color: '#64748b', marginBottom: '0.5rem' }}># 1. En la carpeta backend: Crear base de datos y tablas de schema.sql</div>
          <div style={{ color: '#38bdf8', marginBottom: '0.85rem' }}>npm run db:init</div>
          
          <div style={{ color: '#64748b', marginBottom: '0.5rem' }}># 2. Sembrar roles, organigrama y usuario administrador inicial (admin / admin123)</div>
          <div style={{ color: '#38bdf8', marginBottom: '0.85rem' }}>npm run db:seed</div>

          <div style={{ color: '#64748b', marginBottom: '0.5rem' }}># 3. Iniciar el servidor backend en modo desarrollo</div>
          <div style={{ color: '#38bdf8' }}>npm run dev</div>
        </div>

        <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(59, 130, 246, 0.25)', fontSize: '0.85rem' }}>
          <div style={{ fontWeight: '600', color: '#93c5fd', marginBottom: '0.25rem' }}>
            💡 Configuración de credenciales de MySQL:
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            Puedes ajustar el usuario, contraseña y puerto de tu MySQL 8.0 en el archivo <code style={{ color: '#67e8f9' }}>backend/.env</code>.
          </div>
        </div>
      </div>
    </div>
  );
}
