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
            <h1 style={{ color: '#1B365D', marginBottom: '0.25rem' }}>Estado del Entorno y Base de Datos SQL Server</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.95rem' }}>
              Verificación de comunicación entre Frontend (React 19), Backend (.NET 8 LTS Web API) y Base de Datos (Microsoft SQL Server 2022 en Docker)
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
                  ? 'Entorno Institucional Completamente Sincronizado y Operativo' 
                  : error 
                    ? 'Servicio Backend Desconectado' 
                    : 'Backend Activo — Esperando Conexión con SQL Server'}
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
                <td>{import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}</td>
                <td><span className="badge badge-azul">CONFIGURADO</span></td>
              </tr>
              <tr>
                <td><strong>2. Backend API</strong></td>
                <td>Framework & Entorno</td>
                <td>{healthData?.framework || '.NET 8.0 LTS Web API'} ({healthData?.environment || 'Development'})</td>
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
                <td>Motor & Servidor</td>
                <td>{healthData?.database?.engine || 'Microsoft SQL Server 2022 (Docker)'} — {healthData?.database?.server || '127.0.0.1:1433'}</td>
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
                <td>Base de Datos & Proveedor</td>
                <td>{healthData?.database?.databaseName || 'DB_TRAMITES_EXTERNOS'} ({healthData?.database?.provider || 'EF Core 8 SqlServer'})</td>
                <td>
                  {healthData?.database?.connected ? (
                    <span className="badge badge-vigente">OPERATIVO (15 Tablas)</span>
                  ) : (
                    <span className="badge badge-azul">EN ESPERA</span>
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
              Comandos de Infraestructura: Docker SQL Server y Backend .NET 8
            </h3>
          </div>
        </div>

        <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
          Para levantar el contenedor Docker de SQL Server y ejecutar el backend institucional:
        </p>

        <div className="diagnostics-box" style={{ marginBottom: '1.25rem' }}>
          <div style={{ color: '#A0AEC0', marginBottom: '4px' }}># 1. Iniciar contenedor de Microsoft SQL Server 2022:</div>
          <div style={{ color: '#68D391', marginBottom: '10px' }}>docker compose up -d</div>

          <div style={{ color: '#A0AEC0', marginBottom: '4px' }}># 2. Verificar tablas de DB_TRAMITES_EXTERNOS en el contenedor:</div>
          <div style={{ color: '#68D391', marginBottom: '10px' }}>docker exec gestion_documental_mssql /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P 'SqlAdminSucre2026!' -C -Q "USE DB_TRAMITES_EXTERNOS; SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES;"</div>

          <div style={{ color: '#A0AEC0', marginBottom: '4px' }}># 3. Iniciar el backend .NET 8:</div>
          <div style={{ color: '#68D391' }}>cd backend-dotnet/GestionDocumental.Api && dotnet run --launch-profile http</div>
        </div>

        <div style={{ background: 'var(--color-primary-sucre-light)', padding: '12px 16px', borderRadius: '4px', border: '1px solid #f5c2c2', fontSize: '0.85rem' }}>
          <strong style={{ color: '#800000' }}>Nota Institucional:</strong>
          <span style={{ color: 'var(--color-text-main)', marginLeft: '6px' }}>
            El sistema utiliza <strong>DB_TRAMITES_EXTERNOS</strong> en Microsoft SQL Server con los catálogos <code>TUnidad</code>, <code>TCargo</code> y el padrón de <code>TEmpleados</code>.
          </span>
        </div>
      </div>
    </div>
  );
}
