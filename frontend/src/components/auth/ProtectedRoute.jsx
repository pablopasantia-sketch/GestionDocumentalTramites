import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = null }) {
  const { isAuthenticated, activeRole, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <div style={{ color: 'var(--color-primary-sucre)', fontWeight: '600', fontSize: '0.95rem' }}>
          Verificando sesión institucional...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const hasRole = allowedRoles.includes(activeRole?.rol_codigo);
    if (!hasRole) {
      return (
        <div style={{ maxWidth: '600px', margin: '3rem auto', textAlign: 'center' }}>
          <div className="card" style={{ padding: '2.5rem 2rem', borderTop: '5px solid #DC3545' }}>
            <div style={{
              width: '52px',
              height: '52px',
              borderRadius: '4px',
              background: 'var(--color-status-alerta-bg)',
              color: 'var(--color-status-alerta-text)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <ShieldAlert size={28} />
            </div>
            <h2 style={{ fontSize: '1.4rem', color: '#B71C1C', marginBottom: '0.5rem' }}>
              Acceso Restringido por Rol
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Su rol activo actual (<strong>{activeRole?.rol_nombre || 'Funcionario'}</strong>) no posee permisos suficientes para acceder a este módulo institucional.
            </p>
            <div>
              <Link to="/" className="btn btn-secondary btn-sm">
                <ArrowLeft size={14} />
                <span>Volver al Inicio</span>
              </Link>
            </div>
          </div>
        </div>
      );
    }
  }

  return children;
}
