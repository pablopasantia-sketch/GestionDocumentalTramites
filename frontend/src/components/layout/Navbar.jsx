import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Activity, 
  Shield, 
  Inbox, 
  LogIn, 
  LogOut, 
  User, 
  Building2,
  Landmark,
  Layers
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
    <header>
      {/* Franja Superior Institucional — Rojo Sucre (#800000) */}
      <div className="header-institutional-bar">
        <div className="header-institutional-content">
          <Link to="/" className="header-brand">
            <div className="header-crest">
              <Landmark size={26} />
            </div>
            <div className="header-titles">
              <span className="header-main-title">WAYKA — GESTIÓN DOCUMENTAL</span>
              <span className="header-sub-title">GACETA MUNICIPAL DE SUCRE | WORKFLOW INSTITUCIONAL</span>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="badge badge-vigente" style={{ fontSize: '11px', background: '#FFFFFF', color: '#800000', border: '1px solid #FFFFFF' }}>
              SPRINT 1: ENTORNO & BD
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Navegación Secundaria — Azul Institucional (#1B365D) */}
      <nav className="navbar-sucre">
        <div className="navbar-content">
          <ul className="nav-links">
            <li>
              <Link 
                to="/" 
                className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              >
                <FileText size={16} />
                <span>Inicio</span>
              </Link>
            </li>

            <li>
              <Link 
                to="/status" 
                className={`nav-link ${location.pathname === '/status' ? 'active' : ''}`}
              >
                <Activity size={16} />
                <span>Diagnóstico & Base de Datos</span>
              </Link>
            </li>

            {isAuthenticated && (
              <>
                {(activeRole?.rol_codigo === 'VENTANILLA_UNICA' || activeRole?.rol_codigo === 'ADMIN_SISTEMA') && (
                  <li>
                    <Link 
                      to="/ventanilla" 
                      className={`nav-link ${location.pathname === '/ventanilla' ? 'active' : ''}`}
                    >
                      <Inbox size={16} />
                      <span>Ventanilla Única</span>
                    </Link>
                  </li>
                )}

                {(activeRole?.rol_codigo === 'FUNCIONARIO' || activeRole?.rol_codigo === 'VENTANILLA_UNICA') && (
                  <li>
                    <Link 
                      to="/escritorio" 
                      className={`nav-link ${location.pathname === '/escritorio' ? 'active' : ''}`}
                    >
                      <Layers size={16} />
                      <span>Escritorio Virtual</span>
                    </Link>
                  </li>
                )}

                {activeRole?.rol_codigo === 'ADMIN_SISTEMA' && (
                  <li>
                    <Link 
                      to="/admin" 
                      className={`nav-link ${location.pathname === '/admin' ? 'active' : ''}`}
                    >
                      <Shield size={16} />
                      <span>Administración</span>
                    </Link>
                  </li>
                )}
              </>
            )}
          </ul>

          <div className="nav-user-area">
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div className="user-tag">
                  <div style={{ fontWeight: '600' }}>
                    {user?.nombres} {user?.apellidos?.split(' ')[0]}
                  </div>
                  <div className="user-tag-role">
                    {activeRole?.rol_nombre || 'Funcionario'}
                  </div>
                </div>
                
                <button 
                  onClick={handleLogout} 
                  className="btn btn-sucre btn-sm"
                  title="Cerrar sesión"
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>
              </div>
            ) : (
              <Link to="/login" className="btn btn-sucre btn-sm">
                <LogIn size={14} />
                <span>Iniciar Sesión</span>
              </Link>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
