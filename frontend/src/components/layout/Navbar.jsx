import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Activity, 
  Layers, 
  Shield, 
  Inbox, 
  LogIn, 
  LogOut, 
  User, 
  CheckCircle2, 
  Building2 
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, activeRole, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div className="navbar-content">
        {/* Brand / Logo */}
        <Link to="/" className="nav-brand">
          <div className="nav-logo-icon">
            <Layers size={22} />
          </div>
          <span>WAYKA</span>
          <span className="nav-badge">MVP Sprint 1</span>
        </Link>

        {/* Navigation Links */}
        <nav className="nav-links">
          <Link 
            to="/" 
            className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
          >
            <FileText size={17} />
            <span>Inicio</span>
          </Link>

          <Link 
            to="/status" 
            className={`nav-link ${location.pathname === '/status' ? 'active' : ''}`}
          >
            <Activity size={17} />
            <span>Diagnóstico & BD</span>
          </Link>

          {isAuthenticated && (
            <>
              {(activeRole?.rol_codigo === 'VENTANILLA_UNICA' || activeRole?.rol_codigo === 'ADMIN_SISTEMA') && (
                <Link 
                  to="/ventanilla" 
                  className={`nav-link ${location.pathname === '/ventanilla' ? 'active' : ''}`}
                >
                  <Inbox size={17} />
                  <span>Ventanilla Única</span>
                </Link>
              )}

              {(activeRole?.rol_codigo === 'FUNCIONARIO' || activeRole?.rol_codigo === 'VENTANILLA_UNICA') && (
                <Link 
                  to="/escritorio" 
                  className={`nav-link ${location.pathname === '/escritorio' ? 'active' : ''}`}
                >
                  <FileText size={17} />
                  <span>Escritorio Virtual</span>
                </Link>
              )}

              {activeRole?.rol_codigo === 'ADMIN_SISTEMA' && (
                <Link 
                  to="/admin" 
                  className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                >
                  <Shield size={17} />
                  <span>Administración</span>
                </Link>
              )}
            </>
          )}
        </nav>

        {/* User Info / Auth Actions */}
        <div className="nav-user-menu">
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {user?.nombres} {user?.apellidos?.split(' ')[0]}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.3rem', justifyContent: 'flex-end' }}>
                  <Building2 size={12} />
                  <span>{activeRole?.rol_nombre || 'Usuario'}</span>
                </div>
              </div>
              
              <button 
                onClick={handleLogout} 
                className="btn btn-secondary btn-sm"
                title="Cerrar sesión"
              >
                <LogOut size={16} />
                <span>Salir</span>
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn btn-primary btn-sm">
              <LogIn size={16} />
              <span>Ingresar</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
