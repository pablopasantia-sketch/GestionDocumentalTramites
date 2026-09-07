import React, { useState, useRef, useEffect } from 'react';
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
  Layers,
  ChevronDown,
  KeyRound,
  Check,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ChangePasswordModal from '../auth/ChangePasswordModal';

export default function Navbar() {
  const { user, activeRole, isAuthenticated, logout, switchRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [switchingRole, setSwitchingRole] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setDropdownOpen(false);
    logout();
    navigate('/login');
  };

  const handleRoleSwitch = async (r) => {
    if (r.rol_id === activeRole?.rol_id && r.ubicacion_org_id === activeRole?.ubicacion_org_id) {
      setDropdownOpen(false);
      return;
    }

    setSwitchingRole(true);
    await switchRole(r.rol_id, r.ubicacion_org_id);
    setSwitchingRole(false);
    setDropdownOpen(false);
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
              SPRINT 1: FUNDACIÓN & JWT
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
                {(activeRole?.rol_codigo === 'VENTANILLA_UNICA' || activeRole?.rol_codigo === 'ADMIN_SISTEMA' || activeRole?.rol_codigo === 'ADMIN_WAYKA') && (
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

                {(activeRole?.rol_codigo === 'ADMIN_SISTEMA' || activeRole?.rol_codigo === 'ADMIN_WAYKA') && (
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

          <div className="nav-user-area" ref={dropdownRef} style={{ position: 'relative' }}>
            {isAuthenticated ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                {/* Gatillador del Menú de Usuario */}
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    background: dropdownOpen ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    color: 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  title="Opciones de perfil y sesión"
                >
                  <div className="user-tag" style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>
                      {user?.nombres} {user?.apellidos?.split(' ')[0]}
                    </div>
                    <div className="user-tag-role" style={{ fontSize: '0.72rem', color: '#E2E8F0' }}>
                      {activeRole?.rol_nombre || 'Funcionario'}
                    </div>
                  </div>
                  <ChevronDown size={14} style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Botón Salir Directo (RF-01.4) */}
                <button 
                  onClick={handleLogout} 
                  className="btn btn-sucre btn-sm"
                  title="Cerrar sesión"
                  style={{ padding: '6px 12px' }}
                >
                  <LogOut size={14} />
                  <span>Salir</span>
                </button>

                {/* Menú Desplegable Institucional */}
                {dropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '320px',
                    background: '#FFFFFF',
                    borderRadius: '6px',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                    border: '1px solid #E2E8F0',
                    zIndex: 1000,
                    overflow: 'hidden',
                    animation: 'fadeIn 0.15s ease'
                  }}>
                    {/* Tarjeta de Identificación */}
                    <div style={{ padding: '1rem', background: '#F8F9FA', borderBottom: '1px solid #E2E8F0' }}>
                      <div style={{ fontWeight: '700', color: '#1B365D', fontSize: '0.95rem' }}>
                        {user?.nombres} {user?.apellidos}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#6C757D', marginTop: '2px' }}>
                        Usuario: <strong>{user?.username}</strong> | CI: {user?.ci || 'N/D'}
                      </div>
                      {user?.cargo && (
                        <div style={{ fontSize: '0.78rem', color: '#1B365D', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Briefcase size={12} />
                          <span>{user.cargo}</span>
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: '#800000', marginTop: '6px', fontWeight: '600' }}>
                        📍 {activeRole?.ubicacion_nombre || 'Oficina Central'}
                      </div>
                    </div>

                    {/* Selector Multi-Rol (Si tiene múltiples roles asignados) */}
                    {user?.roles && user.roles.length > 1 && (
                      <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #E2E8F0', background: 'rgba(27, 54, 93, 0.03)' }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6C757D', textTransform: 'uppercase', marginBottom: '6px' }}>
                          Cambiar Rol Activo (Multi-Rol):
                        </div>
                        <div style={{ display: 'grid', gap: '4px' }}>
                          {user.roles.map((r) => {
                            const isCurrent = r.rol_id === activeRole?.rol_id && r.ubicacion_org_id === activeRole?.ubicacion_org_id;
                            return (
                              <button
                                key={`${r.rol_id}-${r.ubicacion_org_id}`}
                                onClick={() => handleRoleSwitch(r)}
                                disabled={switchingRole}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '6px 10px',
                                  borderRadius: '4px',
                                  border: isCurrent ? '1px solid #1B365D' : '1px solid #E2E8F0',
                                  background: isCurrent ? 'var(--color-primary-sucre-light)' : '#FFFFFF',
                                  cursor: isCurrent ? 'default' : 'pointer',
                                  textAlign: 'left',
                                  fontSize: '0.8rem'
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: isCurrent ? '700' : '500', color: isCurrent ? '#800000' : '#212529' }}>
                                    {r.rol_nombre}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#6C757D' }}>
                                    {r.ubicacion_nombre}
                                  </div>
                                </div>
                                {isCurrent && <Check size={14} color="#800000" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Acciones de Cuenta */}
                    <div style={{ padding: '0.5rem' }}>
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          setPasswordModalOpen(true);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '10px 12px',
                          border: 'none',
                          background: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#212529',
                          fontSize: '0.85rem',
                          textAlign: 'left'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F8F9FA'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <KeyRound size={16} color="#1B365D" />
                        <span>Cambiar Contraseña / PIN</span>
                      </button>

                      <button
                        onClick={handleLogout}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem',
                          padding: '10px 12px',
                          border: 'none',
                          background: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: '#DC3545',
                          fontSize: '0.85rem',
                          textAlign: 'left',
                          marginTop: '2px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--color-status-alerta-bg)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                      >
                        <LogOut size={16} color="#DC3545" />
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                )}
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

      {/* Modal de Cambio de Clave */}
      <ChangePasswordModal 
        isOpen={passwordModalOpen} 
        onClose={() => setPasswordModalOpen(false)} 
      />
    </header>
  );
}
